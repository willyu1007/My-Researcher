import {
  Prisma,
  type PaperImplementationExperimentIntegrationInboxV2 as PiInboxRow,
  type PaperImplementationExperimentIntegrationOutboxV2 as PiOutboxRow,
  type PaperImplementationExperimentWorkOrderAdmissionV2 as AdmissionRow,
  type PaperImplementationExperimentWorkOrderBranchV2 as BranchRow,
  type PaperImplementationExperimentWorkOrderRevisionCellV2 as CellRow,
  type PaperImplementationExperimentWorkOrderRevisionV2 as RevisionRow,
  type PrismaClient,
} from '@prisma/client';
import { Ajv, type ValidateFunction } from 'ajv';
import {
  canonicalizeExperimentV2Json,
  serverHashExperimentV2EventEnvelope,
  serverHashPaperImplementationExperimentV2ApprovedPlan,
  serverHashPaperImplementationExperimentV2BranchFrame,
  serverHashPaperImplementationExperimentV2Cell,
  serverHashPaperImplementationExperimentV2CellPlan,
  serverHashPaperImplementationExperimentV2WorkOrderRevision,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-canonical-hash';
import {
  EXPERIMENT_V2_INT32_MAX,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-v2-contract-limits';
import {
  paperImplementationExperimentV2BranchFrameSchema,
  paperImplementationExperimentV2ExactCellInputSchema,
  paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema,
  type ExperimentV2IntegrationEvent,
  type PaperImplementationExperimentIntegrationInboxV2,
  type PaperImplementationExperimentIntegrationOutboxV2,
  type PaperImplementationExperimentV2BranchFrame,
  type PaperImplementationExperimentV2ExactCellInput,
  type PaperImplementationExperimentV2WorkOrderRevisionSnapshot,
  type PaperImplementationExperimentWorkOrderAdmissionV2,
  type PaperImplementationExperimentWorkOrderBranchV2,
  type PaperImplementationExperimentWorkOrderRevisionCellV2,
  type PaperImplementationExperimentWorkOrderRevisionV2,
  type RunManifestFrozenEventV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-experiment-v2-contracts';

import {
  ExperimentSpineV2RepositoryConstraintError,
  type ExperimentV2RelayClaim,
  type ExperimentV2RelayClaimInput,
  type ExperimentV2RelayReleaseInput,
  type ExperimentV2RelayTerminalInput,
  type PaperImplementationExperimentSpineV2Repository,
  type PaperImplementationExperimentV2AdmissionBundle,
  type PaperImplementationExperimentV2CommitAdmissionInput,
  type PaperImplementationExperimentV2CommitHeadInput,
  type PaperImplementationInboxSourceEventV2,
} from '../experiment-spine-v2.repository.js';
import {
  decodeExperimentV2InboxOutcome,
  encodeExperimentV2EventPayload,
  reconstructExperimentV2Event,
  StoredExperimentV2EventIntegrityError,
  type DecodedExperimentV2InboxOutcome,
  type StoredExperimentV2InboxOutcomeColumns,
} from '../experiment-v2-stored-integration-event.js';

const SERVER_ACTOR_TYPE = 'server';
const STORED_SCHEMA_VERSION_V1 = 'v1';
const storedSnapshotAjv = new Ajv({ allErrors: true, strict: false });
const storedBranchFrameValidator = storedSnapshotAjv.compile<PaperImplementationExperimentV2BranchFrame>(
  paperImplementationExperimentV2BranchFrameSchema,
);
const storedWorkOrderRevisionValidator = storedSnapshotAjv.compile<
  PaperImplementationExperimentV2WorkOrderRevisionSnapshot
>(paperImplementationExperimentV2WorkOrderRevisionSnapshotSchema);
const storedCellValidator = storedSnapshotAjv.compile<PaperImplementationExperimentV2ExactCellInput>(
  paperImplementationExperimentV2ExactCellInputSchema,
);
type SpineClient = PrismaClient | Prisma.TransactionClient;

export class PrismaPaperImplementationExperimentSpineV2Repository
implements PaperImplementationExperimentSpineV2Repository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBranch(
    implementationProjectId: string,
    validationCycleId: string,
    branchKey: string,
  ): Promise<PaperImplementationExperimentWorkOrderBranchV2 | null> {
    const row = await this.prisma.paperImplementationExperimentWorkOrderBranchV2.findFirst({
      where: {
        implementationProjectId,
        validationCycleId,
        branchKey,
      },
    });
    return row ? mapBranch(row) : null;
  }

  async findAdmissionByBusinessKey(
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<PaperImplementationExperimentV2AdmissionBundle | null> {
    return loadAdmissionBundleByBusinessKey(
      this.prisma,
      branchId,
      businessIdempotencyKey,
    );
  }

  async findRevisionBundle(
    branchId: string,
    workOrderRevisionId: string,
  ): Promise<PaperImplementationExperimentV2AdmissionBundle | null> {
    return loadAdmissionBundleByRevision(this.prisma, branchId, workOrderRevisionId);
  }

  async commitAdmission(
    input: PaperImplementationExperimentV2CommitAdmissionInput,
    serializationRetry = 0,
  ): Promise<PaperImplementationExperimentV2AdmissionBundle> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const branchRow = await transaction.paperImplementationExperimentWorkOrderBranchV2.findFirst({
          where: {
            validationCycleId: input.branch.validation_cycle_id,
            branchKey: input.branch.branch_key,
          },
        });

        const replay = branchRow
          ? await loadAdmissionBundleByBusinessKey(
            transaction,
            branchRow.id,
            input.admission.business_idempotency_key,
          )
          : null;
        if (replay) {
          if (sameAdmissionBundle(replay, input)) {
            return replay;
          }
          throw constraint(
            'ADMISSION_IDEMPOTENCY_CONFLICT',
            'Admission business key was reused with changed revision, cells, or event payload',
          );
        }

        await assertCycleOpen(transaction, input.branch.validation_cycle_id);
        assertAdmissionScope(input, branchRow);

        let persistedBranch = branchRow;
        if (!persistedBranch) {
          persistedBranch = await transaction.paperImplementationExperimentWorkOrderBranchV2.create({
            data: {
              id: input.branch.branch_id,
              implementationProjectId: input.branch.implementation_project_id,
              validationCycleId: input.branch.validation_cycle_id,
              branchKey: input.branch.branch_key,
              branchFrameSchemaVersion: STORED_SCHEMA_VERSION_V1,
              branchFrameJson: toInputJson(input.branch.branch_frame),
              branchFrameHash: input.branch.branch_frame_hash,
              stateVersion: 0,
              currentRevisionId: null,
              currentRevisionSequence: null,
              headVersion: 0,
              headRevisionId: null,
              headRevisionSequence: null,
              headRunId: null,
              headRunManifestHash: null,
              headEventId: null,
              createdAt: new Date(input.branch.created_at),
              updatedAt: new Date(input.branch.created_at),
            },
          });
        }

        await transaction.paperImplementationExperimentWorkOrderRevisionV2.create({
          data: {
            id: input.revision.work_order_revision_id,
            branchId: input.branch.branch_id,
            revisionSequence: input.revision.revision_sequence,
            parentRevisionId: persistedBranch.currentRevisionId,
            workOrderSnapshotSchemaVersion: STORED_SCHEMA_VERSION_V1,
            workOrderSnapshotJson: toInputJson(input.revision.work_order_revision),
            contentHash: input.revision.content_hash,
            cellPlanHash: input.revision.cell_plan_hash,
            approvedPlanHash: input.revision.approved_plan_hash,
            createdByActorType: SERVER_ACTOR_TYPE,
            createdByActorId: null,
            createdAt: new Date(input.revision.created_at),
          },
        });

        await transaction.paperImplementationExperimentWorkOrderRevisionCellV2.createMany({
          data: orderedCells(input.cells).map((cell) => ({
            id: cell.work_order_cell_id,
            revisionId: cell.work_order_revision_id,
            ordinal: cell.ordinal,
            cellKey: cell.cell_key,
            seed: cell.seed,
            repeatIndex: cell.repeat_index,
            parametersSchemaVersion: STORED_SCHEMA_VERSION_V1,
            parametersJson: toInputJson(cell.parameters),
            requiredResultSchemaVersion: STORED_SCHEMA_VERSION_V1,
            requiredResultContractJson: toInputJson(cell.required_result_contract),
            cellHash: cell.cell_hash,
            createdAt: new Date(input.revision.created_at),
          })),
        });

        await transaction.paperImplementationExperimentWorkOrderAdmissionV2.create({
          data: {
            id: input.admission.admission_id,
            branchId: input.branch.branch_id,
            revisionId: input.revision.work_order_revision_id,
            approvedPlanHash: input.admission.approved_plan_hash,
            businessIdempotencyKey: input.admission.business_idempotency_key,
            admittedByActorType: input.admission.admitted_by,
            admittedByActorId: null,
            admittedAt: new Date(input.admission.admitted_at),
          },
        });

        const branchAdvance = await transaction.paperImplementationExperimentWorkOrderBranchV2.updateMany({
          where: {
            id: input.branch.branch_id,
            stateVersion: input.expected_branch_state_version ?? 0,
            currentRevisionId: persistedBranch.currentRevisionId,
          },
          data: {
            branchFrameSchemaVersion: STORED_SCHEMA_VERSION_V1,
            branchFrameJson: toInputJson(input.branch.branch_frame),
            branchFrameHash: input.branch.branch_frame_hash,
            stateVersion: input.branch.state_version,
            currentRevisionId: input.revision.work_order_revision_id,
            currentRevisionSequence: input.revision.revision_sequence,
            updatedAt: new Date(input.branch.updated_at),
          },
        });
        if (branchAdvance.count !== 1) {
          throw constraint(
            'BRANCH_CAS_CONFLICT',
            `Branch admission CAS failed: ${input.branch.branch_id}`,
          );
        }

        await transaction.paperImplementationExperimentIntegrationOutboxV2.create({
          data: piOutboxCreateData(input.outbox),
        });

        const committed = await loadAdmissionBundleByRevision(
          transaction,
          input.branch.branch_id,
          input.revision.work_order_revision_id,
        );
        if (!committed) {
          throw constraint(
            'INTEGRATION_PREREQUISITE_NOT_READY',
            'Committed admission could not be read back inside its transaction',
          );
        }
        return committed;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2034'
        && serializationRetry < 2
      ) {
        return this.commitAdmission(input, serializationRetry + 1);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // A concurrent identical command can lose on any of the branch,
        // revision, admission, or outbox unique constraints before its
        // transaction observes the winner. Re-read after rollback and
        // converge only when the committed semantic command is exact.
        const branch = await this.prisma.paperImplementationExperimentWorkOrderBranchV2.findFirst({
          where: {
            validationCycleId: input.branch.validation_cycle_id,
            branchKey: input.branch.branch_key,
          },
        });
        const replay = branch
          ? await loadAdmissionBundleByBusinessKey(
            this.prisma,
            branch.id,
            input.admission.business_idempotency_key,
          )
          : null;
        if (replay && sameAdmissionBundle(replay, input)) {
          return replay;
        }
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw constraint(
          'BRANCH_CAS_CONFLICT',
          'Serializable admission did not converge after bounded retry',
        );
      }
      throw mapPiWriteError(error, 'ADMISSION_IDEMPOTENCY_CONFLICT');
    }
  }

  async findInboxByEvent(
    consumerName: string,
    eventId: string,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2 | null> {
    const row = await this.prisma.paperImplementationExperimentIntegrationInboxV2.findFirst({
      where: { consumerName, eventId },
    });
    return row ? mapPiInbox(row) : null;
  }

  async findInboxByBusinessKey(
    consumerName: string,
    implementationProjectId: string,
    validationCycleId: string,
    branchId: string,
    businessIdempotencyKey: string,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2 | null> {
    const row = await this.prisma.paperImplementationExperimentIntegrationInboxV2.findFirst({
      where: {
        consumerName,
        implementationProjectId,
        validationCycleId,
        branchId,
        businessIdempotencyKey,
      },
    });
    return row ? mapPiInbox(row) : null;
  }

  async verifyProcessedHeadReplay(
    consumerName: string,
    sourceEvent: RunManifestFrozenEventV1,
  ): Promise<PaperImplementationExperimentWorkOrderBranchV2> {
    return this.prisma.$transaction(async (transaction) => {
      const inboxRow = await transaction.paperImplementationExperimentIntegrationInboxV2.findFirst({
        where: {
          consumerName,
          eventId: sourceEvent.event_id,
          status: 'processed',
          outcome: 'processed',
        },
      });
      if (!inboxRow) {
        throw constraint(
          'BRANCH_HEAD_SCOPE_CONFLICT',
          `Processed PI head receipt is missing during replay: ${sourceEvent.event_id}`,
        );
      }
      const inbox = mapPiInbox(inboxRow);
      if (
        inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(sourceEvent)
        || inbox.source_event_id !== sourceEvent.event_id
      ) {
        throw constraint(
          'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
          `Processed PI head receipt drifted during replay: ${sourceEvent.event_id}`,
        );
      }

      const authority = await loadHeadAuthority(transaction, sourceEvent);
      if (!authority) {
        throw constraint(
          'BRANCH_HEAD_SCOPE_CONFLICT',
          `Processed PI head authority is missing during replay: ${sourceEvent.event_id}`,
        );
      }
      const branch = mapBranch(authority.branch, 'BRANCH_HEAD_SCOPE_CONFLICT');
      assertHeadScope(authority, sourceEvent, {
        ...branch,
        head_run_id: sourceEvent.payload.run_id,
        head_run_manifest_hash: sourceEvent.payload.run_manifest_hash,
        head_source_event_id: sourceEvent.event_id,
      });
      await assertStoredHeadAdvanceOutboxBinding(transaction, sourceEvent);
      await assertStoredProcessedHeadBinding(transaction, authority.branch, sourceEvent);
      return branch;
    });
  }

  async recordInboxOutcome(
    inbox: PaperImplementationExperimentIntegrationInboxV2,
    sourceEvent: PaperImplementationInboxSourceEventV2,
  ): Promise<PaperImplementationExperimentIntegrationInboxV2> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existing = await findPiInboxReplay(transaction, inbox, sourceEvent);
        if (existing) {
          return existing;
        }
        const row = await transaction.paperImplementationExperimentIntegrationInboxV2.create({
          data: piInboxCreateData(inbox, sourceEvent),
        });
        return mapPiInbox(row);
      });
    } catch (error) {
      throw mapPiWriteError(error, 'INTEGRATION_EVENT_PAYLOAD_CONFLICT');
    }
  }

  async commitHeadAdvance(
    input: PaperImplementationExperimentV2CommitHeadInput,
    sourceEvent: RunManifestFrozenEventV1,
    serializationRetry = 0,
  ): Promise<PaperImplementationExperimentV2CommitHeadInput> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const existingInbox = await findPiInboxReplay(transaction, input.inbox, sourceEvent);
        if (existingInbox) {
          const authority = await loadHeadAuthority(transaction, sourceEvent);
          if (!authority) {
            throw constraint(
              'INTEGRATION_PREREQUISITE_NOT_READY',
              'Processed head replay no longer has its exact PI authority',
            );
          }
          assertHeadScope(authority, sourceEvent, input.branch);
          await assertStoredProcessedHeadBinding(transaction, authority.branch, sourceEvent);
          const existingOutbox = await transaction.paperImplementationExperimentIntegrationOutboxV2.findFirst({
            where: {
              workOrderRevisionId: sourceEvent.work_order_revision_id,
              eventType: input.outbox.event.event_type,
            },
          });
          if (
            !existingOutbox
            || existingOutbox.eventId !== input.outbox.event.event_id
            || existingOutbox.transitionKey !== input.outbox.aggregate_transition_key
            || existingOutbox.payloadHash !== input.outbox.event.payload_hash
            || serverHashExperimentV2EventEnvelope(storedEvent(existingOutbox))
              !== serverHashExperimentV2EventEnvelope(input.outbox.event)
          ) {
            throw constraint(
              'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
              'Head replay inbox exists without the exact BranchHeadAdvanced outbox event',
            );
          }
          return input;
        }

        await assertCycleOpen(transaction, sourceEvent.validation_cycle_id);
        const authority = await loadHeadAuthority(transaction, sourceEvent);
        if (!authority) {
          throw constraint(
            'INTEGRATION_PREREQUISITE_NOT_READY',
            'Branch, admitted revision, or exact cells are not committed yet',
          );
        }
        assertHeadScope(authority, sourceEvent, input.branch);

        const advance = await transaction.paperImplementationExperimentWorkOrderBranchV2.updateMany({
          where: {
            id: input.branch.branch_id,
            stateVersion: input.expected_branch_state_version,
            headVersion: { lt: EXPERIMENT_V2_INT32_MAX },
            currentRevisionId: sourceEvent.work_order_revision_id,
            currentRevisionSequence: sourceEvent.branch_revision_sequence,
          },
          data: {
            stateVersion: input.branch.state_version,
            headVersion: { increment: 1 },
            headRevisionId: sourceEvent.work_order_revision_id,
            headRevisionSequence: sourceEvent.branch_revision_sequence,
            headRunId: input.branch.head_run_id,
            headRunManifestHash: input.branch.head_run_manifest_hash,
            headEventId: input.branch.head_source_event_id,
            updatedAt: new Date(input.branch.updated_at),
          },
        });
        if (advance.count !== 1) {
          throw constraint(
            'BRANCH_HEAD_CAS_CONFLICT',
            `Branch head CAS failed: ${input.branch.branch_id}`,
          );
        }

        await transaction.paperImplementationExperimentIntegrationInboxV2.create({
          data: piInboxCreateData(input.inbox, sourceEvent),
        });
        await transaction.paperImplementationExperimentIntegrationOutboxV2.create({
          data: piOutboxCreateData(input.outbox),
        });
        return input;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2034'
        && serializationRetry < 2
      ) {
        return this.commitHeadAdvance(input, sourceEvent, serializationRetry + 1);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw constraint(
          'BRANCH_HEAD_CAS_CONFLICT',
          'Serializable head advance did not converge after bounded retry',
        );
      }
      throw mapPiWriteError(error, 'INTEGRATION_EVENT_PAYLOAD_CONFLICT');
    }
  }

  async claimOutbox(input: ExperimentV2RelayClaimInput): Promise<ExperimentV2RelayClaim[]> {
    const claimedAt = new Date(input.claimed_at);
    const leaseExpiresAt = new Date(input.lease_expires_at);
    return this.prisma.$transaction(async (transaction) => {
      const candidates = await transaction.paperImplementationExperimentIntegrationOutboxV2.findMany({
        where: relayReadyWhere(claimedAt),
        orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
        take: input.limit,
        select: { id: true },
      });
      const claims: ExperimentV2RelayClaim[] = [];
      for (const candidate of candidates) {
        const claimed = await transaction.paperImplementationExperimentIntegrationOutboxV2.updateMany({
          where: { id: candidate.id, ...relayReadyWhere(claimedAt) },
          data: {
            relayStatus: 'leased',
            relayAttemptCount: { increment: 1 },
            relayLeaseOwner: input.lease_owner,
            relayLeaseExpiresAt: leaseExpiresAt,
            updatedAt: claimedAt,
          },
        });
        if (claimed.count !== 1) {
          continue;
        }
        const row = await transaction.paperImplementationExperimentIntegrationOutboxV2.findUniqueOrThrow({
          where: { id: candidate.id },
        });
        try {
          claims.push(mapPiRelayClaim(row));
        } catch (error) {
          if (
            !(error instanceof ExperimentSpineV2RepositoryConstraintError)
            || error.reasonCode !== 'INTEGRATION_EVENT_PAYLOAD_CONFLICT'
          ) {
            throw error;
          }
          const terminalized = await transaction.paperImplementationExperimentIntegrationOutboxV2.updateMany({
            where: {
              id: candidate.id,
              relayStatus: 'leased',
              relayLeaseOwner: input.lease_owner,
            },
            data: {
              relayStatus: 'terminal',
              relayLeaseOwner: null,
              relayLeaseExpiresAt: null,
              relayNextAttemptAt: null,
              lastRelayErrorCode: 'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
              updatedAt: claimedAt,
            },
          });
          if (terminalized.count !== 1) {
            throw constraint(
              'OUTBOX_LEASE_CONFLICT',
              `PI invalid outbox could not be terminalized: ${candidate.id}`,
            );
          }
        }
      }
      return claims;
    });
  }

  async markOutboxDelivered(
    outboxId: string,
    leaseOwner: string,
    deliveredAt: string,
  ): Promise<void> {
    const timestamp = new Date(deliveredAt);
    const result = await this.prisma.paperImplementationExperimentIntegrationOutboxV2.updateMany({
      where: {
        id: outboxId,
        relayLeaseOwner: leaseOwner,
        relayStatus: 'leased',
        deliveredAt: null,
      },
      data: {
        relayStatus: 'delivered',
        publishedAt: timestamp,
        deliveredAt: timestamp,
        relayLeaseOwner: null,
        relayLeaseExpiresAt: null,
        relayNextAttemptAt: null,
        lastRelayErrorCode: null,
        updatedAt: timestamp,
      },
    });
    if (result.count !== 1) {
      throw constraint('OUTBOX_LEASE_CONFLICT', `PI outbox lease was lost: ${outboxId}`);
    }
  }

  async markOutboxTerminal(input: ExperimentV2RelayTerminalInput): Promise<void> {
    const timestamp = new Date(input.terminal_at);
    const result = await this.prisma.paperImplementationExperimentIntegrationOutboxV2.updateMany({
      where: {
        id: input.outbox_id,
        relayLeaseOwner: input.lease_owner,
        relayStatus: 'leased',
        deliveredAt: null,
      },
      data: {
        relayStatus: 'terminal',
        relayLeaseOwner: null,
        relayLeaseExpiresAt: null,
        relayNextAttemptAt: null,
        lastRelayErrorCode: input.error_code,
        updatedAt: timestamp,
      },
    });
    if (result.count !== 1) {
      throw constraint(
        'OUTBOX_LEASE_CONFLICT',
        `PI outbox lease cannot be terminalized: ${input.outbox_id}`,
      );
    }
  }

  async releaseOutbox(input: ExperimentV2RelayReleaseInput): Promise<void> {
    const releasedAt = new Date(input.released_at);
    const result = await this.prisma.paperImplementationExperimentIntegrationOutboxV2.updateMany({
      where: {
        id: input.outbox_id,
        relayLeaseOwner: input.lease_owner,
        relayStatus: 'leased',
        deliveredAt: null,
      },
      data: {
        relayStatus: 'pending',
        relayLeaseOwner: null,
        relayLeaseExpiresAt: null,
        relayNextAttemptAt: new Date(input.next_attempt_at),
        lastRelayErrorCode: input.error_code,
        updatedAt: releasedAt,
      },
    });
    if (result.count !== 1) {
      throw constraint(
        'OUTBOX_LEASE_CONFLICT',
        `PI outbox lease cannot be released: ${input.outbox_id}`,
      );
    }
  }
}

