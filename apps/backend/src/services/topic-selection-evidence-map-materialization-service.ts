import { Ajv, type ValidateFunction } from 'ajv';
import type {
  TopicSelectionActorType,
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionEvidenceRole,
  TopicSelectionSearchRunHandoff,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-search-resource-contracts';
import {
  TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_REPORT_SCHEMA_VERSION,
  type TopicSelectionEvidenceMapExtractionDraft,
  type TopicSelectionEvidenceMapExtractionDraftConflict,
  type TopicSelectionEvidenceMapExtractionDraftUnit,
  type TopicSelectionEvidenceMapMaterializationReport,
  type TopicSelectionEvidenceMapMaterializationStatus,
  type TopicSelectionEvidenceMapMaterializationValidationLayer,
  type TopicSelectionEvidenceMapRoleCounts,
  topicSelectionEvidenceMapExtractionDraftSchema,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-evidence-map-contracts';
import {
  type TopicSelectionCreateEvidenceMapFromSearchRunInput,
} from './topic-selection-evidence-map-service.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export interface TopicSelectionEvidenceMapMaterializationInput {
  workspace_id?: string | null;
  title_card_id: string;
  workflow_run_id: string;
  node_attempt_id: string;
  search_run_handoff: TopicSelectionSearchRunHandoff;
  extraction_draft: TopicSelectionEvidenceMapExtractionDraft | null;
  policy_version: string;
  output_schema_version: string;
  created_by?: TopicSelectionActorType;
}

export interface TopicSelectionEvidenceMapMaterializationResult {
  report: TopicSelectionEvidenceMapMaterializationReport;
  mapped_input: TopicSelectionCreateEvidenceMapFromSearchRunInput | null;
  draft_hash: string | null;
  materialization_input_hash: string | null;
}

type DraftValidationState = {
  warningCodes: Set<string>;
  reviewCodes: Set<string>;
  blockerCodes: Set<string>;
  rejectionReasons: Record<string, string[]>;
  failedValidationLayer: TopicSelectionEvidenceMapMaterializationValidationLayer | null;
  repairTarget: string | null;
};

type SourceRoleUnitKeys = Record<TopicSelectionEvidenceMapExtractionDraftUnit['evidence_role'], Set<string>>;

export class TopicSelectionEvidenceMapMaterializationService {
  private readonly draftValidator: ValidateFunction;

  constructor() {
    const ajv = new Ajv({
      allErrors: true,
      strict: false,
      removeAdditional: false,
    });
    this.draftValidator = ajv.compile(topicSelectionEvidenceMapExtractionDraftSchema);
  }

  materialize(
    input: TopicSelectionEvidenceMapMaterializationInput,
  ): TopicSelectionEvidenceMapMaterializationResult {
    const state: DraftValidationState = {
      warningCodes: new Set(),
      reviewCodes: new Set(),
      blockerCodes: new Set(),
      rejectionReasons: {},
      failedValidationLayer: null,
      repairTarget: null,
    };
    const draftHash = input.extraction_draft
      ? this.hash(input.extraction_draft)
      : null;
    const expectedInputRefsHash = this.inputRefsHashForSearchRunHandoff(input.search_run_handoff);

    if (!input.extraction_draft) {
      this.block(state, 'MISSING_EVIDENCE_MAP_EXTRACTION_DRAFT', 'schema', 'submit_extraction_draft');
      return this.result(input, state, null, draftHash, expectedInputRefsHash);
    }

    if (!this.draftValidator(input.extraction_draft)) {
      this.block(state, 'MALFORMED_EVIDENCE_MAP_EXTRACTION_DRAFT', 'schema', 'repair_extraction_draft_schema');
      return this.result(input, state, null, draftHash, expectedInputRefsHash);
    }

    this.validateLineage(input, input.extraction_draft, expectedInputRefsHash, state);
    this.validateDraftMaterialization(input.search_run_handoff, input.extraction_draft, state);
    if (state.blockerCodes.size > 0) {
      return this.result(input, state, null, draftHash, expectedInputRefsHash);
    }
    if (state.reviewCodes.size > 0) {
      return this.result(input, state, null, draftHash, expectedInputRefsHash);
    }

    const mappedInput = this.toCreateEvidenceMapInput(input);
    const materializationInputHash = this.hash(mappedInput);
    return this.result(input, state, mappedInput, draftHash, expectedInputRefsHash, materializationInputHash);
  }

  inputRefsHashForSearchRunHandoff(handoff: TopicSelectionSearchRunHandoff): string {
    return this.hash({
      search_run_ref: handoff.search_run_ref,
      search_plan_ref: handoff.search_plan_ref,
      literature_resource_pool_snapshot_ref: handoff.literature_resource_pool_snapshot_ref,
      literature_snapshot_hash: handoff.literature_snapshot_hash,
      coverage_row_intent_refs: handoff.coverage_row_intent_refs,
      coverage_role_expectations: handoff.coverage_role_expectations,
      method_family_targets: handoff.method_family_targets ?? [],
      evidence_map_input_refs: handoff.evidence_map_input_refs,
      coverage_binding_refs: handoff.coverage_binding_refs,
      coverage_assessment_refs: handoff.coverage_assessment_refs,
      policy_version: handoff.policy_version,
      output_schema_version: handoff.output_schema_version,
    });
  }

  private validateLineage(
    input: TopicSelectionEvidenceMapMaterializationInput,
    draft: TopicSelectionEvidenceMapExtractionDraft,
    expectedInputRefsHash: string,
    state: DraftValidationState,
  ): void {
    const handoff = input.search_run_handoff;
    if (draft.title_card_ref.ref_type !== 'title_card'
      || draft.title_card_ref.ref_id !== input.title_card_id
      || (draft.title_card_ref.title_card_id !== null
        && draft.title_card_ref.title_card_id !== undefined
        && draft.title_card_ref.title_card_id !== input.title_card_id)
      || !this.refsMatch(draft.search_run_ref, handoff.search_run_ref)
      || !this.refsMatch(draft.search_plan_ref, handoff.search_plan_ref)
      || !this.refsMatch(draft.literature_resource_pool_snapshot_ref, handoff.literature_resource_pool_snapshot_ref)
      || draft.literature_snapshot_hash !== handoff.literature_snapshot_hash) {
      this.block(state, 'EVIDENCE_MAP_EXTRACTION_LINEAGE_MISMATCH', 'lineage', 'repair_node4_handoff_or_draft');
    }
    if (draft.input_refs_hash !== expectedInputRefsHash) {
      this.block(state, 'EVIDENCE_MAP_EXTRACTION_INPUT_REFS_HASH_MISMATCH', 'lineage', 'recompile_extraction_context');
    }
    if (draft.policy_version !== input.policy_version || draft.output_schema_version !== input.output_schema_version) {
      this.block(state, 'EVIDENCE_MAP_EXTRACTION_VERSION_MISMATCH', 'lineage', 'rerun_with_matching_policy_versions');
    }
  }

  private validateDraftMaterialization(
    handoff: TopicSelectionSearchRunHandoff,
    draft: TopicSelectionEvidenceMapExtractionDraft,
    state: DraftValidationState,
  ): void {
    if (draft.draft_units.length === 0) {
      this.block(state, 'EVIDENCE_UNIT_REQUIRED', 'materialization', 'rerun_extraction_or_complete_evidence');
      return;
    }

    const allowedEvidenceRefs = new Set(handoff.evidence_map_input_refs.map((ref) => this.refKey(ref)));
    const coverageRowRefs = new Set(handoff.coverage_row_intent_refs.map((ref) => this.refKey(ref)));
    const coverageRoleExpectations = this.coverageRoleExpectationMap(handoff);
    const unitKeys = new Set<string>();
    const unitLiteratureRefs = new Set<string>();
    const roleUnitKeysBySource = new Map<string, SourceRoleUnitKeys>();
    for (const unit of draft.draft_units) {
      this.validateUnit(
        unit,
        allowedEvidenceRefs,
        coverageRowRefs,
        coverageRoleExpectations,
        unitKeys,
        roleUnitKeysBySource,
        state,
      );
      unitLiteratureRefs.add(this.refKey(unit.literature_ref));
    }
    this.validateRequiredLiteratureCoverage(handoff, unitLiteratureRefs, state);
    this.validateStructuralUnitKeys(draft.draft_links, 'typed_link', unitKeys, state);
    this.validateStructuralUnitKeys(draft.draft_clusters, 'cluster', unitKeys, state);
    this.validateStructuralUnitKeys(draft.draft_patterns, 'pattern', unitKeys, state);
    for (const conflict of draft.draft_conflicts) {
      this.validateConflictUnitKeys(conflict, unitKeys, state);
    }
    for (const roleUnitKeys of roleUnitKeysBySource.values()) {
      if (roleUnitKeys.support.size > 0 && roleUnitKeys.challenge.size > 0) {
        const hasConflict = draft.draft_conflicts.some((conflict) =>
          conflict.conflict_type === 'claim_conflict'
          && this.intersects(conflict.support_unit_keys, roleUnitKeys.support)
          && this.intersects(conflict.challenge_unit_keys, roleUnitKeys.challenge),
        );
        // A reported limitation can refine a supported finding without contradicting it.
        // Require an explicit cross-role relation for every unit; duplicate claims still need review.
        const claim = (key: string) => draft.draft_units.find(unit => unit.client_unit_key === key)
          ?.source_statement.replace(/\s+/g, ' ').trim();
        const supportClaims = new Set([...roleUnitKeys.support].map(claim));
        const duplicatesAcrossRoles = [...roleUnitKeys.challenge].some(key => supportClaims.has(claim(key)));
        const boundedUnitKeys = new Set(draft.draft_links.filter((link) => {
          if (link.link_type !== 'refines' || !link.rationale?.trim()) return false;
          const crossRole = (roleUnitKeys.support.has(link.source_unit_key) && roleUnitKeys.challenge.has(link.target_unit_key))
            || (roleUnitKeys.challenge.has(link.source_unit_key) && roleUnitKeys.support.has(link.target_unit_key));
          if (!crossRole) return false;
          return claim(link.source_unit_key) !== claim(link.target_unit_key);
        }).flatMap(link => [link.source_unit_key, link.target_unit_key]));
        const hasScopeRefinements = !duplicatesAcrossRoles
          && [...roleUnitKeys.support, ...roleUnitKeys.challenge].every(key => boundedUnitKeys.has(key));
        if (!hasConflict && !hasScopeRefinements) {
          state.reviewCodes.add('SUPPORT_CHALLENGE_POLARITY_AMBIGUOUS');
          for (const unitKey of [...roleUnitKeys.support, ...roleUnitKeys.challenge]) {
            this.rejectUnit(state, unitKey, 'SUPPORT_CHALLENGE_POLARITY_AMBIGUOUS');
          }
          state.failedValidationLayer ??= 'materialization';
          state.repairTarget ??= 'revise_extraction_draft';
        }
      }
    }
  }

  private validateRequiredLiteratureCoverage(
    handoff: TopicSelectionSearchRunHandoff,
    unitLiteratureRefs: Set<string>,
    state: DraftValidationState,
  ): void {
    const requiredLiteratureRefs = handoff.evidence_map_input_refs
      .filter((ref) => ref.ref_type === 'literature_record')
      .map((ref) => this.refKey(ref));
    const missingLiteratureRefs = requiredLiteratureRefs.filter((key) => !unitLiteratureRefs.has(key));
    if (missingLiteratureRefs.length === 0) {
      return;
    }
    this.block(
      state,
      'EVIDENCE_UNIT_MISSING_FOR_INPUT_LITERATURE',
      'materialization',
      'rerun_extraction_or_complete_evidence',
    );
  }

  private validateUnit(
    unit: TopicSelectionEvidenceMapExtractionDraftUnit,
    allowedEvidenceRefs: Set<string>,
    coverageRowRefs: Set<string>,
    coverageRoleExpectations: Map<string, TopicSelectionEvidenceRole>,
    unitKeys: Set<string>,
    roleUnitKeysBySource: Map<string, SourceRoleUnitKeys>,
    state: DraftValidationState,
  ): void {
    if (unitKeys.has(unit.client_unit_key)) {
      this.block(state, 'DUPLICATE_EVIDENCE_UNIT_KEY', 'materialization', 'repair_extraction_draft_schema');
      this.rejectUnit(state, unit.client_unit_key, 'DUPLICATE_EVIDENCE_UNIT_KEY');
    }
    unitKeys.add(unit.client_unit_key);

    if (unit.source_attribution_kind === 'llm_inference') {
      this.block(state, 'LLM_INFERENCE_NOT_SOURCE_CLAIM', 'materialization', 'revise_source_attribution');
      this.rejectUnit(state, unit.client_unit_key, 'LLM_INFERENCE_NOT_SOURCE_CLAIM');
    }
    if (unit.source_statement.trim().length === 0) {
      this.block(state, 'EMPTY_SOURCE_STATEMENT', 'materialization', 'revise_source_statement');
      this.rejectUnit(state, unit.client_unit_key, 'EMPTY_SOURCE_STATEMENT');
    }
    if (unit.coverage_row_intent_ref && !coverageRowRefs.has(this.refKey(unit.coverage_row_intent_ref))) {
      this.block(state, 'COVERAGE_ROW_OUTSIDE_HANDOFF', 'lineage', 'repair_node4_handoff_or_draft');
      this.rejectUnit(state, unit.client_unit_key, 'COVERAGE_ROW_OUTSIDE_HANDOFF');
    }
    if (unit.coverage_row_intent_ref) {
      const expectedRole = coverageRoleExpectations.get(this.refKey(unit.coverage_row_intent_ref));
      if (!expectedRole) {
        this.block(state, 'COVERAGE_ROW_ROLE_EXPECTATION_MISSING', 'lineage', 'repair_node4_handoff_or_draft');
        this.rejectUnit(state, unit.client_unit_key, 'COVERAGE_ROW_ROLE_EXPECTATION_MISSING');
      } else if (expectedRole === 'unknown') {
        state.warningCodes.add('COVERAGE_ROW_ROLE_EXPECTATION_UNKNOWN');
      } else if (expectedRole !== unit.evidence_role) {
        this.block(state, 'COVERAGE_ROW_ROLE_MISMATCH', 'materialization', 'revise_extraction_role_or_coverage_row');
        this.rejectUnit(state, unit.client_unit_key, 'COVERAGE_ROW_ROLE_MISMATCH');
      }
    }
    if (!allowedEvidenceRefs.has(this.refKey(unit.literature_ref))) {
      this.block(state, 'LITERATURE_REF_OUTSIDE_HANDOFF', 'lineage', 'repair_node4_handoff_or_draft');
      this.rejectUnit(state, unit.client_unit_key, 'LITERATURE_REF_OUTSIDE_HANDOFF');
    }
    for (const sourceRef of unit.source_refs) {
      if (!allowedEvidenceRefs.has(this.refKey(sourceRef))) {
        this.block(state, 'SOURCE_REF_OUTSIDE_HANDOFF', 'lineage', 'repair_node4_handoff_or_draft');
        this.rejectUnit(state, unit.client_unit_key, 'SOURCE_REF_OUTSIDE_HANDOFF');
      }
    }
    if (unit.locator.literature_ref.ref_id !== unit.literature_ref.ref_id) {
      this.block(state, 'LOCATOR_LITERATURE_REF_MISMATCH', 'lineage', 'revise_locator_refs');
      this.rejectUnit(state, unit.client_unit_key, 'LOCATOR_LITERATURE_REF_MISMATCH');
    }
    if (!allowedEvidenceRefs.has(this.refKey(unit.locator.source_ref))) {
      this.block(state, 'LOCATOR_SOURCE_REF_OUTSIDE_HANDOFF', 'lineage', 'repair_node4_handoff_or_draft');
      this.rejectUnit(state, unit.client_unit_key, 'LOCATOR_SOURCE_REF_OUTSIDE_HANDOFF');
    }
    for (const locatorRef of this.locatorRefsRequiringEvidenceInput(unit)) {
      if (!allowedEvidenceRefs.has(this.refKey(locatorRef))) {
        this.block(state, 'LOCATOR_PROVENANCE_REF_OUTSIDE_HANDOFF', 'lineage', 'repair_node4_handoff_or_draft');
        this.rejectUnit(state, unit.client_unit_key, 'LOCATOR_PROVENANCE_REF_OUTSIDE_HANDOFF');
      }
    }
    if (!unit.coverage_row_intent_ref) {
      state.warningCodes.add('COVERAGE_ROW_INTENT_REF_MISSING');
    }
    if (unit.locator.locator_type === 'abstract' && unit.evidence_role === 'support') {
      state.warningCodes.add('ABSTRACT_ONLY_SUPPORT');
    }
    if (unit.confidence !== null && unit.confidence < 0.5 && unit.evidence_role === 'support') {
      state.reviewCodes.add('LOW_CONFIDENCE_CORE_SUPPORT');
      this.rejectUnit(state, unit.client_unit_key, 'LOW_CONFIDENCE_CORE_SUPPORT');
      state.failedValidationLayer ??= 'materialization';
      state.repairTarget ??= 'revise_extraction_draft';
    } else if (unit.confidence !== null && unit.confidence < 0.7) {
      state.warningCodes.add('LOW_CONFIDENCE_EVIDENCE_UNIT');
    }
    if (unit.issue_codes.includes('REVIEW_REQUIRED') || unit.issue_codes.includes('AMBIGUOUS_EVIDENCE_ROLE')) {
      state.reviewCodes.add('DRAFT_UNIT_REQUIRES_REVIEW');
      this.rejectUnit(state, unit.client_unit_key, 'DRAFT_UNIT_REQUIRES_REVIEW');
      state.failedValidationLayer ??= 'materialization';
      state.repairTarget ??= 'revise_extraction_draft';
    }
    for (const issueCode of unit.issue_codes) {
      state.warningCodes.add(issueCode);
    }

    const sourceKey = [
      this.refKey(unit.literature_ref),
      ...unit.source_refs.map((ref) => this.refKey(ref)).sort(),
    ].join('|');
    const roleUnitKeys = roleUnitKeysBySource.get(sourceKey) ?? this.emptySourceRoleUnitKeys();
    roleUnitKeys[unit.evidence_role].add(unit.client_unit_key);
    roleUnitKeysBySource.set(sourceKey, roleUnitKeys);
  }

  private locatorRefsRequiringEvidenceInput(
    unit: TopicSelectionEvidenceMapExtractionDraftUnit,
  ): TopicSelectionFunctionalRef[] {
    const refs: TopicSelectionFunctionalRef[] = [];
    const locator = unit.locator;
    if (locator.locator_type === 'section' || locator.locator_type === 'paragraph' || locator.locator_type === 'anchor') {
      refs.push(locator.locator_ref);
    }
    for (const locatorRef of [
      locator.content_ref,
      locator.document_ref,
      locator.section_ref,
      locator.paragraph_ref,
      locator.anchor_ref,
    ]) {
      if (locatorRef) {
        refs.push(locatorRef);
      }
    }
    return this.uniqueRefs(refs);
  }

  private emptySourceRoleUnitKeys(): SourceRoleUnitKeys {
    return {
      support: new Set<string>(),
      challenge: new Set<string>(),
      baseline: new Set<string>(),
      context: new Set<string>(),
    };
  }

  private coverageRoleExpectationMap(
    handoff: TopicSelectionSearchRunHandoff,
  ): Map<string, TopicSelectionEvidenceRole> {
    return new Map(
      (handoff.coverage_role_expectations ?? []).map((entry) => [
        this.refKey(entry.coverage_row_intent_ref),
        entry.expected_evidence_role,
      ]),
    );
  }

  private validateStructuralUnitKeys(
    records: Array<{ unit_keys?: string[]; source_unit_key?: string; target_unit_key?: string }>,
    recordKind: string,
    unitKeys: Set<string>,
    state: DraftValidationState,
  ): void {
    for (const record of records) {
      const referenced = [
        ...(record.unit_keys ?? []),
        record.source_unit_key,
        record.target_unit_key,
      ].filter((key): key is string => Boolean(key));
      for (const unitKey of referenced) {
        if (!unitKeys.has(unitKey)) {
          this.block(
            state,
            'STRUCTURAL_REF_UNKNOWN_UNIT_KEY',
            'materialization',
            `repair_${recordKind}_unit_refs`,
          );
        }
      }
    }
  }

  private validateConflictUnitKeys(
    conflict: TopicSelectionEvidenceMapExtractionDraftConflict,
    unitKeys: Set<string>,
    state: DraftValidationState,
  ): void {
    const referenced = [
      ...conflict.support_unit_keys,
      ...conflict.challenge_unit_keys,
      ...conflict.baseline_unit_keys,
      ...conflict.context_unit_keys,
    ];
    for (const unitKey of referenced) {
      if (!unitKeys.has(unitKey)) {
        this.block(
          state,
          'STRUCTURAL_REF_UNKNOWN_UNIT_KEY',
          'materialization',
          'repair_conflict_unit_refs',
        );
      }
    }
  }

  private toCreateEvidenceMapInput(
    input: TopicSelectionEvidenceMapMaterializationInput,
  ): TopicSelectionCreateEvidenceMapFromSearchRunInput {
    const draft = input.extraction_draft;
    if (!draft) {
      throw new Error('Cannot materialize without an extraction draft.');
    }
    return {
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      search_run_id: input.search_run_handoff.search_run_ref.ref_id,
      evidence_units: draft.draft_units
        .map((unit) => ({
          client_unit_key: unit.client_unit_key,
          coverage_row_intent_id: unit.coverage_row_intent_ref?.ref_id ?? null,
          evidence_role: unit.evidence_role,
          literature_ref: unit.literature_ref,
          source_refs: unit.source_refs,
          locator: unit.locator,
          source_attribution_kind: unit.source_attribution_kind,
          source_statement: unit.source_statement.trim(),
          normalized_statement: unit.normalized_statement ?? null,
          interpretation_payload: unit.interpretation_payload,
          extraction_confidence: unit.confidence,
          review_status: 'machine_checked' as const,
        }))
        .sort((left, right) => left.client_unit_key.localeCompare(right.client_unit_key)),
      typed_links: draft.draft_links.map((link) => ({ ...link })),
      clusters: draft.draft_clusters.map((cluster) => ({ ...cluster })),
      patterns: draft.draft_patterns.map((pattern) => ({ ...pattern })),
      conflict_sets: draft.draft_conflicts.map((conflict) => ({
        conflict_type: conflict.conflict_type,
        severity: conflict.severity,
        support_unit_keys: conflict.support_unit_keys,
        challenge_unit_keys: conflict.challenge_unit_keys,
        baseline_unit_keys: conflict.baseline_unit_keys,
        context_unit_keys: conflict.context_unit_keys,
        issue_codes: conflict.issue_codes,
      })),
      digest_payload: {
        extraction_draft_hash: this.hash(draft),
        input_refs_hash: draft.input_refs_hash,
        producer_kind: draft.producer_kind,
        warning_codes: draft.warning_codes,
      },
      created_by: input.created_by ?? 'system',
      policy_version_id: input.policy_version,
    };
  }

  private result(
    input: TopicSelectionEvidenceMapMaterializationInput,
    state: DraftValidationState,
    mappedInput: TopicSelectionCreateEvidenceMapFromSearchRunInput | null,
    draftHash: string | null,
    inputRefsHash: string | null,
    materializationInputHash: string | null = null,
  ): TopicSelectionEvidenceMapMaterializationResult {
    const status = this.status(state, mappedInput);
    const report: TopicSelectionEvidenceMapMaterializationReport = {
      schema_version: TOPIC_SELECTION_EVIDENCE_MAP_MATERIALIZATION_REPORT_SCHEMA_VERSION,
      workflow_run_id: input.workflow_run_id,
      node_attempt_id: input.node_attempt_id,
      status,
      accepted_unit_count: this.acceptedUnitCount(input.extraction_draft, state, status),
      rejected_unit_count: Object.keys(state.rejectionReasons).length,
      rejection_reasons_by_client_unit_key: state.rejectionReasons,
      warning_codes: this.sorted([...state.warningCodes, ...(input.extraction_draft?.warning_codes ?? [])]),
      review_codes: this.sorted([...state.reviewCodes]),
      blocker_codes: this.sorted([...state.blockerCodes]),
      failed_validation_layer: state.failedValidationLayer,
      repair_target: state.repairTarget,
      normalized_role_counts: this.roleCounts(input.extraction_draft),
      materialization_input_hash: materializationInputHash,
      draft_hash: draftHash,
      input_refs_hash: inputRefsHash,
      mapped_input: mappedInput
        ? {
            search_run_id: mappedInput.search_run_id,
            evidence_unit_count: mappedInput.evidence_units.length,
            typed_link_count: mappedInput.typed_links?.length ?? 0,
            cluster_count: mappedInput.clusters?.length ?? 0,
            pattern_count: mappedInput.patterns?.length ?? 0,
            conflict_set_count: mappedInput.conflict_sets?.length ?? 0,
          }
        : null,
      policy_version: input.policy_version,
      output_schema_version: input.output_schema_version,
    };
    return {
      report,
      mapped_input: mappedInput,
      draft_hash: draftHash,
      materialization_input_hash: materializationInputHash,
    };
  }

  private status(
    state: DraftValidationState,
    mappedInput: TopicSelectionCreateEvidenceMapFromSearchRunInput | null,
  ): TopicSelectionEvidenceMapMaterializationStatus {
    if (state.blockerCodes.size > 0) {
      return 'blocked';
    }
    if (state.reviewCodes.size > 0) {
      return 'review_required';
    }
    if (mappedInput && state.warningCodes.size > 0) {
      return 'ready_with_warning';
    }
    return 'ready';
  }

  private acceptedUnitCount(
    draft: TopicSelectionEvidenceMapExtractionDraft | null,
    state: DraftValidationState,
    status: TopicSelectionEvidenceMapMaterializationStatus,
  ): number {
    if (!draft || status === 'blocked') {
      return 0;
    }
    return Math.max(0, draft.draft_units.length - Object.keys(state.rejectionReasons).length);
  }

  private roleCounts(draft: TopicSelectionEvidenceMapExtractionDraft | null): TopicSelectionEvidenceMapRoleCounts {
    const counts: TopicSelectionEvidenceMapRoleCounts = {
      support: 0,
      challenge: 0,
      baseline: 0,
      context: 0,
    };
    for (const unit of draft?.draft_units ?? []) {
      counts[unit.evidence_role] += 1;
    }
    return counts;
  }

  private block(
    state: DraftValidationState,
    code: string,
    layer: TopicSelectionEvidenceMapMaterializationValidationLayer,
    repairTarget: string,
  ): void {
    state.blockerCodes.add(code);
    state.failedValidationLayer ??= layer;
    state.repairTarget ??= repairTarget;
  }

  private rejectUnit(state: DraftValidationState, unitKey: string, reason: string): void {
    state.rejectionReasons[unitKey] = this.sorted([
      ...(state.rejectionReasons[unitKey] ?? []),
      reason,
    ]);
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return [
      ref.ref_type,
      ref.ref_id,
      ref.version_id ?? '',
      ref.title_card_id ?? '',
    ].join(':');
  }

  private refsMatch(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return this.refKey(left) === this.refKey(right);
  }

  private intersects(values: string[], lookup: Set<string>): boolean {
    return values.some((value) => lookup.has(value));
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    const unique: TopicSelectionFunctionalRef[] = [];
    for (const ref of refs) {
      const key = this.refKey(ref);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(ref);
      }
    }
    return unique;
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }

  private sorted(values: string[]): string[] {
    return [...new Set(values)].sort((left, right) => left.localeCompare(right));
  }
}
