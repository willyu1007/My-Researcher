import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type { TopicSelectionEvidenceMapExtractionContextPacket, TopicSelectionEvidenceMapExtractionDraft, TopicSelectionEvidenceSourceLocator } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import type { LiteratureRepository } from '../repositories/literature-repository.js';
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionSearchResourceService } from './topic-selection-search-resource-service.js';
import type { TopicSelectionEvidenceMapService } from './topic-selection-evidence-map-service.js';
import type { TopicSelectionResearchEvidencePacketService } from './topic-selection-research-evidence-packet-service.js';
import type { TopicSelectionWorkflowHarnessBuildEvidenceMapInput, TopicSelectionWorkflowHarnessGenerateNeedCandidateInput } from './topic-selection-workflow-harness-service.js';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { sha256Text } from './literature-content-processing-utils.js';
import { TopicSelectionEvidenceMapMaterializationService } from './topic-selection-evidence-map-materialization-service.js';
import { TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID } from './topic-selection-model-profile-registry-service.js';

type ExtractionSource = { literature_ref: TopicSelectionFunctionalRef; source_ref: TopicSelectionFunctionalRef;
  locator: TopicSelectionEvidenceSourceLocator; text: string; text_hash: string };

const refIdentity = (ref: TopicSelectionFunctionalRef) => canonicalHash({ ref_type: ref.ref_type, ref_id: ref.ref_id,
  title_card_id: ref.title_card_id ?? null, version_id: ref.version_id ?? null, legacy_ref: ref.legacy_ref ?? null });
const sameRefs = (a: TopicSelectionFunctionalRef[], b: TopicSelectionFunctionalRef[]) =>
  canonicalHash(a.map(refIdentity).sort()) === canonicalHash(b.map(refIdentity).sort());

/** Compile model-readable upstream evidence from repository owners, never from a caller's extraction draft. */
export class TopicSelectionV1aCodexContextService {
  constructor(private readonly options: {
    literature: LiteratureRepository;
    searchResources: TopicSelectionSearchResourceService;
    evidenceMaps: TopicSelectionEvidenceMapService;
    researchEvidence: TopicSelectionResearchEvidencePacketService;
  }) {}