interface StoredPiHeadAuthority {
  branch: BranchRow;
  revision: RevisionRow;
  cells: CellRow[];
  admission: AdmissionRow;
  admissionOutbox: PiOutboxRow;
}

async function loadHeadAuthority(
  client: SpineClient,
  sourceEvent: RunManifestFrozenEventV1,
): Promise<StoredPiHeadAuthority | null> {
  const [branch, revision, cells, admission, admissionOutbox] = await Promise.all([
    client.paperImplementationExperimentWorkOrderBranchV2.findUnique({
      where: { id: sourceEvent.branch_id },
    }),
    client.paperImplementationExperimentWorkOrderRevisionV2.findFirst({
      where: {
        id: sourceEvent.work_order_revision_id,
        branchId: sourceEvent.branch_id,
      },
    }),
    client.paperImplementationExperimentWorkOrderRevisionCellV2.findMany({
      where: { revisionId: sourceEvent.work_order_revision_id },
      orderBy: { ordinal: 'asc' },
    }),
    client.paperImplementationExperimentWorkOrderAdmissionV2.findFirst({
      where: {
        branchId: sourceEvent.branch_id,
        revisionId: sourceEvent.work_order_revision_id,
      },
    }),
    client.paperImplementationExperimentIntegrationOutboxV2.findFirst({
      where: {
        workOrderRevisionId: sourceEvent.work_order_revision_id,
        eventType: 'WorkOrderRevisionAdmitted',
        schemaVersion: 'v1',
        producerDomain: 'PaperImplementation',
      },
    }),
  ]);
  return branch && revision && cells.length > 0 && admission && admissionOutbox
    ? { branch, revision, cells, admission, admissionOutbox }
    : null;
}

