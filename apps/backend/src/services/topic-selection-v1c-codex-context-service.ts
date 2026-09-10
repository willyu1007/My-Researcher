import { Ajv } from 'ajv';
import { topicSelectionRiskFindingPayloadSchema, type TopicSelectionRiskFindingPayload, type TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionPromotionGateHandoff } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-gate-contracts';
import type { TopicSelectionPromotionInputSnapshotHandoff } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1c-promotion-input-contracts';
import type { TopicSelectionRecheckRiskMemoryRepository } from '../repositories/topic-selection-recheck-risk-memory.repository.js';
import type { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';
import type { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';
import { AppError } from '../errors/app-error.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { stableStringify } from './literature-content-processing-utils.js';
import { uniqueRefs } from './topic-selection-v1b-harness-dedup-utils.js';
import { refsEqual } from './topic-selection-v1b-harness-gate-utils.js';
import { promotionSupportRiskFindingRefs } from './topic-selection-v1c-promotion-support-policy.js';

const validFinding = new Ajv({ allErrors: true }).compile<TopicSelectionRiskFindingPayload>(topicSelectionRiskFindingPayloadSchema);

/** Omit only duplicate audit bodies; the projection is idempotent and binds their exact hashes. */
export function projectV1cDecisionResearchContext(context: Record<string, unknown>): Record<string, unknown> {
  const dossier = context.promotion_dossier;
  if (!dossier || typeof dossier !== 'object' || Array.isArray(dossier)) return context;
  const record = dossier as Record<string, unknown>;
  if (!record.dossier_payload || typeof record.dossier_payload !== 'object' || Array.isArray(record.dossier_payload)) return context;
  const payload = { ...record.dossier_payload } as Record<string, unknown>;
  for (const [field, auditField] of [['debate_execution', 'role_artifacts'], ['support_policy', 'admission_identity']] as const) {
    const value = payload[field];
    if (value && typeof value === 'object' && !Array.isArray(value) && auditField in value) {
      const { [auditField]: audit, ...details } = value as Record<string, unknown>;
      payload[field] = { ...details, [`${auditField}_hash`]: canonicalHash(audit) };
    }
  }
  return { ...context, promotion_dossier: { ...record, dossier_payload: payload } };
}

/** Resolve the frozen promotion evidence; model support never updates package or risk authority. */
export class TopicSelectionV1cCodexContextService {
  constructor(private readonly options: {
    controlPlane: TopicSelectionControlPlaneService;
    acceptedRisks: Pick<TopicSelectionRecheckRiskMemoryRepository, 'findAcceptedRiskById'>;
    researchEvidence: Pick<TopicSelectionResearchEvidencePacketService, 'resolve'>;
  }) {}

  async gate(gate: TopicSelectionPromotionGateHandoff, input: TopicSelectionPromotionInputSnapshotHandoff): Promise<Record<string, unknown>> {
    if (gate.promotion_input_snapshot_id !== input.promotion_input_snapshot_id
      || gate.promotion_input_snapshot_hash !== input.snapshot_hashes.promotion_input_snapshot_hash
      || !refsEqual(gate.promotion_input_snapshot_ref, input.promotion_input_snapshot_ref)
      || gate.gate_check.title_card_id !== input.snapshot.title_card_id
      || gate.gate_check.workspace_id !== input.snapshot.workspace_id) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CLI decision context differs from its frozen promotion input.');
    }
    return projectV1cDecisionResearchContext({ ...await this.promotion(input), gate_check: gate.gate_check,
      promotion_support: gate.support, promotion_dossier: gate.dossier, argument_readiness: gate.argument_readiness_mini_check });
  }

  async promotion(handoff: TopicSelectionPromotionInputSnapshotHandoff): Promise<Record<string, unknown>> {
    const snapshot = handoff.snapshot;
    const fail = (message: string): never => { throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `CLI promotion context: ${message}`); };
    if (handoff.closure_status !== 'ready_for_gate' || snapshot.closure_status !== 'ready_for_gate'
      || snapshot.promotion_input_snapshot_id !== handoff.promotion_input_snapshot_id
      || !refsEqual(snapshot.promotion_input_snapshot_ref, handoff.promotion_input_snapshot_ref)
      || handoff.promotion_input_snapshot_ref.title_card_id !== snapshot.title_card_id
      || snapshot.promotion_input_snapshot_hash !== handoff.snapshot_hashes.promotion_input_snapshot_hash
      || snapshot.package_snapshot_hash !== handoff.snapshot_hashes.package_snapshot_hash
      || snapshot.package_draft_input_snapshot_hash !== handoff.snapshot_hashes.package_draft_input_snapshot_hash
      || canonicalHash(snapshot.package_snapshot) !== snapshot.package_snapshot_hash
      || canonicalHash(snapshot.package_draft_input_snapshot) !== snapshot.package_draft_input_snapshot_hash
      || canonicalHash(snapshot.source_bundle_snapshot.package_snapshot) !== snapshot.package_snapshot_hash
      || canonicalHash(snapshot.source_bundle_snapshot.package_draft_input_snapshot) !== snapshot.package_draft_input_snapshot_hash) {
      return fail('frozen package or draft bodies differ from their admitted snapshot.');
    }
    for (const key of ['topic_package_ref', 'topic_question_ref', 'topic_question_contract_ref', 'answerability_plan_ref',
      'research_slice_ref', 'topic_value_assessment_ref', 'value_reasoning_memo_ref', 'value_disposition_decision_ref',
      'package_trace_boundary_check_ref', 'package_readiness_assessment_ref', 'validated_need_refs', 'evidence_refs',
      'accepted_risk_refs', 'blocker_refs', 'memory_suggestion_refs', 'recheck_request_refs', 'readiness_check_refs'] as const) {
      if (canonicalHash(handoff[key]) !== canonicalHash(snapshot[key])) return fail(`handoff ${key} differs from its frozen snapshot.`);
    }
    const expectedHash = canonicalHash({ bundle_hash: snapshot.bundle_hash, closure_status: snapshot.closure_status,
      package_draft_input_snapshot_hash: snapshot.package_draft_input_snapshot_hash, package_snapshot_hash: snapshot.package_snapshot_hash,
      readiness_check_refs: snapshot.readiness_check_refs, risk_finding_refs: promotionSupportRiskFindingRefs(handoff),
      source_bundle_ref: snapshot.source_bundle_ref, topic_package_ref: snapshot.topic_package_ref });
    const contract = snapshot.package_draft_input_snapshot.question_contract;
    if (expectedHash !== snapshot.promotion_input_snapshot_hash || !contract.main_question?.trim()
      || !contract.max_claim_strength || !snapshot.package_draft_input_snapshot.answerability_plan
      || snapshot.package_snapshot.title_card_id !== snapshot.title_card_id
      || snapshot.package_snapshot.topic_package_id !== snapshot.topic_package_id) {
      return fail('frozen package identity, scientific bodies or promotion snapshot hash is invalid.');
    }
    const evidenceRefs = uniqueRefs([...handoff.evidence_refs.map(row => row.evidence_ref), ...snapshot.package_snapshot.selected_evidence_refs]);
    if (evidenceRefs.length === 0 || evidenceRefs.some(ref => ref.ref_type !== 'evidence_unit' || ref.title_card_id !== snapshot.title_card_id)) {
      return fail('original evidence requires exact title-scoped EvidenceUnit refs.');
    }
    const evidencePackets = [];
    for (let offset = 0; offset < evidenceRefs.length; offset += 12) {
      evidencePackets.push(await this.options.researchEvidence.resolve({
        schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1', title_card_id: snapshot.title_card_id,
        participant_role: 'synthesis_arbiter',
        query_intent: { intent_type: 'support', query: 'Review the frozen promotion package and its remaining obligations.',
          target_claim: stableStringify(snapshot.package_draft_input_snapshot.question_contract.max_claim_strength),
          rationale: 'Read original support and counterevidence without changing the Human-approved package.' },
        evidence_unit_refs: evidenceRefs.slice(offset, offset + 12),
      }));
    }
    const acceptedRisks = await Promise.all(handoff.accepted_risk_refs.map(async ref => {
      const record = ref.ref_type === 'accepted_risk' ? await this.options.acceptedRisks.findAcceptedRiskById(ref.ref_id) : null;
      if (!record || (ref.title_card_id != null && ref.title_card_id !== snapshot.title_card_id)
        || (record.title_card_id != null && record.title_card_id !== snapshot.title_card_id)
        || (record.workspace_id != null && record.workspace_id !== snapshot.workspace_id)) return fail('accepted risk is absent or outside the frozen scope.');
      return { ref, record }; // Preserve status, target and expiry; reading a risk does not accept it.
    }));
    const findings = await Promise.all(promotionSupportRiskFindingRefs(handoff).map(async ref => {
      const artifact = await this.options.controlPlane.getArtifactRef(ref.ref_id);
      if (!artifact?.payload || !validFinding(artifact.payload) || artifact.checksum !== canonicalHash(artifact.payload)
        || artifact.title_card_id !== snapshot.title_card_id || artifact.payload.title_card_id !== snapshot.title_card_id
        || ref.title_card_id !== snapshot.title_card_id) return fail('material finding is absent, malformed or outside the frozen scope.');
      return { ref, finding: artifact.payload };
    }));
    // The snapshot already embeds the full scientific bodies; source_bundle_snapshot repeats them.
    // Legacy obligation refs have no canonical body read contract. Retain their unresolved status.
    const unresolvedObligations: TopicSelectionFunctionalRef[] = uniqueRefs([
      ...handoff.memory_suggestion_refs, ...handoff.recheck_request_refs, ...handoff.blocker_refs,
    ]);
    return { frozen_domain: { package: snapshot.package_snapshot, package_draft_input: snapshot.package_draft_input_snapshot,
      closure: { check_details: snapshot.check_details, required_actions: snapshot.required_actions, warnings: snapshot.warnings } },
    evidence_packets: evidencePackets, accepted_risks: acceptedRisks, material_findings: findings,
    unresolved_obligation_refs: unresolvedObligations };
  }
}
