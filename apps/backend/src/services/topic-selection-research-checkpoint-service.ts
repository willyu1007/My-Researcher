import crypto from 'node:crypto';
import type {
  TopicSelectionFunctionalRef,
  TopicSelectionHumanConfirmedDecisionRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import {
  TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
  TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS,
  TOPIC_SELECTION_RESEARCH_TRANSITIONS_BY_CHECKPOINT,
  type TopicSelectionResearchCheckpointAction,
  type TopicSelectionResearchCheckpointDecisionInput,
  type TopicSelectionResearchCheckpointDecisionRecord,
  type TopicSelectionResearchCheckpointKind,
  type TopicSelectionResearchCheckpointPacket,
  type TopicSelectionResearchCheckpointRecord,
  type TopicSelectionResearchObjectionInput,
  type TopicSelectionResearchObjectionRecord,
  type TopicSelectionResearchObjectionResolutionInput,
  type TopicSelectionResearchObjectionResolutionRecord,
  type TopicSelectionResearchStatusProjection,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-research-checkpoint-contracts';
import { AppError } from '../errors/app-error.js';
import {
  TopicSelectionResearchCheckpointCurrentConflictError,
  type TopicSelectionResearchCheckpointRepository,
} from '../repositories/topic-selection-research-checkpoint.repository.js';
import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';
import { TopicSelectionControlPlaneService } from './topic-selection-control-plane-service.js';

type IdFactory = (prefix: string) => string;

type ServiceOptions = {
  idFactory?: IdFactory;
  now?: () => string;
};

export type MaterializeResearchCheckpointInput = {
  workspace_id?: string | null;
  title_card_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  provenance_class?: TopicSelectionResearchCheckpointRecord['provenance_class'];
  policy_version_id?: string | null;
  target_ref: TopicSelectionFunctionalRef;
  target_snapshot_hash: string;
  source_refs?: TopicSelectionFunctionalRef[];
  allowed_actions: TopicSelectionResearchCheckpointAction[];
  required_action_refs?: TopicSelectionFunctionalRef[];
  packet_payload?: Record<string, unknown>;
};

export type AssertResearchTransitionInput = {
  title_card_id: string;
  checkpoint_kind: TopicSelectionResearchCheckpointKind;
  target_ref?: TopicSelectionFunctionalRef;
  target_snapshot_hash?: string;
};

const BLOCKING_OBJECTION_SEVERITIES = new Set(['blocking', 'critical']);

export class TopicSelectionResearchCheckpointService {
  private readonly idFactory: IdFactory;
  private readonly now: () => string;

  constructor(
    private readonly repository: TopicSelectionResearchCheckpointRepository,
    private readonly controlPlane: TopicSelectionControlPlaneService,
    options: ServiceOptions = {},
  ) {
    this.idFactory = options.idFactory ?? ((prefix) => `${prefix}_${crypto.randomUUID()}`);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async materializeCheckpoint(
    input: MaterializeResearchCheckpointInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    this.assertHash(input.target_snapshot_hash, 'target_snapshot_hash');
    this.assertTarget(input.title_card_id, input.target_ref);
    const sourceRefs = this.uniqueRefs(input.source_refs ?? []);
    const requiredActionRefs = this.uniqueRefs(input.required_action_refs ?? []);
    const allowedActions = [...new Set(input.allowed_actions)].sort();
    if (allowedActions.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'ResearchCheckpoint requires at least one allowed action.');
    }
    const packetIdentity = {
      allowed_actions: allowedActions,
      checkpoint_kind: input.checkpoint_kind,
      contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      provenance_class: input.provenance_class ?? 'native',
      packet_payload: input.packet_payload ?? {},
      policy_version_id: input.policy_version_id ?? null,
      required_action_refs: requiredActionRefs,
      source_refs: sourceRefs,
      target_ref: input.target_ref,
      target_snapshot_hash: input.target_snapshot_hash,
      title_card_id: input.title_card_id,
    };
    const packetHash = this.hash(packetIdentity);
    const checkpointKey = this.hash(packetIdentity);
    const existing = await this.repository.findCheckpointByKey(checkpointKey);
    if (existing) return existing;

    const inputSnapshot = await this.controlPlane.compileInputSnapshot({
      input_snapshot_id: `input_snapshot_research_checkpoint_${checkpointKey}`,
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      target_ref: input.target_ref,
      policy_version: input.policy_version_id ?? TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      source_refs: sourceRefs,
      payload: packetIdentity,
      created_by: 'system',
    });
    const now = this.now();
    const record: TopicSelectionResearchCheckpointRecord = {
      research_checkpoint_id: this.idFactory('research_checkpoint'),
      checkpoint_key: checkpointKey,
      current_checkpoint_key: this.currentKey(input.title_card_id, input.checkpoint_kind),
      workspace_id: input.workspace_id ?? null,
      title_card_id: input.title_card_id,
      checkpoint_kind: input.checkpoint_kind,
      contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      provenance_class: input.provenance_class ?? 'native',
      policy_version_id: input.policy_version_id ?? null,
      target_ref: input.target_ref,
      target_snapshot_hash: input.target_snapshot_hash,
      packet_hash: packetHash,
      input_snapshot_id: inputSnapshot.input_snapshot_id,
      source_refs: sourceRefs,
      allowed_actions: allowedActions,
      required_action_refs: requiredActionRefs,
      decision_authority_ref: null,
      status: 'pending',
      supersedes_checkpoint_id: null,
      superseded_by_checkpoint_id: null,
      created_at: now,
      updated_at: now,
      decided_at: null,
      superseded_at: null,
    };
    try {
      return await this.repository.replaceCurrentCheckpoint(record);
    } catch (error) {
      if (error instanceof TopicSelectionResearchCheckpointCurrentConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async listCheckpoints(titleCardId: string): Promise<TopicSelectionResearchCheckpointRecord[]> {
    return this.repository.listCheckpointsByTitleCardId(titleCardId);
  }

  async getCheckpoint(checkpointId: string): Promise<TopicSelectionResearchCheckpointRecord> {
    const record = await this.repository.findCheckpointById(checkpointId);
    if (!record) throw new AppError(404, 'NOT_FOUND', `ResearchCheckpoint ${checkpointId} not found.`);
    return record;
  }

  async getPacket(checkpointId: string): Promise<TopicSelectionResearchCheckpointPacket> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    const [decision, objections, inputSnapshot] = await Promise.all([
      this.repository.findDecisionByCheckpointId(checkpointId),
      this.listOpenObjections(checkpointId),
      this.controlPlane.getInputSnapshot(checkpoint.input_snapshot_id),
    ]);
    if (!inputSnapshot) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint input snapshot is missing.');
    }
    if (this.hash(inputSnapshot.payload) !== checkpoint.packet_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint packet hash no longer matches its input snapshot.');
    }
    const packetPayload = inputSnapshot.payload.packet_payload;
    if (!packetPayload || typeof packetPayload !== 'object' || Array.isArray(packetPayload)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint packet payload is invalid.');
    }
    return {
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      checkpoint_kind: checkpoint.checkpoint_kind,
      title_card_id: checkpoint.title_card_id,
      contract_version: checkpoint.contract_version,
      target_ref: checkpoint.target_ref,
      target_snapshot_hash: checkpoint.target_snapshot_hash,
      source_refs: checkpoint.source_refs,
      allowed_actions: checkpoint.allowed_actions,
      required_action_refs: checkpoint.required_action_refs,
      packet_payload: packetPayload as Record<string, unknown>,
      open_objections: objections,
      decision,
      packet_hash: checkpoint.packet_hash,
    };
  }

  async recordDecision(
    checkpointId: string,
    input: TopicSelectionResearchCheckpointDecisionInput,
  ): Promise<TopicSelectionResearchCheckpointDecisionRecord> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    const replay = await this.repository.findDecisionByKey(input.decision_key);
    if (replay) {
      this.assertReplayMatches(replay, checkpointId, input);
      return replay;
    }
    this.assertCurrentPending(checkpoint);
    this.assertStrictHuman(input.actor);
    this.assertHash(input.confirmed_snapshot_hash, 'confirmed_snapshot_hash');
    if (input.confirmed_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint decision snapshot is stale.');
    }
    if (!checkpoint.allowed_actions.includes(input.decision)) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', `Decision ${input.decision} is not allowed by this checkpoint.`);
    }
    if (checkpoint.checkpoint_kind !== 'evidence_landscape'
      && checkpoint.checkpoint_kind !== 'question_contract') {
      throw new AppError(
        409,
        'GATE_CONSTRAINT_FAILED',
        `Checkpoint ${checkpoint.checkpoint_kind} must use its stage-specific human decision authority.`,
      );
    }
    this.assertReviewPayload(checkpoint.checkpoint_kind, input);
    const requiredActionRefs = this.uniqueRefs(input.required_action_refs ?? []);
    const loopbackRefs = this.uniqueRefs(input.loopback_refs ?? []);
    if (input.decision === 'advance' && requiredActionRefs.length > 0) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'An advancing checkpoint decision cannot leave required actions open.');
    }
    if (input.decision === 'loopback' && !input.loopback_target) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'A loopback decision requires loopback_target.');
    }
    if (input.decision !== 'loopback' && input.loopback_target) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Only a loopback decision can name loopback_target.');
    }
    const now = this.now();
    const decisionId = this.idFactory('research_checkpoint_decision');
    const humanDecisionId = this.idFactory('human_decision');
    const decisionKind = checkpoint.checkpoint_kind === 'evidence_landscape'
      ? 'evidence_landscape_confirmation'
      : 'topic_question_confirmation';
    const decision: TopicSelectionResearchCheckpointDecisionRecord = {
      research_checkpoint_decision_id: decisionId,
      decision_key: input.decision_key,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      human_confirmed_decision_id: humanDecisionId,
      workspace_id: checkpoint.workspace_id ?? null,
      title_card_id: checkpoint.title_card_id,
      checkpoint_kind: checkpoint.checkpoint_kind,
      decision_kind: decisionKind,
      decision: input.decision,
      actor: input.actor,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      rationale: input.rationale,
      review_payload: input.review_payload,
      required_action_refs: requiredActionRefs,
      loopback_target: input.loopback_target ?? null,
      loopback_refs: loopbackRefs,
      created_at: now,
    };
    const decisionRef = this.ref('research_checkpoint_decision', decisionId, checkpoint.title_card_id);
    const humanDecision: TopicSelectionHumanConfirmedDecisionRecord = {
      human_confirmed_decision_id: humanDecisionId,
      workspace_id: checkpoint.workspace_id ?? null,
      title_card_id: checkpoint.title_card_id,
      target_ref: this.ref('research_checkpoint', checkpoint.research_checkpoint_id, checkpoint.title_card_id),
      decision_type: this.humanDecisionType(input.decision),
      actor: input.actor,
      rationale: input.rationale,
      artifact_refs: [],
      policy_version_id: checkpoint.policy_version_id ?? null,
      resulting_authority_refs: [decisionRef],
      created_at: now,
    };
    const decidedCheckpoint: TopicSelectionResearchCheckpointRecord = {
      ...checkpoint,
      status: 'decided',
      decision_authority_ref: decisionRef,
      required_action_refs: requiredActionRefs,
      updated_at: now,
      decided_at: now,
    };
    try {
      const persisted = await this.repository.createDecision({
        checkpoint: decidedCheckpoint,
        decision,
        human_confirmed_decision: humanDecision,
      });
      this.assertReplayMatches(persisted, checkpointId, input);
      return persisted;
    } catch (error) {
      if (error instanceof TopicSelectionResearchCheckpointCurrentConflictError) {
        throw new AppError(409, 'VERSION_CONFLICT', error.message);
      }
      throw error;
    }
  }

  async recordObjection(
    checkpointId: string,
    input: TopicSelectionResearchObjectionInput,
  ): Promise<TopicSelectionResearchObjectionRecord> {
    const checkpoint = await this.getCheckpoint(checkpointId);
    const replay = await this.repository.findObjectionByKey(input.objection_key);
    if (replay) {
      if (this.hash(this.objectionReplayPayload(replay)) !== this.hash(this.objectionInputPayload(checkpointId, input))) {
        throw new AppError(409, 'VERSION_CONFLICT', 'objection_key already identifies different objection content.');
      }
      return replay;
    }
    this.assertCurrent(checkpoint);
    this.assertStrictHuman(input.actor);
    if (input.confirmed_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'Research objection snapshot is stale.');
    }
    const record: TopicSelectionResearchObjectionRecord = {
      research_objection_id: this.idFactory('research_objection'),
      objection_key: input.objection_key,
      workspace_id: checkpoint.workspace_id ?? null,
      title_card_id: checkpoint.title_card_id,
      research_checkpoint_id: checkpoint.research_checkpoint_id,
      checkpoint_kind: checkpoint.checkpoint_kind,
      target_ref: checkpoint.target_ref,
      target_snapshot_hash: checkpoint.target_snapshot_hash,
      severity: input.severity,
      summary: input.summary,
      rationale: input.rationale,
      required_loopback: input.required_loopback ?? null,
      source_refs: this.uniqueRefs(input.source_refs ?? []),
      actor: input.actor,
      created_at: this.now(),
    };
    const persisted = await this.repository.createObjection(record);
    this.assertObjectionReplayMatches(persisted, checkpointId, input);
    return persisted;
  }

  async resolveObjection(
    objectionId: string,
    input: TopicSelectionResearchObjectionResolutionInput,
  ): Promise<TopicSelectionResearchObjectionResolutionRecord> {
    const objection = await this.repository.findObjectionById(objectionId);
    if (!objection) throw new AppError(404, 'NOT_FOUND', `ResearchObjection ${objectionId} not found.`);
    const replay = await this.repository.findObjectionResolutionByKey(input.resolution_key);
    if (replay) {
      if (this.hash(this.resolutionReplayPayload(replay))
        !== this.hash(this.resolutionInputPayload(objectionId, input))) {
        throw new AppError(409, 'VERSION_CONFLICT', 'resolution_key already identifies different resolution content.');
      }
      return replay;
    }
    const existing = await this.repository.findObjectionResolutionByObjectionId(objectionId);
    if (existing) throw new AppError(409, 'VERSION_CONFLICT', 'ResearchObjection is already resolved.');
    this.assertStrictHuman(input.actor);
    this.assertHash(input.resolved_snapshot_hash, 'resolved_snapshot_hash');
    if (input.output_refs.length === 0) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'ResearchObjection resolution requires at least one output_ref.');
    }
    const persisted = await this.repository.createObjectionResolution({
      research_objection_resolution_id: this.idFactory('research_objection_resolution'),
      resolution_key: input.resolution_key,
      research_objection_id: objection.research_objection_id,
      workspace_id: objection.workspace_id ?? null,
      title_card_id: objection.title_card_id,
      resolution_type: input.resolution_type,
      actor: input.actor,
      resolved_snapshot_hash: input.resolved_snapshot_hash,
      rationale: input.rationale,
      output_refs: this.uniqueRefs(input.output_refs),
      created_at: this.now(),
    });
    this.assertResolutionReplayMatches(persisted, objectionId, input);
    return persisted;
  }

  async assertTransitionAllowed(
    input: AssertResearchTransitionInput,
  ): Promise<TopicSelectionResearchCheckpointRecord> {
    const checkpoint = await this.repository.findCurrentCheckpoint(input.title_card_id, input.checkpoint_kind);
    if (!checkpoint) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint is required.`);
    }
    if (input.target_ref && !this.refsEqual(input.target_ref, checkpoint.target_ref)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint target authority is stale.');
    }
    if (input.target_snapshot_hash && input.target_snapshot_hash !== checkpoint.target_snapshot_hash) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint target snapshot is stale.');
    }
    if (checkpoint.status !== 'decided' || !checkpoint.decision_authority_ref) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint has not advanced.`);
    }
    const localDecision = await this.repository.findDecisionByCheckpointId(checkpoint.research_checkpoint_id);
    if (localDecision && localDecision.decision !== 'advance') {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint decision is ${localDecision.decision}.`);
    }
    if (checkpoint.required_action_refs.length > 0) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint has unresolved required actions.`);
    }
    const objections = await this.listOpenObjections(checkpoint.research_checkpoint_id);
    if (objections.some((objection) => BLOCKING_OBJECTION_SEVERITIES.has(objection.severity))) {
      throw new AppError(409, 'GATE_CONSTRAINT_FAILED', `Current ${input.checkpoint_kind} checkpoint has open blocking objections.`);
    }
    return checkpoint;
  }

  async getResearchStatus(titleCardId: string): Promise<TopicSelectionResearchStatusProjection> {
    const allRecords = await this.repository.listCheckpointsByTitleCardId(titleCardId);
    const currentByKind = new Map(
      allRecords
        .filter((record) => record.current_checkpoint_key !== null)
        .map((record) => [record.checkpoint_kind, record]),
    );
    const checkpointChain = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS
      .map((kind) => currentByKind.get(kind))
      .filter((record): record is TopicSelectionResearchCheckpointRecord => Boolean(record));
    const packetByKind = new Map(
      await Promise.all(checkpointChain.map(async (checkpoint) => [
        checkpoint.checkpoint_kind,
        await this.getPacket(checkpoint.research_checkpoint_id),
      ] as const)),
    );
    let currentCheckpoint: TopicSelectionResearchCheckpointRecord | null = null;
    let currentPacket: TopicSelectionResearchCheckpointPacket | null = null;
    let requiredCheckpointKind: TopicSelectionResearchCheckpointKind | null = 'evidence_landscape';
    let nextAuthorizedTransition: string | null = null;
    const openBlockingObjectionCount = [...packetByKind.values()]
      .flatMap((packet) => packet.open_objections)
      .filter((objection) => BLOCKING_OBJECTION_SEVERITIES.has(objection.severity)).length;
    for (const kind of TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS) {
      requiredCheckpointKind = kind;
      const checkpoint = currentByKind.get(kind);
      if (!checkpoint) break;
      const packet = packetByKind.get(kind);
      if (!packet) throw new AppError(409, 'VERSION_CONFLICT', `Current ${kind} packet is missing.`);
      const advancing = checkpoint.status === 'decided'
        && Boolean(checkpoint.decision_authority_ref)
        && checkpoint.required_action_refs.length === 0
        && !packet.open_objections.some((objection) => BLOCKING_OBJECTION_SEVERITIES.has(objection.severity))
        && (!packet.decision || packet.decision.decision === 'advance');
      if (!advancing) {
        currentCheckpoint = checkpoint;
        currentPacket = packet;
        break;
      }
      nextAuthorizedTransition = TOPIC_SELECTION_RESEARCH_TRANSITIONS_BY_CHECKPOINT[kind];
      const nextIndex = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS.indexOf(kind) + 1;
      requiredCheckpointKind = TOPIC_SELECTION_RESEARCH_CHECKPOINT_KINDS[nextIndex] ?? null;
    }
    return {
      title_card_id: titleCardId,
      contract_version: TOPIC_SELECTION_RESEARCH_CHECKPOINT_CONTRACT_VERSION,
      checkpoint_chain: checkpointChain,
      current_checkpoint: currentCheckpoint,
      current_packet: currentPacket,
      required_checkpoint_kind: requiredCheckpointKind,
      next_authorized_transition: nextAuthorizedTransition,
      open_blocking_objection_count: openBlockingObjectionCount,
      legacy_provenance: checkpointChain.length === 0
        || checkpointChain.some((checkpoint) => checkpoint.provenance_class === 'backfilled'),
    };
  }

  private async listOpenObjections(checkpointId: string): Promise<TopicSelectionResearchObjectionRecord[]> {
    const objections = await this.repository.listObjectionsByCheckpointId(checkpointId);
    const open: TopicSelectionResearchObjectionRecord[] = [];
    for (const objection of objections) {
      const resolution = await this.repository.findObjectionResolutionByObjectionId(objection.research_objection_id);
      if (!resolution) open.push(objection);
    }
    return open;
  }

  private assertCurrent(checkpoint: TopicSelectionResearchCheckpointRecord): void {
    if (!checkpoint.current_checkpoint_key || checkpoint.status === 'superseded') {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint is not current.');
    }
  }

  private assertCurrentPending(checkpoint: TopicSelectionResearchCheckpointRecord): void {
    this.assertCurrent(checkpoint);
    if (checkpoint.status !== 'pending') {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint already has a decision.');
    }
  }

  private assertReviewPayload(
    checkpointKind: TopicSelectionResearchCheckpointKind,
    input: TopicSelectionResearchCheckpointDecisionInput,
  ): void {
    if (checkpointKind !== input.review_payload.review_kind) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'Review payload does not match checkpoint kind.');
    }
    if (input.decision !== 'advance') return;
    const payload = input.review_payload;
    const complete = payload.review_kind === 'evidence_landscape'
      ? payload.nearest_work_reviewed
        && payload.disconfirming_evidence_reviewed
        && payload.source_quality_reviewed
      : payload.mechanism_identifiable
        && payload.proxy_operationalized
        && payload.confounds_reviewed
        && payload.falsification_reviewed
        && payload.claim_ceiling_reviewed;
    if (!complete) {
      throw new AppError(422, 'GATE_CONSTRAINT_FAILED', 'An advancing decision requires every semantic review check to pass.');
    }
  }

  private assertReplayMatches(
    replay: TopicSelectionResearchCheckpointDecisionRecord,
    checkpointId: string,
    input: TopicSelectionResearchCheckpointDecisionInput,
  ): void {
    if (replay.research_checkpoint_id !== checkpointId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'decision_key already identifies a different checkpoint.');
    }
    const existingPayload = {
      actor: replay.actor,
      confirmed_snapshot_hash: replay.confirmed_snapshot_hash,
      decision: replay.decision,
      decision_key: replay.decision_key,
      loopback_refs: replay.loopback_refs,
      loopback_target: replay.loopback_target ?? null,
      rationale: replay.rationale,
      required_action_refs: replay.required_action_refs,
      review_payload: replay.review_payload,
    };
    const requestedPayload = {
      actor: input.actor,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      decision: input.decision,
      decision_key: input.decision_key,
      loopback_refs: this.uniqueRefs(input.loopback_refs ?? []),
      loopback_target: input.loopback_target ?? null,
      rationale: input.rationale,
      required_action_refs: this.uniqueRefs(input.required_action_refs ?? []),
      review_payload: input.review_payload,
    };
    if (this.hash(existingPayload) !== this.hash(requestedPayload)) {
      throw new AppError(409, 'VERSION_CONFLICT', 'decision_key already identifies different decision content.');
    }
  }

  private assertObjectionReplayMatches(
    replay: TopicSelectionResearchObjectionRecord,
    checkpointId: string,
    input: TopicSelectionResearchObjectionInput,
  ): void {
    if (this.hash(this.objectionReplayPayload(replay))
      !== this.hash(this.objectionInputPayload(checkpointId, input))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'objection_key already identifies different objection content.');
    }
  }

  private assertResolutionReplayMatches(
    replay: TopicSelectionResearchObjectionResolutionRecord,
    objectionId: string,
    input: TopicSelectionResearchObjectionResolutionInput,
  ): void {
    if (this.hash(this.resolutionReplayPayload(replay))
      !== this.hash(this.resolutionInputPayload(objectionId, input))) {
      throw new AppError(409, 'VERSION_CONFLICT', 'resolution_key already identifies different resolution content.');
    }
  }

  private objectionReplayPayload(record: TopicSelectionResearchObjectionRecord): Record<string, unknown> {
    return {
      actor: record.actor,
      confirmed_snapshot_hash: record.target_snapshot_hash,
      objection_key: record.objection_key,
      rationale: record.rationale,
      required_loopback: record.required_loopback ?? null,
      severity: record.severity,
      source_refs: record.source_refs,
      summary: record.summary,
      checkpoint_id: record.research_checkpoint_id,
    };
  }

  private objectionInputPayload(
    checkpointId: string,
    input: TopicSelectionResearchObjectionInput,
  ): Record<string, unknown> {
    return {
      actor: input.actor,
      confirmed_snapshot_hash: input.confirmed_snapshot_hash,
      objection_key: input.objection_key,
      rationale: input.rationale,
      required_loopback: input.required_loopback ?? null,
      severity: input.severity,
      source_refs: this.uniqueRefs(input.source_refs ?? []),
      summary: input.summary,
      checkpoint_id: checkpointId,
    };
  }

  private resolutionReplayPayload(
    record: TopicSelectionResearchObjectionResolutionRecord,
  ): Record<string, unknown> {
    return {
      actor: record.actor,
      objection_id: record.research_objection_id,
      output_refs: record.output_refs,
      rationale: record.rationale,
      resolution_key: record.resolution_key,
      resolution_type: record.resolution_type,
      resolved_snapshot_hash: record.resolved_snapshot_hash,
    };
  }

  private resolutionInputPayload(
    objectionId: string,
    input: TopicSelectionResearchObjectionResolutionInput,
  ): Record<string, unknown> {
    return {
      actor: input.actor,
      objection_id: objectionId,
      output_refs: this.uniqueRefs(input.output_refs),
      rationale: input.rationale,
      resolution_key: input.resolution_key,
      resolution_type: input.resolution_type,
      resolved_snapshot_hash: input.resolved_snapshot_hash,
    };
  }

  private humanDecisionType(
    decision: TopicSelectionResearchCheckpointAction,
  ): TopicSelectionHumanConfirmedDecisionRecord['decision_type'] {
    if (decision === 'advance') return 'confirm';
    if (decision === 'reject') return 'reject';
    return 'request_revision';
  }

  private assertStrictHuman(actor: { actor_type: 'human'; actor_id: string }): void {
    if (actor.actor_type !== 'human' || !actor.actor_id.trim()) {
      throw new AppError(400, 'INVALID_PAYLOAD', 'ResearchCheckpoint human authority requires actor_type=human and actor_id.');
    }
  }

  private assertTarget(titleCardId: string, target: TopicSelectionFunctionalRef): void {
    if (target.title_card_id && target.title_card_id !== titleCardId) {
      throw new AppError(409, 'VERSION_CONFLICT', 'ResearchCheckpoint target belongs to another title card.');
    }
  }

  private assertHash(value: string, field: string): void {
    if (!/^[a-f0-9]{64}$/u.test(value)) {
      throw new AppError(400, 'INVALID_PAYLOAD', `${field} must be a lowercase sha256 hash.`);
    }
  }

  private currentKey(titleCardId: string, kind: TopicSelectionResearchCheckpointKind): string {
    return `${titleCardId}:${kind}`;
  }

  private refsEqual(left: TopicSelectionFunctionalRef, right: TopicSelectionFunctionalRef): boolean {
    return left.ref_type === right.ref_type
      && left.ref_id === right.ref_id
      && (left.version_id ?? null) === (right.version_id ?? null)
      && (!left.title_card_id || !right.title_card_id || left.title_card_id === right.title_card_id);
  }

  private uniqueRefs(refs: TopicSelectionFunctionalRef[]): TopicSelectionFunctionalRef[] {
    const seen = new Set<string>();
    return refs.filter((ref) => {
      const key = `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((left, right) => this.refKey(left).localeCompare(this.refKey(right)));
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return `${ref.ref_type}:${ref.ref_id}:${ref.version_id ?? ''}:${ref.title_card_id ?? ''}`;
  }

  private ref(refType: string, refId: string, titleCardId: string): TopicSelectionFunctionalRef {
    return { ref_type: refType, ref_id: refId, title_card_id: titleCardId };
  }

  private hash(value: unknown): string {
    return sha256Text(stableStringify(value));
  }
}