async function loadAdmissionBundleByBusinessKey(
  client: SpineClient,
  branchId: string,
  businessIdempotencyKey: string,
): Promise<PaperImplementationExperimentV2AdmissionBundle | null> {
  const admission = await client.paperImplementationExperimentWorkOrderAdmissionV2.findFirst({
    where: { branchId, businessIdempotencyKey },
  });
  return admission
    ? loadAdmissionBundle(client, branchId, admission.revisionId, admission)
    : null;
}

async function loadAdmissionBundleByRevision(
  client: SpineClient,
  branchId: string,
  workOrderRevisionId: string,
): Promise<PaperImplementationExperimentV2AdmissionBundle | null> {
  const admission = await client.paperImplementationExperimentWorkOrderAdmissionV2.findFirst({
    where: { branchId, revisionId: workOrderRevisionId },
  });
  return admission
    ? loadAdmissionBundle(client, branchId, workOrderRevisionId, admission)
    : null;
}

async function loadAdmissionBundle(
  client: SpineClient,
  branchId: string,
  workOrderRevisionId: string,
  admission: AdmissionRow,
): Promise<PaperImplementationExperimentV2AdmissionBundle | null> {
  const [branch, revision, cells, outbox] = await Promise.all([
    client.paperImplementationExperimentWorkOrderBranchV2.findUnique({
      where: { id: branchId },
    }),
    client.paperImplementationExperimentWorkOrderRevisionV2.findFirst({
      where: { id: workOrderRevisionId, branchId },
    }),
    client.paperImplementationExperimentWorkOrderRevisionCellV2.findMany({
      where: { revisionId: workOrderRevisionId },
      orderBy: { ordinal: 'asc' },
    }),
    client.paperImplementationExperimentIntegrationOutboxV2.findFirst({
      where: {
        workOrderRevisionId,
        eventType: 'WorkOrderRevisionAdmitted',
        schemaVersion: 'v1',
        producerDomain: 'PaperImplementation',
      },
    }),
  ]);
  if (!branch || !revision || !outbox || cells.length === 0) {
    return null;
  }
  return mapAdmissionBundleAuthority(branch, revision, cells, admission, outbox);
}

