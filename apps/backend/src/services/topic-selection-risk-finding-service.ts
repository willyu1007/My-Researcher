import {
  TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
  type TopicSelectionArtifactRefRecord,
  type TopicSelectionFunctionalRef,
  type TopicSelectionRiskFindingKind,
  type TopicSelectionRiskFindingPayload,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import { AppError } from '../errors/app-error.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

const MATERIALITY_POLICY_VERSION = 'topic-selection.material-risk.v1';
const CAPPED_DIMENSION_SCORE = 70;

type N8RiskGate = {
  gate_key: string;
  verdict: string;
  rationale: string;
  refs: TopicSelectionFunctionalRef[];
};

type N8DimensionScore = {
  dimension_key: string;
  score: number;
  rationale: string;
  evidence_refs: TopicSelectionFunctionalRef[];
};

export type RecordN8RiskFindingsInput = {
  workspace_id?: string | null;
  title_card_id: string;
  source_snapshot_ref: TopicSelectionFunctionalRef;
  source_snapshot_hash: string;
  source_ref: TopicSelectionFunctionalRef;
  evidence_refs: TopicSelectionFunctionalRef[];
  risk_notes: string[];
  reviewer_objections: string[];
  reviewer_risks: string[];
  top_objections: string[];
  critic_triggers: string[];
  requires_critic_review: boolean;
  hard_gates: N8RiskGate[];
  dimension_scores: N8DimensionScore[];
  risk_penalty_summary?: string | null;
  created_by?: 'llm' | 'system';
};

export type RecordArenaRiskFindingsInput = {
  workspace_id?: string | null;
  title_card_id: string;
  source_snapshot_ref: TopicSelectionFunctionalRef;
  source_snapshot_hash: string;
  source_ref: TopicSelectionFunctionalRef;
  findings: Array<{
    source_finding_id: string;
    participant_role: string;
    severity: 'material' | 'critical';
    statement: string;
    evidence_refs: TopicSelectionFunctionalRef[];
  }>;
  created_by?: 'llm' | 'system';
};

export type TopicSelectionRiskFindingRecord = {
  ref: TopicSelectionFunctionalRef;
  artifact_ref: TopicSelectionArtifactRefRecord;
  payload: TopicSelectionRiskFindingPayload;
};

type FindingDraft = {
  finding_kind: TopicSelectionRiskFindingKind;
  severity: TopicSelectionRiskFindingPayload['severity'];
  summary: string;
  evidence_refs: TopicSelectionFunctionalRef[];
  source_field: string;
};

type RiskFindingSource = Pick<
  RecordN8RiskFindingsInput,
  'workspace_id' | 'title_card_id' | 'source_snapshot_ref' | 'source_snapshot_hash' | 'source_ref' | 'created_by'
>;

/**
 * Persists neutral machine findings under ArtifactRef. It deliberately has no
 * AcceptedRisk dependency: risk acceptance remains a strict-human authority.
 */
export class TopicSelectionRiskFindingService {
  constructor(private readonly controlPlane: TopicSelectionControlPlaneService) {}

  async recordN8Findings(input: RecordN8RiskFindingsInput): Promise<TopicSelectionRiskFindingRecord[]> {
    this.assertSource(input);
    const drafts = this.materialN8Drafts(input);
    return Promise.all(drafts.map((draft) => this.recordFinding(input, draft)));
  }

  async recordArenaFindings(
    input: RecordArenaRiskFindingsInput,
  ): Promise<TopicSelectionRiskFindingRecord[]> {
    this.assertFindingSource(input);
    const recorded = await Promise.all(input.findings
      .filter((finding) => finding.statement.trim())
      .map((finding) => this.recordFinding(input, {
        finding_kind: 'arena_minority_finding',
        severity: finding.severity === 'critical' ? 'blocking' : 'warning',
        summary: finding.statement.trim(),
        evidence_refs: finding.evidence_refs,
        source_fields: [
          `arena_role_output.${finding.participant_role}.${finding.source_finding_id}`,
        ],
      })));
    return [...new Map(recorded.map((finding) => [finding.ref.ref_id, finding])).values()];
  }

  async resolveCurrentFindings(input: {
    refs: TopicSelectionFunctionalRef[];
    source_snapshot_ref: TopicSelectionFunctionalRef;
    source_snapshot_hash: string;
  }): Promise<TopicSelectionRiskFindingRecord[]> {
    const resolved = await Promise.all(input.refs.map(async (ref) => {
      if (ref.ref_type !== 'artifact_ref' || ref.version_id !== TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION) {
        throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'Risk finding ref does not identify TopicSelectionRiskFinding@v1.');
      }
      const artifact = await this.controlPlane.getArtifactRef(ref.ref_id);
      const payload = this.parsePayload(artifact?.payload);
      if (!artifact || !payload) {
        throw new AppError(409, 'VERSION_CONFLICT', `Risk finding ${ref.ref_id} is missing or malformed.`);
      }
      if (!this.refsEqual(payload.source_snapshot_ref, input.source_snapshot_ref)
        || payload.source_snapshot_hash !== input.source_snapshot_hash) {
        throw new AppError(409, 'VERSION_CONFLICT', `Risk finding ${ref.ref_id} has a stale source snapshot.`);
      }
      return { ref, artifact_ref: artifact, payload };
    }));
    return resolved;
  }

  private async recordFinding(
    input: RiskFindingSource,
    draft: Omit<FindingDraft, 'source_field'> & { source_fields: string[] },
  ): Promise<TopicSelectionRiskFindingRecord> {
    const identity = {
      evidence_refs: this.sortedRefs(draft.evidence_refs),
      finding_kind: draft.finding_kind,
      severity: draft.severity,
      source_ref: input.source_ref,
      source_fields: [...draft.source_fields].sort(),
      source_snapshot_hash: input.source_snapshot_hash,
      source_snapshot_ref: input.source_snapshot_ref,
      summary: this.normalizeSummary(draft.summary),
      title_card_id: input.title_card_id,
    };
    const identityHash = sha256Text(stableStringify(identity));
    const payload: TopicSelectionRiskFindingPayload = {
      schema_version: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
      finding_id: `topic_selection_risk_finding_${identityHash}`,
      finding_kind: draft.finding_kind,
      materiality: 'advancement_relevant',
      severity: draft.severity,
      title_card_id: input.title_card_id,
      source_snapshot_ref: input.source_snapshot_ref,
      source_snapshot_hash: input.source_snapshot_hash,
      source_ref: input.source_ref,
      summary: draft.summary,
      evidence_refs: this.sortedRefs(draft.evidence_refs),
      source_fields: [...draft.source_fields].sort(),
      materiality_policy_version: MATERIALITY_POLICY_VERSION,
    };
    const artifact = await this.controlPlane.recordArtifactRef({
      stable_key: `topic-selection-risk-finding:${identityHash}`,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      artifact_kind: 'structured_output',
      payload: { ...payload },
      created_by: input.created_by ?? 'system',
    });
    return {
      ref: {
        ref_type: 'artifact_ref',
        ref_id: artifact.artifact_ref_id,
        version_id: TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION,
        title_card_id: input.title_card_id,
      },
      artifact_ref: artifact,
      payload,
    };
  }

  private materialN8Drafts(
    input: RecordN8RiskFindingsInput,
  ): Array<Omit<FindingDraft, 'source_field'> & { source_fields: string[] }> {
    const drafts: FindingDraft[] = [];
    const valueRiskSources: Array<[string, string[]]> = [
      ['risk_notes', input.risk_notes],
      ['reviewer_objections', input.reviewer_objections],
      ['reasoning_memo.reviewer_risks', input.reviewer_risks],
      ['reasoning_memo.top_objections', input.top_objections],
      ['risk_penalty.penalty_summary', input.risk_penalty_summary ? [input.risk_penalty_summary] : []],
    ];
    for (const [sourceField, summaries] of valueRiskSources) {
      for (const summary of summaries) {
        if (!summary.trim()) continue;
        drafts.push({
          finding_kind: 'value_risk',
          severity: 'warning',
          summary: summary.trim(),
          evidence_refs: input.evidence_refs,
          source_field: sourceField,
        });
      }
    }
    for (const trigger of input.critic_triggers) {
      if (!trigger.trim()) continue;
      drafts.push({
        finding_kind: 'critic_trigger',
        severity: 'warning',
        summary: trigger.trim(),
        evidence_refs: input.evidence_refs,
        source_field: 'reasoning_memo.critic_triggers',
      });
    }
    if (input.requires_critic_review && input.critic_triggers.length === 0) {
      drafts.push({
        finding_kind: 'critic_trigger',
        severity: 'warning',
        summary: 'Independent critic review is required before advancement.',
        evidence_refs: input.evidence_refs,
        source_field: 'reasoning_memo.requires_critic_review',
      });
    }
    for (const gate of input.hard_gates.filter((candidate) => candidate.verdict === 'pass_with_risk')) {
      drafts.push({
        finding_kind: 'pass_with_risk_gate',
        severity: 'warning',
        summary: `${gate.gate_key}: ${gate.rationale}`,
        evidence_refs: gate.refs,
        source_field: `hard_gates.${gate.gate_key}`,
      });
    }
    for (const dimension of input.dimension_scores.filter((candidate) => candidate.score < CAPPED_DIMENSION_SCORE)) {
      drafts.push({
        finding_kind: 'capped_dimension',
        severity: 'warning',
        summary: `${dimension.dimension_key} is capped at ${dimension.score}/100: ${dimension.rationale}`,
        evidence_refs: dimension.evidence_refs,
        source_field: `dimension_scores.${dimension.dimension_key}`,
      });
    }
    const grouped = new Map<string, Omit<FindingDraft, 'source_field'> & { source_fields: string[] }>();
    for (const draft of drafts.sort((left, right) =>
      left.finding_kind.localeCompare(right.finding_kind)
      || this.normalizeSummary(left.summary).localeCompare(this.normalizeSummary(right.summary))
      || left.source_field.localeCompare(right.source_field)
    )) {
      const key = `${draft.finding_kind}:${this.normalizeSummary(draft.summary)}`;
      const current = grouped.get(key);
      if (current) {
        current.evidence_refs = this.uniqueRefs([...current.evidence_refs, ...draft.evidence_refs]);
        current.source_fields = [...new Set([...current.source_fields, draft.source_field])];
      } else {
        grouped.set(key, {
          finding_kind: draft.finding_kind,
          severity: draft.severity,
          summary: draft.summary,
          evidence_refs: this.uniqueRefs(draft.evidence_refs),
          source_fields: [draft.source_field],
        });
      }
    }
    return [...grouped.values()];
  }

  private parsePayload(value: Record<string, unknown> | null | undefined): TopicSelectionRiskFindingPayload | null {
    if (!value
      || value.schema_version !== TOPIC_SELECTION_RISK_FINDING_CONTRACT_VERSION
      || typeof value.finding_id !== 'string'
      || typeof value.summary !== 'string'
      || typeof value.source_snapshot_hash !== 'string') {
      return null;
    }
    return value as unknown as TopicSelectionRiskFindingPayload;
  }

  private assertSource(input: RecordN8RiskFindingsInput): void {
    this.assertFindingSource(input);
  }

  private assertFindingSource(input: {
    title_card_id: string;
    source_snapshot_hash: string;
    source_snapshot_ref: TopicSelectionFunctionalRef;
    source_ref: TopicSelectionFunctionalRef;
  }): void {
    if (!input.title_card_id || !input.source_snapshot_hash || !input.source_snapshot_ref.ref_id) {
      throw new AppError(422, 'INVALID_PAYLOAD', 'Risk finding source snapshot identity is required.');
    }
    if (input.source_snapshot_ref.title_card_id !== input.title_card_id
      || input.source_ref.title_card_id !== input.title_card_id) {
      throw new AppError(422, 'INVALID_PAYLOAD', 'Risk finding source refs must belong to the requested TitleCard.');
    }
  }

  private normalizeSummary(value: string): string {
    return value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
  }

  private sortedRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return this.uniqueRefs(refs).sort((left, right) => this.refKey(left).localeCompare(this.refKey(right)));
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    return [...new Map(refs.map((ref) => [this.refKey(ref), ref])).values()];
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }
}
