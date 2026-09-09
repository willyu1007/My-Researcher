import { closeSync, existsSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TopicSelectionCodexCliRunInput, TopicSelectionCodexCliRunOutcome } from '../topic-selection-codex-cli-runner-service.js';
import { canonicalHash } from '../topic-selection-v1b-harness-authority-hash.js';

export type QualificationLimits = { attempts: number | null; tokens: number | null; duration_ms: number | null; attempt_ms: number };
type Attempt = { id: string; request_hash: string; started_at: number; finished_at: number | null;
  status: 'pending' | 'succeeded' | 'failed'; tokens: number | null; charged_tokens: number | null };
type Ledger = { limits: QualificationLimits; started_at: number | null; attempts: Attempt[];
  policy_changes?: Array<{ at: number; previous_limits: QualificationLimits; limits: QualificationLimits }> };

/** One serial qualification run. Persist before metered work; refuse uncertain restarts. */
export class CodexQualificationBudget {
  private readonly file: string;
  private readonly ledger: Ledger;
  private lock: number | null;
  constructor(private readonly directory: string, limits: QualificationLimits, private readonly now = Date.now) {
    if (Object.values(limits).some(value => value !== null && (!Number.isSafeInteger(value) || value <= 0))
      || limits.attempt_ms === null) throw new Error('Qualification limits must be positive integers or explicit aggregate nulls.');
    this.file = join(directory, 'budget.json');
    this.lock = openSync(join(directory, 'qualification.lock'), 'wx', 0o600);
    try {
      writeFileSync(this.lock, String(process.pid));
      this.ledger = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) as Ledger
        : { limits, started_at: null, attempts: [] };
      if (this.ledger.attempts.some(attempt => attempt.status === 'pending')) throw new Error('Qualification has an interrupted attempt; reconcile its usage before continuing.');
      if (canonicalHash(this.ledger.limits) !== canonicalHash(limits)) {
        if (limits.attempts !== null || limits.tokens !== null || limits.duration_ms !== null
          || limits.attempt_ms < this.ledger.limits.attempt_ms) throw new Error('Qualification limits differ from the existing run.');
        // An explicit uncapped request records the policy change; historical usage and reservations stay intact.
        (this.ledger.policy_changes ??= []).push({ at: this.now(), previous_limits: this.ledger.limits, limits });
        this.ledger.limits = limits;
        this.write('budget.json', this.ledger);
      }
    } catch (error) {
      this.close();
      throw error;
    }
  }

  close(): void {
    if (this.lock === null) return;
    closeSync(this.lock);
    this.lock = null;
    unlinkSync(join(this.directory, 'qualification.lock'));
  }

  get remainingTokens(): number {
    if (this.ledger.limits.tokens === null) return Infinity;
    return Math.max(0, this.ledger.limits.tokens - this.ledger.attempts.reduce((sum, attempt) => sum + (attempt.charged_tokens ?? 0), 0));
  }

  get remainingMs(): number {
    if (this.ledger.limits.duration_ms === null) return Infinity;
    return this.ledger.started_at === null ? this.ledger.limits.duration_ms
      : Math.max(0, this.ledger.limits.duration_ms - (this.now() - this.ledger.started_at));
  }

  get remainingAttemptMs(): number {
    const attempt = this.ledger.attempts.at(-1);
    return attempt?.status === 'pending'
      ? Math.max(0, Math.min(this.remainingMs, this.ledger.limits.attempt_ms - (this.now() - attempt.started_at)))
      : 0;
  }

  begin(input: TopicSelectionCodexCliRunInput): void {
    if (this.lock === null) throw new Error('Qualification budget is closed.');
    if (this.ledger.attempts.some(attempt => attempt.status === 'pending')) throw new Error('Qualification attempts must run serially.');
    if (this.ledger.attempts.some(attempt => attempt.id === input.invocation_attempt_id)) throw new Error('Qualification attempt already recorded; do not rerun it.');
    if ((this.ledger.limits.attempts !== null && this.ledger.attempts.length >= this.ledger.limits.attempts)
      || this.remainingTokens === 0 || this.remainingMs === 0) {
      throw new Error('Qualification budget exhausted.');
    }
    this.ledger.started_at ??= this.now();
    this.ledger.attempts.push({ id: input.invocation_attempt_id, request_hash: canonicalHash(input),
      started_at: this.now(), finished_at: null, status: 'pending', tokens: null, charged_tokens: 0 });
    this.write('budget.json', this.ledger);
    this.write(`attempt-${this.ledger.attempts.length}-input.json`, input);
  }

  finish(outcome: TopicSelectionCodexCliRunOutcome): void {
    if (this.lock === null) throw new Error('Qualification budget is closed.');
    const attempt = this.ledger.attempts.at(-1);
    if (!attempt || attempt.status !== 'pending') throw new Error('No pending qualification attempt.');
    // Cached and reasoning counts are subsets of input/output, not additional tokens.
    const tokens = outcome.usage ? outcome.usage.input_tokens + outcome.usage.output_tokens : null;
    if (tokens !== null && (!Number.isSafeInteger(tokens) || tokens < 0)) throw new Error('Invalid qualification usage.');
    attempt.charged_tokens = tokens ?? (this.ledger.limits.tokens === null ? null : this.remainingTokens);
    attempt.tokens = tokens;
    attempt.finished_at = this.now();
    attempt.status = outcome.status;
    this.write(`attempt-${this.ledger.attempts.length}-outcome.json`, outcome);
    this.write('budget.json', this.ledger);
  }

  snapshot() { return structuredClone(this.ledger); }

  write(name: string, value: unknown): void {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(name)) throw new Error('Invalid qualification artifact name.');
    const target = join(this.directory, name);
    const temporary = `${target}.pending`;
    writeFileSync(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
    renameSync(temporary, target);
  }
}