function mapAdmissionBundleAuthority(
  branchRow: BranchRow,
  revisionRow: RevisionRow,
  cellRows: CellRow[],
  admissionRow: AdmissionRow,
  outboxRow: PiOutboxRow,
  reasonCode: 'BRANCH_REVISION_CONFLICT' | 'BRANCH_HEAD_SCOPE_CONFLICT' = 'BRANCH_REVISION_CONFLICT',
): PaperImplementationExperimentV2AdmissionBundle {
  const branch = mapBranch(
    branchRow,
    reasonCode === 'BRANCH_HEAD_SCOPE_CONFLICT'
      ? 'BRANCH_HEAD_SCOPE_CONFLICT'
      : 'BRANCH_SCOPE_CONFLICT',
  );
  const revision = mapRevision(revisionRow, reasonCode);
  const cells = cellRows.map((row) => mapCell(row, reasonCode));
  const admission = mapAdmission(admissionRow);
  const outbox = mapPiOutbox(outboxRow);
  if (outbox.event.event_type !== 'WorkOrderRevisionAdmitted') {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `Stored admission outbox has the wrong event type: ${outbox.outbox_id}`,
    );
  }
  const admissionOutbox = { ...outbox, event: outbox.event };

  assertStoredPlanHashes(branch, revision, cells, reasonCode);
  if (
    revision.branch_id !== branch.branch_id
    || cells.some((cell, index) => (
      cell.work_order_revision_id !== revision.work_order_revision_id
      || cell.ordinal !== index + 1
    ))
    || admissionRow.branchId !== branch.branch_id
    || admission.work_order_revision_id !== revision.work_order_revision_id
    || admission.approved_plan_hash !== revision.approved_plan_hash
  ) {
    throw constraint(
      reasonCode,
      `Stored PI admission authority bindings drifted: ${admission.admission_id}`,
    );
  }

  assertStoredAdmissionEventBindings({
    branch,
    revision,
    cells,
    admission,
    outbox: admissionOutbox,
  });
  return { branch, revision, cells, admission, outbox: admissionOutbox };
}

function mapBranch(
  row: BranchRow,
  reasonCode: 'BRANCH_SCOPE_CONFLICT' | 'BRANCH_HEAD_SCOPE_CONFLICT' = 'BRANCH_SCOPE_CONFLICT',
): PaperImplementationExperimentWorkOrderBranchV2 {
  const branchFrame = decodeStoredJson(
    storedBranchFrameValidator,
    row.branchFrameJson,
    reasonCode,
    `PI branch frame ${row.id}`,
  );
  assertStoredSchemaVersion(
    row.branchFrameSchemaVersion,
    branchFrame.frame_schema_version,
    reasonCode,
    'PI branch frame',
  );
  if (serverHashPaperImplementationExperimentV2BranchFrame(branchFrame) !== row.branchFrameHash) {
    throw constraint(reasonCode, `PI branch frame canonical hash mismatch: ${row.id}`);
  }
  return {
    branch_id: row.id,
    implementation_project_id: row.implementationProjectId,
    validation_cycle_id: row.validationCycleId,
    branch_key: row.branchKey,
    branch_frame: branchFrame,
    branch_frame_hash: row.branchFrameHash,
    state_version: row.stateVersion,
    current_admitted_revision_id: row.currentRevisionId,
    current_admitted_revision_sequence: row.currentRevisionSequence,
    head_run_id: row.headRunId,
    head_run_manifest_hash: row.headRunManifestHash,
    head_source_event_id: row.headEventId,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
  };
}

