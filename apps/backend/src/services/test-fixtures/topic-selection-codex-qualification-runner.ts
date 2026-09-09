import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TopicSelectionCodexAppServerClient } from '../topic-selection-codex-app-server-client.js';
import { TopicSelectionCodexCliRunnerService, type TopicSelectionCodexCliRunnerConfig } from '../topic-selection-codex-cli-runner-service.js';
import { CodexQualificationBudget, type QualificationLimits } from './topic-selection-codex-qualification-budget.js';

export class QualificationPreviewComplete extends Error {}

export function qualificationRunner(config: TopicSelectionCodexCliRunnerConfig, outputRoot: string, limits: QualificationLimits | null) {
  if (config.transport !== 'app_server') throw new Error('Qualification requires App Server usage reporting and interruption.');
  const directory = limits ? outputRoot : join(outputRoot, 'preview');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const budget = limits ? new CodexQualificationBudget(directory, limits) : null;
  let activeClient: TopicSelectionCodexAppServerClient | null = null;
  const runner = new TopicSelectionCodexCliRunnerService(config, undefined, async options => {
    const client = await TopicSelectionCodexAppServerClient.spawn(options);
    activeClient = client;
    if (budget && budget.remainingAttemptMs <= 0) await client.close();
    return {
      initialized: client.initialized, request: client.request.bind(client), hasExited: client.hasExited.bind(client),
      stderrTail: client.stderrTail.bind(client), close: client.close.bind(client),
      runTurn: async (params, turnOptions) => {
        if (!budget || !limits) throw new Error('Live qualification requires explicit limits.');
        if (budget.remainingAttemptMs <= 0 || budget.remainingTokens <= 0) throw new Error('Qualification budget exhausted before turn start.');
        let turnId: string | null = null;
        let interrupted = false;
        const stop = client.onNotification(notification => {
          if (notification.method === 'turn/started' && notification.params.threadId === params.threadId) turnId = notification.params.turn.id;
          if (notification.method === 'thread/tokenUsage/updated' && notification.params.threadId === params.threadId
            && notification.params.tokenUsage.total.totalTokens >= budget.remainingTokens && turnId && !interrupted) {
            interrupted = true;
            void client.request('turn/interrupt', { threadId: params.threadId, turnId }).catch(() => undefined);
          }
        });
        try {
          // Usage is reported by the server; interruption is best-effort at the first observed ceiling.
          return await client.runTurn(params, { timeout_ms: Math.min(turnOptions.timeout_ms, budget.remainingAttemptMs) });
        } finally { stop(); }
      },
    };
  });
  const run = runner.run.bind(runner);
  runner.run = async input => {
    if (!budget) {
      writeFileSync(join(directory, 'preview-input.json'), JSON.stringify(input, null, 2), { mode: 0o600 });
      throw new QualificationPreviewComplete('Compiled request saved without launching Codex.');
    }
    budget.begin(input);
    // Include version/server/thread setup in the attempt deadline; never launch another attempt while shutdown settles.
    const deadline = setTimeout(() => { void activeClient?.close(); }, budget.remainingAttemptMs);
    try {
      const outcome = await run(input);
      budget.finish(outcome);
      console.log(JSON.stringify({ qualification_attempt: budget.snapshot().attempts.length, status: outcome.status,
        usage: outcome.usage, remaining_tokens: budget.remainingTokens, remaining_ms: budget.remainingMs }));
      return outcome;
    } finally { clearTimeout(deadline); }
  };
  return { runner, budget, directory };
}
