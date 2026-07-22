import {
  serverHashExperimentV2EventEnvelope,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';

import {
  assertEvidenceCommitInput,
  authorityMatchesQualifiedEvent,
  evidenceCandidateAuthorityViolation,
  PaperImplementationEvidenceV2RepositoryConstraintError,
  sameStoredEvidence,
  type PaperImplementationEvidenceInboxReceiptV2,
  type PaperImplementationEvidenceOutboxV2,
  type PaperImplementationEvidenceV2Authority,
  type PaperImplementationEvidenceV2CommitInput,
  type PaperImplementationEvidenceV2Repository,
  type PaperImplementationStoredEvidenceV2,
} from './paper-implementation-evidence-v2.repository.js';

interface State {
  inboxesByEvent: Map<string, PaperImplementationEvidenceInboxReceiptV2>;
  inboxesByBusiness: Map<string, PaperImplementationEvidenceInboxReceiptV2>;
  evidenceByCandidate: Map<string, PaperImplementationStoredEvidenceV2>;
  candidateByRun: Map<string, string>;
  candidateByReport: Map<string, string>;
  candidateByIngestKey: Map<string, string>;
  outboxes: Map<string, PaperImplementationEvidenceOutboxV2>;
}

export interface InMemoryPaperImplementationEvidenceV2RepositoryOptions {
  authorities?: readonly PaperImplementationEvidenceV2Authority[];
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function cloneMap<K, V>(source: Map<K, V>): Map<K, V> {
  return new Map([...source.entries()].map(([key, value]) => [key, clone(value)]));
}

function cloneState(source: State): State {
  return {
    inboxesByEvent: cloneMap(source.inboxesByEvent),
    inboxesByBusiness: cloneMap(source.inboxesByBusiness),
    evidenceByCandidate: cloneMap(source.evidenceByCandidate),
    candidateByRun: new Map(source.candidateByRun),
    candidateByReport: new Map(source.candidateByReport),
    candidateByIngestKey: new Map(source.candidateByIngestKey),
    outboxes: cloneMap(source.outboxes),
  };
}

function eventKey(consumerName: string, eventId: string): string {
  return `${consumerName}\0${eventId}`;
}

function businessKey(receipt: PaperImplementationEvidenceInboxReceiptV2): string {
  const event = receipt.source_event;
  return [
    receipt.consumer_name,
    event.implementation_project_id,
    event.validation_cycle_id,
    event.branch_id,
    event.business_idempotency_key,
  ].join('\0');
}

function authorityKey(branchId: string, revisionId: string): string {
  return `${branchId}\0${revisionId}`;
}

export class InMemoryPaperImplementationEvidenceV2Repository
implements PaperImplementationEvidenceV2Repository {
  private state: State = {
    inboxesByEvent: new Map(),
    inboxesByBusiness: new Map(),
    evidenceByCandidate: new Map(),
    candidateByRun: new Map(),
    candidateByReport: new Map(),
    candidateByIngestKey: new Map(),
    outboxes: new Map(),
  };

  private readonly authorities = new Map<string, PaperImplementationEvidenceV2Authority>();
  private transactionTail: Promise<void> = Promise.resolve();
  private commitFault: Error | null = null;

  constructor(options: InMemoryPaperImplementationEvidenceV2RepositoryOptions = {}) {
    for (const authority of options.authorities ?? []) {
      this.authorities.set(
        authorityKey(authority.branch_id, authority.work_order_revision_id),
        clone(authority),
      );
    }
  }

  failNextCommit(error: Error = new Error('INJECTED_EVIDENCE_COMMIT_FAILURE')): void {
    this.commitFault = error;
  }

  replaceAuthority(authority: PaperImplementationEvidenceV2Authority): void {
    this.authorities.set(
      authorityKey(authority.branch_id, authority.work_order_revision_id),
      clone(authority),
    );
  }

  closeValidationCycle(validationCycleId: string, closureId: string): void {
    for (const [key, authority] of this.authorities) {
      if (authority.validation_cycle_id === validationCycleId) {
        this.authorities.set(key, {
          ...authority,
          validation_cycle_closure_id: closureId,
        });
      }
    }
  }

  snapshot() {
    return {
      inboxes: [...this.state.inboxesByEvent.values()].map(clone),
      run_evidence_units: [...this.state.evidenceByCandidate.values()]
        .map((stored) => clone(stored.run_evidence_unit)),
      trace_manifests: [...this.state.evidenceByCandidate.values()]
        .map((stored) => clone(stored.trace_manifest)),
      outboxes: [...this.state.outboxes.values()].map(clone),
    };
  }

  async findInboxByEvent(consumerName: string, eventId: string) {
    return clone(this.state.inboxesByEvent.get(eventKey(consumerName, eventId)) ?? null);
  }

  async findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ) {
    const key = [
      consumerName,
      implementationProjectId,
      validationCycleId,
      branchId,
      businessIdempotencyKey,
    ].join('\0');
    return clone(this.state.inboxesByBusiness.get(key) ?? null);
  }

  async findAuthority(branchId: string, workOrderRevisionId: string) {
    return clone(this.authorities.get(authorityKey(branchId, workOrderRevisionId)) ?? null);
  }

  async findEvidenceByCandidateId(evidenceCandidateId: string) {
    return clone(this.state.evidenceByCandidate.get(evidenceCandidateId) ?? null);
  }

  async findEvidenceByIngestIdentity(
    evidenceCandidateId: string,
    businessIdempotencyKey: string,
  ) {
    const stored = this.state.evidenceByCandidate.get(evidenceCandidateId);
    if (!stored) return null;
    if (stored.ingest_idempotency_key === businessIdempotencyKey) return clone(stored);
    const receipt = [...this.state.inboxesByEvent.values()].find((candidate) => (
      candidate.outcome === 'processed'
      && candidate.source_event.business_idempotency_key === businessIdempotencyKey
      && candidate.source_event.payload.candidate_id === evidenceCandidateId
    ));
    return receipt ? clone(stored) : null;
  }

  async recordRejectedInbox(inbox: PaperImplementationEvidenceInboxReceiptV2) {
    if (
      inbox.outcome !== 'terminal_conflict'
      || inbox.reason_code === null
      || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(inbox.source_event)
    ) {
      throw new PaperImplementationEvidenceV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'Rejected PI evidence receipt must carry a terminal reason.',
      );
    }
    return this.transact((state) => this.insertInbox(state, inbox));
  }

  async commitEvidenceIngestion(input: PaperImplementationEvidenceV2CommitInput) {
    assertEvidenceCommitInput(input);
    return this.transact((state) => {
      const existingReceipt = this.findInbox(state, input.inbox);
      if (existingReceipt) {
        if (existingReceipt.outcome !== 'processed') {
          return {
            inbox: existingReceipt,
            evidence: null,
            reused_existing_evidence: false as const,
            rejection_message: 'Evidence candidate delivery already has a terminal rejected inbox receipt.',
          };
        }
        const existing = state.evidenceByCandidate.get(
          input.evidence.run_evidence_unit.evidence_candidate_id,
        );
        if (!existing || !sameStoredEvidence(existing, input.evidence)) {
          throw new PaperImplementationEvidenceV2RepositoryConstraintError(
            'EVIDENCE_INGESTION_CONFLICT',
            'Processed evidence receipt lost its exact REU/trace authority.',
          );
        }
        return {
          inbox: existingReceipt,
          evidence: clone(existing),
          reused_existing_evidence: true,
          rejection_message: null,
        };
      }

      const liveAuthority = this.authorities.get(authorityKey(
        input.authority.branch_id,
        input.authority.work_order_revision_id,
      ));
      if (!liveAuthority || !authorityMatchesQualifiedEvent(liveAuthority, input.inbox.source_event)) {
        throw new PaperImplementationEvidenceV2RepositoryConstraintError(
          'BRANCH_HEAD_SCOPE_CONFLICT',
          'Exact admitted PI branch/revision authority drifted before evidence commit.',
        );
      }

      const authorityViolation = evidenceCandidateAuthorityViolation(
        liveAuthority,
        input.inbox.source_event,
      );
      if (authorityViolation) {
        const receipt = this.insertInbox(state, {
          ...input.inbox,
          outcome: 'terminal_conflict',
          reason_code: 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE',
        });
        this.throwCommitFaultIfQueued();
        return {
          inbox: receipt,
          evidence: null,
          reused_existing_evidence: false as const,
          rejection_message: authorityViolation.message,
        };
      }

      const receipt = this.insertInbox(state, input.inbox);
      const unit = input.evidence.run_evidence_unit;
      const existing = state.evidenceByCandidate.get(unit.evidence_candidate_id);
      if (existing) {
        if (!sameStoredEvidence(existing, input.evidence)) {
          throw new PaperImplementationEvidenceV2RepositoryConstraintError(
            'EVIDENCE_INGESTION_CONFLICT',
            'Evidence candidate is already bound to different PI evidence content.',
          );
        }
        this.throwCommitFaultIfQueued();
        return {
          inbox: receipt,
          evidence: clone(existing),
          reused_existing_evidence: true,
          rejection_message: null,
        };
      }

      for (const candidateId of [
        state.candidateByRun.get(unit.run_id),
        state.candidateByReport.get(unit.validation_report_id),
        state.candidateByIngestKey.get(input.evidence.ingest_idempotency_key),
      ]) {
        if (candidateId && candidateId !== unit.evidence_candidate_id) {
          throw new PaperImplementationEvidenceV2RepositoryConstraintError(
            'EVIDENCE_INGESTION_CONFLICT',
            'Run, validation report, or ingest key is already bound to another candidate.',
          );
        }
      }

      state.evidenceByCandidate.set(unit.evidence_candidate_id, clone(input.evidence));
      state.candidateByRun.set(unit.run_id, unit.evidence_candidate_id);
      state.candidateByReport.set(unit.validation_report_id, unit.evidence_candidate_id);
      state.candidateByIngestKey.set(
        input.evidence.ingest_idempotency_key,
        unit.evidence_candidate_id,
      );
      state.outboxes.set(input.outbox.outbox_id, clone(input.outbox));
      this.throwCommitFaultIfQueued();
      return {
        inbox: receipt,
        evidence: clone(input.evidence),
        reused_existing_evidence: false,
        rejection_message: null,
      };
    });
  }

  private findInbox(
    state: State,
    inbox: PaperImplementationEvidenceInboxReceiptV2,
  ): PaperImplementationEvidenceInboxReceiptV2 | null {
    const byEvent = state.inboxesByEvent.get(eventKey(
      inbox.consumer_name,
      inbox.source_event.event_id,
    ));
    const existing = byEvent ?? state.inboxesByBusiness.get(businessKey(inbox));
    if (!existing) return null;
    if (
      existing.source_event.event_id !== inbox.source_event.event_id
      || existing.source_event_hash !== inbox.source_event_hash
      || (
        (existing.outcome !== inbox.outcome || existing.reason_code !== inbox.reason_code)
        && !(
          inbox.outcome === 'processed'
          && inbox.reason_code === null
          && existing.outcome === 'terminal_conflict'
          && existing.reason_code === 'EVIDENCE_CANDIDATE_NOT_ELIGIBLE'
        )
      )
    ) {
      throw new PaperImplementationEvidenceV2RepositoryConstraintError(
        'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
        'PI evidence inbox event or business key was reused with changed content.',
      );
    }
    return clone(existing);
  }

  private insertInbox(
    state: State,
    inbox: PaperImplementationEvidenceInboxReceiptV2,
  ): PaperImplementationEvidenceInboxReceiptV2 {
    const byEvent = state.inboxesByEvent.get(eventKey(
      inbox.consumer_name,
      inbox.source_event.event_id,
    ));
    const byBusiness = state.inboxesByBusiness.get(businessKey(inbox));
    const existing = byEvent ?? byBusiness;
    if (existing) {
      if (
        existing.source_event.event_id !== inbox.source_event.event_id
        || existing.source_event_hash !== inbox.source_event_hash
        || existing.outcome !== inbox.outcome
        || existing.reason_code !== inbox.reason_code
      ) {
        throw new PaperImplementationEvidenceV2RepositoryConstraintError(
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
          'PI evidence inbox event or business key was reused with changed content.',
        );
      }
      return clone(existing);
    }
    state.inboxesByEvent.set(
      eventKey(inbox.consumer_name, inbox.source_event.event_id),
      clone(inbox),
    );
    state.inboxesByBusiness.set(businessKey(inbox), clone(inbox));
    return clone(inbox);
  }

  private throwCommitFaultIfQueued(): void {
    if (!this.commitFault) return;
    const fault = this.commitFault;
    this.commitFault = null;
    throw fault;
  }

  private async transact<T>(operation: (draft: State) => T | Promise<T>): Promise<T> {
    const previous = this.transactionTail;
    let release!: () => void;
    this.transactionTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      const draft = cloneState(this.state);
      const result = await operation(draft);
      this.state = draft;
      return clone(result);
    } finally {
      release();
    }
  }
}