  async extraction(input: TopicSelectionWorkflowHarnessBuildEvidenceMapInput): Promise<{
    context: TopicSelectionEvidenceMapExtractionContextPacket; sources: ExtractionSource[];
  }> {
    const handoff = input.search_run_handoff!;
    const run = await this.options.searchResources.getSearchRunById(handoff.search_run_ref.ref_id);
    const snapshot = await this.options.searchResources.getLiteratureResourcePoolSnapshotById(handoff.literature_resource_pool_snapshot_ref.ref_id);
    if (!run || !snapshot || run.title_card_id !== input.title_card_id || snapshot.title_card_id !== input.title_card_id
      || !['succeeded', 'partial'].includes(run.run_status)
      || !sameRefs([run.search_plan_ref, run.literature_snapshot_ref], [handoff.search_plan_ref, handoff.literature_resource_pool_snapshot_ref])
      || !sameRefs(run.evidence_map_input_refs, handoff.evidence_map_input_refs)
      || snapshot.snapshot_hash !== handoff.literature_snapshot_hash
      || canonicalHash(run.source_health_summary) !== canonicalHash(handoff.source_health_summary)
      || canonicalHash(run.result_accounting) !== canonicalHash(handoff.result_accounting)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'CLI extraction handoff differs from the persisted search run and snapshot.');
    }
    const matrix = await this.options.searchResources.getCoverageMatrix(run.search_plan_ref.ref_id);
    for (const expectation of handoff.coverage_role_expectations) {
      const row = matrix.rows.find(row => row.coverage_row_intent.coverage_row_intent_id === expectation.coverage_row_intent_ref.ref_id);
      if (!row || row.coverage_row_intent.expected_evidence_role !== expectation.expected_evidence_role) {
        throw new AppError(409, 'VERSION_CONFLICT', 'CLI extraction coverage roles differ from the persisted search plan.');
      }
    }
    const sources: ExtractionSource[] = [];
    for (const literatureRef of run.evidence_map_input_refs.filter(ref => ref.ref_type === 'literature_record')) {
      const abstract = await this.options.literature.findAbstractProfileByLiteratureId(literatureRef.ref_id);
      const sourceRows = await this.options.literature.listSourcesByLiteratureId(literatureRef.ref_id);
      const abstractSource = abstract?.sourceRef.ref_type === 'literature_source'
        ? sourceRows.find(source => source.id === abstract.sourceRef.source_id
          && (abstract.sourceRef.source_url == null || abstract.sourceRef.source_url === source.sourceUrl)) : null;
      const sourceRef = run.evidence_map_input_refs.find(ref => ref.ref_type === 'literature_source'
        && abstractSource && (abstractSource.id === ref.ref_id || abstractSource.sourceUrl === ref.ref_id));
      if (!abstract?.abstractText?.trim() || abstract.generated || !sourceRef
        || abstract.checksum !== sha256Text(abstract.abstractText)) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CLI extraction requires a stored original abstract and a source bound to this search run.');
      }
      const text = abstract.abstractText.trim();
      sources.push({ literature_ref: literatureRef, source_ref: sourceRef,
        locator: { locator_type: 'abstract', literature_ref: literatureRef, source_ref: sourceRef,
          locator_ref: { ref_type: 'literature_abstract', ref_id: abstract.id, title_card_id: input.title_card_id, version_id: null } },
        text, text_hash: sha256Text(text) });
    }
    if (!sources.length) throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CLI extraction has no readable source candidates.');
    const refs = [handoff.search_run_ref, handoff.search_plan_ref, handoff.literature_resource_pool_snapshot_ref, ...run.evidence_map_input_refs];
    return { sources, context: {
      schema_version: 'TopicSelectionEvidenceMapExtractionContextPacket@v1', node_id: 'topic-selection.v1a.build-evidence-map.v1',
      workflow_run_id: input.workflow_run_id, node_attempt_id: input.node_attempt_id, context_family: 'evidence_extraction_context',
      input_refs: refs, input_refs_hash: new TopicSelectionEvidenceMapMaterializationService().inputRefsHashForSearchRunHandoff(handoff),
      search_run_handoff_hash: canonicalHash(handoff), context_compiler_version: 'repository-abstracts-v1',
      policy_version: input.policy_version, output_schema_version: input.output_schema_version, execution_mode: 'codex_cli',
      profile_id: TOPIC_SELECTION_EVIDENCE_MAP_EXTRACTION_SINGLE_AGENT_PROFILE_ID,
      cache_key: canonicalHash({ handoff, sources }), cache_hit: false, redaction_policy: 'repository-source-text-only',
      payload: { sources, source_boundary: 'original_abstracts_only' }, created_at: new Date().toISOString(),
    } };
  }

  validateExtraction(draft: TopicSelectionEvidenceMapExtractionDraft, sources: ExtractionSource[]): void {
    if (draft.producer_kind !== 'codex_cli') throw new AppError(409, 'VERSION_CONFLICT', 'CLI extraction producer provenance is invalid.');
    for (const unit of draft.draft_units) {
      const source = sources.find(source => refIdentity(source.literature_ref) === refIdentity(unit.literature_ref));
      const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();
      if (!source || !sameRefs(unit.source_refs, [source.source_ref])
        || refIdentity(unit.locator.locator_ref) !== refIdentity(source.locator.locator_ref)
        || unit.locator.locator_type !== 'abstract'
        || refIdentity(unit.locator.source_ref) !== refIdentity(source.source_ref)
        || refIdentity(unit.locator.literature_ref) !== refIdentity(source.literature_ref)
        || [unit.locator.content_ref, unit.locator.document_ref, unit.locator.section_ref, unit.locator.paragraph_ref,
          unit.locator.anchor_ref, unit.locator.manual_label, unit.locator.quote_hash, unit.locator.start_offset,
          unit.locator.end_offset, unit.locator.page_number].some(value => value != null)
        || !normalize(unit.source_statement) || !normalize(source.text).includes(normalize(unit.source_statement))) {
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CLI extraction quote or locator does not match the compiled original source.');
      }
    }
  }

  async discovery(input: TopicSelectionWorkflowHarnessGenerateNeedCandidateInput): Promise<TopicSelectionWorkflowHarnessGenerateNeedCandidateInput> {
    const bundle = await this.options.evidenceMaps.getNeedValidationEvidenceBundle(input.evidence_map_ref.ref_id);
    if (refIdentity(bundle.evidence_map_ref) !== refIdentity(input.evidence_map_ref)
      || !bundle.strength_assessment_refs.some(ref => refIdentity(ref) === refIdentity(input.evidence_strength_ref))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'CLI need discovery requires the current evidence map and its strength assessment.');
    }
    if (!sameRefs(input.search_snapshot_refs, [bundle.search_run_ref])
      || !sameRefs(input.resource_snapshot_refs, [bundle.literature_snapshot_ref])) {
      throw new AppError(409, 'VERSION_CONFLICT', 'CLI need discovery search and resource refs must match the evidence map lineage.');
    }
    const [assessments, conflicts] = await Promise.all([
      this.options.evidenceMaps.listEvidenceStrengthAssessmentsByEvidenceMapId(input.evidence_map_ref.ref_id),
      this.options.evidenceMaps.listConflictSetsByEvidenceMapId(input.evidence_map_ref.ref_id),
    ]);
    const currentAssessments = assessments.filter(record => bundle.strength_assessment_refs.some(ref => ref.ref_id === record.evidence_strength_assessment_id));
    const units = [...bundle.support_units, ...bundle.challenge_units, ...bundle.baseline_units, ...bundle.context_units];
    const evidenceRefs = units.map(unit => ({ ref_type: 'evidence_unit', ref_id: unit.evidence_unit_id,
      title_card_id: unit.title_card_id, version_id: unit.evidence_map_version }));
    if (!evidenceRefs.length) throw new AppError(409, 'GATE_CONSTRAINT_FAILED', 'CLI need discovery requires readable evidence units.');
    const packets = [];
    for (let offset = 0; offset < evidenceRefs.length; offset += 12) {
      packets.push(await this.options.researchEvidence.resolve({ schema_version: 'TopicSelectionResearchEvidencePacketRequest@v1', title_card_id: input.title_card_id, participant_role: 'synthesis_arbiter',
        evidence_unit_refs: evidenceRefs.slice(offset, offset + 12), query_intent: {
          intent_type: 'support',
          query: 'Discover bounded unmet research needs in the supplied evidence.',
          rationale: 'Read the original sources before generating or criticizing candidate needs.',
          target_claim: 'Evidence may establish a candidate research question, never a Human confirmation or an empirical result.',
        } }));
    }
    return { ...input, context_input_refs: [...(input.context_input_refs ?? [input.topic_scope_ref, input.evidence_map_ref,
      input.evidence_strength_ref, ...input.search_snapshot_refs, ...input.resource_snapshot_refs]), ...evidenceRefs],
      exploration_payload: { ...input.exploration_payload, evidence_signal_digest: { evidence_packets: packets,
        evidence_map_ref: bundle.evidence_map_ref, conflict_sets: conflicts, strength_assessments: currentAssessments } },
      arbiter_payload: { ...input.arbiter_payload, evidence_ref_table: [
        ...packets.flatMap(packet => packet.items.map(item => ({ evidence_ref: item.evidence_unit_ref, role: item.evidence_role, source: item }))),
        ...bundle.strength_assessment_refs.map(ref => ({ evidence_ref: ref, role: 'strength', assessment: currentAssessments.find(record => record.evidence_strength_assessment_id === ref.ref_id) })),
        ...bundle.conflict_set_refs.map(ref => ({ evidence_ref: ref, role: 'conflict', conflict: conflicts.find(record => record.evidence_conflict_set_id === ref.ref_id) })),
      ] },
    };
  }
}