function mapRevision(
  row: RevisionRow,
  reasonCode: 'BRANCH_REVISION_CONFLICT' | 'BRANCH_HEAD_SCOPE_CONFLICT' = 'BRANCH_REVISION_CONFLICT',
): PaperImplementationExperimentWorkOrderRevisionV2 {
  const snapshot = decodeStoredJson(
    storedWorkOrderRevisionValidator,
    row.workOrderSnapshotJson,
    reasonCode,
    `PI WorkOrder revision snapshot ${row.id}`,
  );
  assertStoredSchemaVersion(
    row.workOrderSnapshotSchemaVersion,
    snapshot.work_order_schema_version,
    reasonCode,
    'PI WorkOrder snapshot',
  );
  if (serverHashPaperImplementationExperimentV2WorkOrderRevision(snapshot) !== row.contentHash) {
    throw constraint(reasonCode, `PI WorkOrder revision canonical hash mismatch: ${row.id}`);
  }
  return {
    work_order_revision_id: row.id,
    branch_id: row.branchId,
    revision_sequence: row.revisionSequence,
    work_order_revision: snapshot,
    content_hash: row.contentHash,
    cell_plan_hash: row.cellPlanHash,
    approved_plan_hash: row.approvedPlanHash,
    created_at: row.createdAt.toISOString(),
  };
}

function mapCell(
  row: CellRow,
  reasonCode: 'BRANCH_REVISION_CONFLICT' | 'BRANCH_HEAD_SCOPE_CONFLICT' = 'BRANCH_REVISION_CONFLICT',
): PaperImplementationExperimentWorkOrderRevisionCellV2 {
  assertStoredSchemaVersion(
    row.parametersSchemaVersion,
    STORED_SCHEMA_VERSION_V1,
    reasonCode,
    'PI WorkOrder cell parameters',
  );
  assertStoredSchemaVersion(
    row.requiredResultSchemaVersion,
    STORED_SCHEMA_VERSION_V1,
    reasonCode,
    'PI WorkOrder cell required-result contract',
  );
  const exactCell = decodeStoredJson(
    storedCellValidator,
    {
      cell_key: row.cellKey,
      seed: row.seed,
      repeat_index: row.repeatIndex,
      parameters: row.parametersJson,
      required_result_contract: row.requiredResultContractJson,
    },
    reasonCode,
    `PI WorkOrder cell ${row.id}`,
  );
  if (serverHashPaperImplementationExperimentV2Cell(exactCell) !== row.cellHash) {
    throw constraint(reasonCode, `PI WorkOrder cell canonical hash mismatch: ${row.id}`);
  }
  return {
    work_order_cell_id: row.id,
    work_order_revision_id: row.revisionId,
    ordinal: row.ordinal,
    ...exactCell,
    cell_hash: row.cellHash,
  };
}

function assertStoredPlanHashes(
  branch: PaperImplementationExperimentWorkOrderBranchV2,
  revision: PaperImplementationExperimentWorkOrderRevisionV2,
  cells: PaperImplementationExperimentWorkOrderRevisionCellV2[],
  reasonCode: 'BRANCH_REVISION_CONFLICT' | 'BRANCH_HEAD_SCOPE_CONFLICT',
): void {
  const expectedCellPlanHash = serverHashPaperImplementationExperimentV2CellPlan(cells);
  if (expectedCellPlanHash !== revision.cell_plan_hash) {
    throw constraint(
      reasonCode,
      `PI WorkOrder cell-plan canonical hash mismatch: ${revision.work_order_revision_id}`,
    );
  }
  const expectedApprovedPlanHash = serverHashPaperImplementationExperimentV2ApprovedPlan({
    branch_frame_hash: branch.branch_frame_hash,
    work_order_revision_hash: revision.content_hash,
    cell_plan_hash: expectedCellPlanHash,
  });
  if (expectedApprovedPlanHash !== revision.approved_plan_hash) {
    throw constraint(
      reasonCode,
      `PI WorkOrder approved-plan canonical hash mismatch: ${revision.work_order_revision_id}`,
    );
  }
}

function assertStoredAdmissionEventBindings(
  bundle: PaperImplementationExperimentV2AdmissionBundle,
): void {
  const event = bundle.outbox.event;
  if (
    event.event_type !== 'WorkOrderRevisionAdmitted'
    || event.producer_domain !== 'PaperImplementation'
    || event.business_idempotency_key !== bundle.admission.business_idempotency_key
    || !sameJson(eventScope(event), {
      implementation_project_id: bundle.branch.implementation_project_id,
      validation_cycle_id: bundle.branch.validation_cycle_id,
      branch_id: bundle.branch.branch_id,
      branch_key: bundle.branch.branch_key,
      work_order_revision_id: bundle.revision.work_order_revision_id,
      work_order_revision_hash: bundle.revision.content_hash,
      branch_revision_sequence: bundle.revision.revision_sequence,
      cell_plan_hash: bundle.revision.cell_plan_hash,
      approved_plan_hash: bundle.revision.approved_plan_hash,
    })
    || !sameJson(event.payload, {
      admission_id: bundle.admission.admission_id,
      branch_frame_hash: bundle.branch.branch_frame_hash,
      work_order_revision: bundle.revision.work_order_revision,
      readiness_attestation_id: bundle.revision.work_order_revision.readiness_attestation_id,
      readiness_attestation_hash: bundle.revision.work_order_revision.readiness_attestation_hash,
      asset_dependencies: bundle.revision.work_order_revision.asset_dependencies,
      exact_cells: bundle.cells.map((cell) => ({
        ordinal: cell.ordinal,
        work_order_cell_id: cell.work_order_cell_id,
        cell_key: cell.cell_key,
        cell_hash: cell.cell_hash,
        seed: cell.seed,
        repeat_index: cell.repeat_index,
        parameters: cell.parameters,
        required_result_contract: cell.required_result_contract,
      })),
    })
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `Stored WorkOrderRevisionAdmitted event drifted from PI authority: ${event.event_id}`,
    );
  }
}

function mapAdmission(row: AdmissionRow): PaperImplementationExperimentWorkOrderAdmissionV2 {
  return {
    admission_id: row.id,
    work_order_revision_id: row.revisionId,
    approved_plan_hash: row.approvedPlanHash,
    business_idempotency_key: row.businessIdempotencyKey,
    admitted_by: row.admittedByActorId ?? row.admittedByActorType,
    admitted_at: row.admittedAt.toISOString(),
  };
}

function mapPiInbox(row: PiInboxRow): PaperImplementationExperimentIntegrationInboxV2 {
  const sourceEvent = storedEvent(row);
  const storedOutcome = storedInboxOutcome(row);
  if (
    sourceEvent.event_type !== 'RunManifestFrozen'
    && sourceEvent.event_type !== 'RunEvidenceUnitRegistered'
    && sourceEvent.event_type !== 'ValidationCycleClosed@v1'
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `PI inbox contains an unsupported source event: ${row.id}`,
    );
  }
  return {
    inbox_id: row.id,
    consumer_name: row.consumerName,
    source_event_id: row.eventId,
    business_idempotency_key: row.businessIdempotencyKey,
    payload_hash: row.payloadHash,
    source_event_hash: serverHashExperimentV2EventEnvelope(sourceEvent),
    scope: eventScope(sourceEvent),
    outcome: storedOutcome.outcome,
    reason_code: storedOutcome.reason_code,
    processed_at: row.processedAt.toISOString(),
  };
}

function mapPiOutbox(row: PiOutboxRow): PaperImplementationExperimentIntegrationOutboxV2 {
  const event = storedEvent(row);
  if (
    event.event_type === 'RunManifestFrozen'
    || event.event_type === 'EvidenceCandidateQualified'
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `PI outbox contains an EF-owned event: ${row.id}`,
    );
  }
  const aggregate = expectedPiOutboxAggregate(event);
  if (row.aggregateType !== aggregate.type || row.aggregateId !== aggregate.id) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `PI outbox aggregate binding drifted: ${row.id}`,
    );
  }
  return {
    outbox_id: row.id,
    aggregate_transition_key: row.transitionKey,
    event,
    created_at: row.createdAt.toISOString(),
  };
}

function piInboxCreateData(
  inbox: PaperImplementationExperimentIntegrationInboxV2,
  sourceEvent: PaperImplementationInboxSourceEventV2,
) {
  assertInboxMatchesEvent(inbox, sourceEvent);
  const stored = encodedEvent(sourceEvent);
  const storedOutcome = storedInboxOutcome({
    status: inbox.outcome === 'retryable' ? 'retryable' : 'processed',
    outcome: inbox.outcome,
    reasonCode: inbox.reason_code,
  });
  return {
    id: inbox.inbox_id,
    consumerName: inbox.consumer_name,
    eventId: sourceEvent.event_id,
    eventType: sourceEvent.event_type,
    schemaVersion: sourceEvent.schema_version,
    producerDomain: sourceEvent.producer_domain,
    occurredAt: new Date(sourceEvent.occurred_at),
    correlationId: sourceEvent.correlation_id,
    causationId: sourceEvent.causation_id,
    businessIdempotencyKey: sourceEvent.business_idempotency_key,
    implementationProjectId: sourceEvent.implementation_project_id,
    validationCycleId: sourceEvent.validation_cycle_id,
    branchId: sourceEvent.branch_id,
    branchKey: sourceEvent.branch_key,
    workOrderRevisionId: sourceEvent.work_order_revision_id,
    revisionSequence: sourceEvent.branch_revision_sequence,
    workOrderRevisionHash: sourceEvent.work_order_revision_hash,
    cellPlanHash: sourceEvent.cell_plan_hash,
    approvedPlanHash: sourceEvent.approved_plan_hash,
    runId: inboxRunColumns(sourceEvent).run_id,
    runManifestHash: inboxRunColumns(sourceEvent).run_manifest_hash,
    eventPayloadJson: toInputJson(stored.payload),
    payloadHash: sourceEvent.payload_hash,
    eventEnvelopeHash: stored.envelope_hash,
    status: storedOutcome.status,
    outcome: storedOutcome.outcome,
    reasonCode: storedOutcome.reason_code,
    receivedAt: new Date(inbox.processed_at ?? sourceEvent.occurred_at),
    processedAt: new Date(inbox.processed_at ?? sourceEvent.occurred_at),
  } satisfies Prisma.PaperImplementationExperimentIntegrationInboxV2UncheckedCreateInput;
}

function piOutboxCreateData(outbox: PaperImplementationExperimentIntegrationOutboxV2) {
  const event = outbox.event;
  const stored = encodedEvent(event);
  const aggregate = expectedPiOutboxAggregate(event);
  const run = eventRunColumns(event);
  return {
    id: outbox.outbox_id,
    eventId: event.event_id,
    aggregateType: aggregate.type,
    aggregateId: aggregate.id,
    transitionKey: outbox.aggregate_transition_key,
    eventType: event.event_type,
    schemaVersion: event.schema_version,
    producerDomain: event.producer_domain,
    occurredAt: new Date(event.occurred_at),
    correlationId: event.correlation_id,
    causationId: event.causation_id,
    businessIdempotencyKey: event.business_idempotency_key,
    implementationProjectId: event.implementation_project_id,
    validationCycleId: event.validation_cycle_id,
    branchId: event.branch_id,
    branchKey: event.branch_key,
    workOrderRevisionId: event.work_order_revision_id,
    revisionSequence: event.branch_revision_sequence,
    workOrderRevisionHash: event.work_order_revision_hash,
    cellPlanHash: event.cell_plan_hash,
    approvedPlanHash: event.approved_plan_hash,
    runId: run.run_id,
    runManifestHash: run.run_manifest_hash,
    eventPayloadJson: toInputJson(stored.payload),
    payloadHash: event.payload_hash,
    eventEnvelopeHash: stored.envelope_hash,
    relayStatus: 'pending',
    relayAttemptCount: 0,
    createdAt: new Date(outbox.created_at),
    updatedAt: new Date(outbox.created_at),
  } satisfies Prisma.PaperImplementationExperimentIntegrationOutboxV2UncheckedCreateInput;
}

async function findPiInboxReplay(
  client: SpineClient,
  inbox: PaperImplementationExperimentIntegrationInboxV2,
  sourceEvent: PaperImplementationInboxSourceEventV2,
): Promise<PaperImplementationExperimentIntegrationInboxV2 | null> {
  const byEvent = await client.paperImplementationExperimentIntegrationInboxV2.findFirst({
    where: { consumerName: inbox.consumer_name, eventId: sourceEvent.event_id },
  });
  const byBusiness = byEvent ?? await client.paperImplementationExperimentIntegrationInboxV2.findFirst({
    where: {
      consumerName: inbox.consumer_name,
      implementationProjectId: sourceEvent.implementation_project_id,
      validationCycleId: sourceEvent.validation_cycle_id,
      branchId: sourceEvent.branch_id,
      businessIdempotencyKey: sourceEvent.business_idempotency_key,
    },
  });
  if (!byBusiness) {
    return null;
  }
  if (
    byBusiness.eventId !== sourceEvent.event_id
    || serverHashExperimentV2EventEnvelope(storedEvent(byBusiness))
      !== serverHashExperimentV2EventEnvelope(sourceEvent)
    || byBusiness.outcome !== inbox.outcome
    || byBusiness.reasonCode !== inbox.reason_code
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      'PI inbox event or business key was reused with changed payload/outcome',
    );
  }
  return mapPiInbox(byBusiness);
}

function assertAdmissionScope(
  input: PaperImplementationExperimentV2CommitAdmissionInput,
  existing: BranchRow | null,
): void {
  if (
    input.branch.branch_frame.frame_schema_version !== STORED_SCHEMA_VERSION_V1
    || input.revision.work_order_revision.work_order_schema_version !== STORED_SCHEMA_VERSION_V1
    || input.revision.branch_id !== input.branch.branch_id
    || input.admission.work_order_revision_id !== input.revision.work_order_revision_id
    || input.admission.approved_plan_hash !== input.revision.approved_plan_hash
    || input.cells.length === 0
    || input.cells.some((cell, index) => (
      cell.work_order_revision_id !== input.revision.work_order_revision_id
      || cell.ordinal !== index + 1
    ))
  ) {
    throw constraint('BRANCH_REVISION_CONFLICT', 'Admission bundle has inconsistent revision/cell scope');
  }
  if (!existing) {
    if (input.expected_branch_state_version !== null) {
      throw constraint('BRANCH_CAS_CONFLICT', 'New branch requires a null expected state version');
    }
    return;
  }
  const storedBranch = mapBranch(existing);
  if (
    input.expected_branch_state_version === null
    || storedBranch.branch_id !== input.branch.branch_id
    || storedBranch.implementation_project_id !== input.branch.implementation_project_id
    || storedBranch.validation_cycle_id !== input.branch.validation_cycle_id
    || storedBranch.branch_key !== input.branch.branch_key
    || storedBranch.branch_frame_hash !== input.branch.branch_frame_hash
  ) {
    throw constraint('BRANCH_SCOPE_CONFLICT', 'Branch scope or frame changed during admission');
  }
}

function assertHeadScope(
  authority: StoredPiHeadAuthority,
  event: RunManifestFrozenEventV1,
  next: PaperImplementationExperimentWorkOrderBranchV2,
): void {
  const bundle = mapAdmissionBundleAuthority(
    authority.branch,
    authority.revision,
    authority.cells,
    authority.admission,
    authority.admissionOutbox,
    'BRANCH_HEAD_SCOPE_CONFLICT',
  );
  const { branch, revision, cells } = bundle;
  if (
    branch.branch_id !== next.branch_id
    || branch.implementation_project_id !== event.implementation_project_id
    || branch.validation_cycle_id !== event.validation_cycle_id
    || branch.branch_key !== event.branch_key
    || revision.branch_id !== branch.branch_id
    || revision.revision_sequence !== event.branch_revision_sequence
    || revision.content_hash !== event.work_order_revision_hash
    || revision.cell_plan_hash !== event.cell_plan_hash
    || revision.approved_plan_hash !== event.approved_plan_hash
    || cells.some((cell, index) => (
      cell.work_order_revision_id !== revision.work_order_revision_id
      || cell.ordinal !== index + 1
    ))
    || event.payload.task_spec_bindings.length !== cells.length
    || event.payload.task_spec_bindings.some((binding, index) => {
      const cell = cells[index];
      return !cell
        || binding.ordinal !== cell.ordinal
        || binding.work_order_cell_id !== cell.work_order_cell_id
        || binding.cell_key !== cell.cell_key
        || binding.cell_hash !== cell.cell_hash;
    })
    || next.head_run_id !== event.payload.run_id
    || next.head_run_manifest_hash !== event.payload.run_manifest_hash
    || next.head_source_event_id !== event.event_id
  ) {
    throw constraint('BRANCH_HEAD_SCOPE_CONFLICT', 'RunManifestFrozen does not match the exact PI branch revision');
  }
}

async function assertStoredProcessedHeadBinding(
  client: SpineClient,
  branch: BranchRow,
  event: RunManifestFrozenEventV1,
): Promise<void> {
  const currentSequence = branch.currentRevisionSequence;
  const headSequence = branch.headRevisionSequence;
  if (
    currentSequence === null
    || currentSequence < event.branch_revision_sequence
    || (
      currentSequence === event.branch_revision_sequence
      && branch.currentRevisionId !== event.work_order_revision_id
    )
    || headSequence === null
    || headSequence < event.branch_revision_sequence
    || branch.headRunId === null
    || branch.headRunManifestHash === null
    || branch.headEventId === null
    || branch.headRevisionId === null
    || currentSequence < headSequence
    || (
      headSequence === event.branch_revision_sequence
      && (
        branch.headRevisionId !== event.work_order_revision_id
        || branch.headRunId !== event.payload.run_id
        || branch.headRunManifestHash !== event.payload.run_manifest_hash
        || branch.headEventId !== event.event_id
      )
    )
  ) {
    throw constraint(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      `Processed PI head replay binding drifted: ${event.event_id}`,
    );
  }
  if (headSequence === event.branch_revision_sequence) {
    return;
  }

  const laterInboxRow = await client.paperImplementationExperimentIntegrationInboxV2.findFirst({
    where: {
      eventId: branch.headEventId,
      eventType: 'RunManifestFrozen',
      branchId: branch.id,
      workOrderRevisionId: branch.headRevisionId,
      revisionSequence: headSequence,
      status: 'processed',
      outcome: 'processed',
    },
  });
  if (!laterInboxRow) {
    throw constraint(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      `Later PI head receipt is missing during replay: ${branch.headEventId}`,
    );
  }
  const laterEvent = storedEvent(laterInboxRow);
  if (
    laterEvent.event_type !== 'RunManifestFrozen'
    || laterInboxRow.runId !== branch.headRunId
    || laterInboxRow.runManifestHash !== branch.headRunManifestHash
  ) {
    throw constraint(
      'BRANCH_HEAD_SCOPE_CONFLICT',
      `Later PI head receipt binding drifted during replay: ${branch.headEventId}`,
    );
  }
  mapPiInbox(laterInboxRow);
  await assertStoredHeadAdvanceOutboxBinding(client, laterEvent);
  const laterAuthority = await loadHeadAuthority(client, laterEvent);
  if (!laterAuthority) {
    throw constraint(
      'INTEGRATION_PREREQUISITE_NOT_READY',
      `Later PI head authority is missing during replay: ${branch.headEventId}`,
    );
  }
  assertHeadScope(
    laterAuthority,
    laterEvent,
    mapBranch(branch, 'BRANCH_HEAD_SCOPE_CONFLICT'),
  );
}

async function assertStoredHeadAdvanceOutboxBinding(
  client: SpineClient,
  sourceEvent: RunManifestFrozenEventV1,
): Promise<void> {
  const row = await client.paperImplementationExperimentIntegrationOutboxV2.findFirst({
    where: {
      workOrderRevisionId: sourceEvent.work_order_revision_id,
      eventType: 'BranchHeadAdvanced',
      schemaVersion: 'v1',
      producerDomain: 'PaperImplementation',
    },
  });
  if (!row) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `BranchHeadAdvanced outbox is missing during replay: ${sourceEvent.event_id}`,
    );
  }
  const outbox = mapPiOutbox(row);
  const event = outbox.event;
  if (
    event.event_type !== 'BranchHeadAdvanced'
    || event.causation_id !== sourceEvent.event_id
    || event.correlation_id !== sourceEvent.correlation_id
    || event.business_idempotency_key !== sourceEvent.business_idempotency_key
    || outbox.aggregate_transition_key
      !== `${sourceEvent.branch_id}:revision:${sourceEvent.branch_revision_sequence}:head`
    || !sameJson(eventScope(event), eventScope(sourceEvent))
    || event.payload.source_event_id !== sourceEvent.event_id
    || event.payload.run_id !== sourceEvent.payload.run_id
    || event.payload.run_manifest_hash !== sourceEvent.payload.run_manifest_hash
    || event.payload.accepted_revision_sequence !== sourceEvent.branch_revision_sequence
    || !Number.isInteger(event.payload.branch_state_version)
    || event.payload.branch_state_version < 1
    || event.payload.branch_state_version > EXPERIMENT_V2_INT32_MAX
  ) {
    throw constraint(
      'INTEGRATION_EVENT_PAYLOAD_CONFLICT',
      `BranchHeadAdvanced outbox drifted during replay: ${sourceEvent.event_id}`,
    );
  }
}

function assertInboxMatchesEvent(
  inbox: PaperImplementationExperimentIntegrationInboxV2,
  event: PaperImplementationInboxSourceEventV2,
): void {
  if (
    inbox.source_event_id !== event.event_id
    || inbox.business_idempotency_key !== event.business_idempotency_key
    || inbox.payload_hash !== event.payload_hash
    || inbox.source_event_hash !== serverHashExperimentV2EventEnvelope(event)
    || !sameJson(inbox.scope, eventScope(event))
  ) {
    throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', 'PI inbox receipt does not match its source event');
  }
}

function expectedPiOutboxAggregate(
  event: PaperImplementationExperimentIntegrationOutboxV2['event'],
): { type: string; id: string } {
  switch (event.event_type) {
    case 'WorkOrderRevisionAdmitted':
      return {
        type: 'PaperImplementationExperimentWorkOrderRevisionV2',
        id: event.work_order_revision_id,
      };
    case 'BranchHeadAdvanced':
      return { type: 'PaperImplementationExperimentWorkOrderBranchV2', id: event.branch_id };
    case 'RunEvidenceUnitRegistered':
      return {
        type: 'PaperImplementationRunEvidenceUnitV2',
        id: event.payload.run_evidence_unit_id,
      };
    case 'ValidationCycleClosed@v1':
      return {
        type: 'PaperImplementationValidationCycleClosureV2',
        id: event.payload.closure_id,
      };
  }
}

function eventRunColumns(
  event:
    | PaperImplementationExperimentIntegrationOutboxV2['event']
    | PaperImplementationInboxSourceEventV2,
): { run_id: string | null; run_manifest_hash: string | null } {
  if (
    event.event_type === 'WorkOrderRevisionAdmitted'
    || event.event_type === 'ValidationCycleClosed@v1'
  ) {
    return { run_id: null, run_manifest_hash: null };
  }
  return {
    run_id: event.payload.run_id,
    run_manifest_hash: event.payload.run_manifest_hash,
  };
}

function inboxRunColumns(
  event: PaperImplementationInboxSourceEventV2,
): { run_id: string; run_manifest_hash: string } {
  if (event.event_type === 'ValidationCycleClosed@v1') {
    return {
      run_id: event.payload.closure_id,
      run_manifest_hash: event.payload.closure_snapshot_hash,
    };
  }
  return {
    run_id: event.payload.run_id,
    run_manifest_hash: event.payload.run_manifest_hash,
  };
}

function sameAdmissionBundle(
  stored: PaperImplementationExperimentV2AdmissionBundle,
  input: PaperImplementationExperimentV2CommitAdmissionInput,
): boolean {
  const storedCells = orderedCells(stored.cells);
  const inputCells = orderedCells(input.cells);
  // Server-generated branch/revision/cell/event ids may differ when two
  // identical commands race before either can observe the other's commit.
  // Business replay identity is therefore the exact canonical command
  // semantics, not the generated ids of the losing transaction.
  return stored.branch.implementation_project_id === input.branch.implementation_project_id
    && stored.branch.validation_cycle_id === input.branch.validation_cycle_id
    && stored.branch.branch_key === input.branch.branch_key
    && stored.branch.branch_frame_hash === input.branch.branch_frame_hash
    && stored.revision.revision_sequence === input.revision.revision_sequence
    && stored.revision.content_hash === input.revision.content_hash
    && stored.revision.cell_plan_hash === input.revision.cell_plan_hash
    && stored.revision.approved_plan_hash === input.revision.approved_plan_hash
    && stored.admission.approved_plan_hash === input.admission.approved_plan_hash
    && stored.admission.business_idempotency_key === input.admission.business_idempotency_key
    && storedCells.length === inputCells.length
    && storedCells.every((cell, index) => {
      const candidate = inputCells[index];
      return candidate !== undefined
        && cell.ordinal === candidate.ordinal
        && cell.cell_key === candidate.cell_key
        && cell.cell_hash === candidate.cell_hash;
    });
}

function orderedCells<T extends { ordinal: number }>(cells: T[]): T[] {
  return [...cells].sort((left, right) => left.ordinal - right.ordinal);
}

function eventScope(event: ExperimentV2IntegrationEvent) {
  return {
    implementation_project_id: event.implementation_project_id,
    validation_cycle_id: event.validation_cycle_id,
    branch_id: event.branch_id,
    branch_key: event.branch_key,
    work_order_revision_id: event.work_order_revision_id,
    work_order_revision_hash: event.work_order_revision_hash,
    branch_revision_sequence: event.branch_revision_sequence,
    cell_plan_hash: event.cell_plan_hash,
    approved_plan_hash: event.approved_plan_hash,
  };
}

function relayReadyWhere(claimedAt: Date) {
  return {
    deliveredAt: null,
    relayAttemptCount: { lt: EXPERIMENT_V2_INT32_MAX },
    relayStatus: { in: ['pending', 'leased'] },
    AND: [
      {
        OR: [
          { relayNextAttemptAt: null },
          { relayNextAttemptAt: { lte: claimedAt } },
        ],
      },
      {
        OR: [
          { relayLeaseOwner: null },
          { relayLeaseExpiresAt: { lte: claimedAt } },
        ],
      },
    ],
  } satisfies Prisma.PaperImplementationExperimentIntegrationOutboxV2WhereInput;
}

function mapPiRelayClaim(row: PiOutboxRow): ExperimentV2RelayClaim {
  if (!row.relayLeaseOwner || !row.relayLeaseExpiresAt) {
    throw constraint('OUTBOX_LEASE_CONFLICT', `PI outbox was not leased: ${row.id}`);
  }
  const event = mapPiOutbox(row).event;
  return {
    owner_domain: 'PaperImplementation',
    outbox_id: row.id,
    event,
    relay_attempt_count: row.relayAttemptCount,
    lease_owner: row.relayLeaseOwner,
    lease_expires_at: row.relayLeaseExpiresAt.toISOString(),
  };
}

function encodedEvent(event: ExperimentV2IntegrationEvent) {
  try {
    return encodeExperimentV2EventPayload(event);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', error.message);
    }
    throw error;
  }
}

function storedEvent(row: PiInboxRow | PiOutboxRow): ExperimentV2IntegrationEvent {
  try {
    return reconstructExperimentV2Event(row);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', error.message);
    }
    throw error;
  }
}

function storedInboxOutcome(
  row: StoredExperimentV2InboxOutcomeColumns,
): DecodedExperimentV2InboxOutcome {
  try {
    return decodeExperimentV2InboxOutcome(row);
  } catch (error) {
    if (error instanceof StoredExperimentV2EventIntegrityError) {
      throw constraint('INTEGRATION_EVENT_PAYLOAD_CONFLICT', error.message);
    }
    throw error;
  }
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalizeExperimentV2Json(left) === canonicalizeExperimentV2Json(right);
}

function decodeStoredJson<T>(
  validator: ValidateFunction<T>,
  value: Prisma.JsonValue | Record<string, unknown>,
  reasonCode: ConstructorParameters<typeof ExperimentSpineV2RepositoryConstraintError>[0],
  label: string,
): T {
  if (!validator(value)) {
    const details = (validator.errors ?? [])
      .map((error) => `${error.instancePath || '/'} ${error.message ?? 'is invalid'}`)
      .join('; ');
    throw constraint(
      reasonCode,
      `${label} does not match its closed typed schema${details ? `: ${details}` : ''}`,
    );
  }
  return value;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function assertStoredSchemaVersion(
  relationalVersion: string,
  snapshotVersion: unknown,
  reasonCode: ConstructorParameters<typeof ExperimentSpineV2RepositoryConstraintError>[0],
  label: string,
): void {
  if (
    relationalVersion !== STORED_SCHEMA_VERSION_V1
    || snapshotVersion !== STORED_SCHEMA_VERSION_V1
  ) {
    throw constraint(reasonCode, `${label} schema version drifted from v1`);
  }
}

function constraint(
  reasonCode: ConstructorParameters<typeof ExperimentSpineV2RepositoryConstraintError>[0],
  message: string,
): ExperimentSpineV2RepositoryConstraintError {
  return new ExperimentSpineV2RepositoryConstraintError(reasonCode, message);
}

async function assertCycleOpen(client: SpineClient, validationCycleId: string): Promise<void> {
  const closure = await client.paperImplementationValidationCycleClosureV2.findUnique({
    where: { validationCycleId },
    select: { id: true },
  });
  if (closure) {
    throw constraint(
      'CYCLE_ALREADY_CLOSED',
      `ValidationCycle already has an immutable v2 closure: ${validationCycleId}`,
    );
  }
}

function mapPiWriteError(
  error: unknown,
  fallback: ConstructorParameters<typeof ExperimentSpineV2RepositoryConstraintError>[0],
): Error {
  if (error instanceof ExperimentSpineV2RepositoryConstraintError) {
    return error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return constraint(fallback, 'PI v2 uniqueness constraint rejected a changed replay');
    }
    if (error.code === 'P2003') {
      return constraint(
        'INTEGRATION_PREREQUISITE_NOT_READY',
        'PI v2 transaction prerequisite is not committed',
      );
    }
  }
  return error instanceof Error ? error : new Error(String(error));
}
