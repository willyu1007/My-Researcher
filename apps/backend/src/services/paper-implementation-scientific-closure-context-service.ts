import type {
  PaperImplementationBackHalfSourceContextPacket,
  PaperImplementationScientificClosureContextV1,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import { AppError } from '../errors/app-error.js';
import {
  PaperImplementationValidationCycleClosureV2RepositoryError,
  type PaperImplementationValidationCycleClosureV2Repository,
} from '../repositories/paper-implementation-validation-cycle-closure-v2.repository.js';
import { stableStringify } from './literature-content-processing-utils.js';
import {
  PaperImplementationCycleReadinessV2Service,
  PaperImplementationCycleReadinessV2ServiceError,
} from './paper-implementation-cycle-readiness-v2-service.js';

const SCIENTIFIC_CLOSURE_CONTEXT_TRANSACTION_RETRY_LIMIT = 2;

export interface PaperImplementationScientificClosureContextResolutionInput {
  implementation_project_id: string;
  validation_cycle_id: string;
  expected_closure_watermark_hash: string;
  title_card_id: string | null;
}

export interface PaperImplementationScientificClosureAuthoritativeSource {
  source_ref: TopicSelectionFunctionalRef;
  source_hash: string;
  source_context_packet: PaperImplementationBackHalfSourceContextPacket;
}

export interface PaperImplementationScientificClosureContextResolution {
  context: PaperImplementationScientificClosureContextV1;
  authoritative_sources: PaperImplementationScientificClosureAuthoritativeSource[];
}

export interface PaperImplementationScientificClosureContextResolver {
  resolve(
    input: PaperImplementationScientificClosureContextResolutionInput,
  ): Promise<PaperImplementationScientificClosureContextResolution>;
}

export class PaperImplementationScientificClosureContextService
implements PaperImplementationScientificClosureContextResolver {
  constructor(
    private readonly repository: PaperImplementationValidationCycleClosureV2Repository,
  ) {}

  async resolve(
    input: PaperImplementationScientificClosureContextResolutionInput,
  ): Promise<PaperImplementationScientificClosureContextResolution> {
    return this.resolveWithRetry(input, 0);
  }

  private async resolveWithRetry(
    input: PaperImplementationScientificClosureContextResolutionInput,
    retryCount: number,
  ): Promise<PaperImplementationScientificClosureContextResolution> {
    try {
      return await this.repository.withTransaction(async (transaction) => {
        const readiness = await new PaperImplementationCycleReadinessV2Service({
          repository: transaction,
        }).evaluate(input.validation_cycle_id);
        const cycle = await transaction.findValidationCycle(input.validation_cycle_id);
        if (!cycle || cycle.implementation_project_id !== input.implementation_project_id) {
          throw new AppError(
            409,
            'VERSION_CONFLICT',
            'Scientific closure context does not belong to the requested ImplementationProject.',
          );
        }
        if (
          readiness.status !== 'ready_with_evidence'
          || readiness.watermark.closure_input_hash
            !== input.expected_closure_watermark_hash
        ) {
          throw new AppError(
            409,
            'VERSION_CONFLICT',
            'Scientific closure context is not ready or the expected Cycle watermark is stale.',
          );
        }
        const evidenceRefs = readiness.watermark.ordered_branches.flatMap((branch) => (
          branch.eligible_run_evidence_unit_refs
        ));
        const authorities = await transaction.listScientificClosureEvidenceAuthorities(evidenceRefs);
        if (
          authorities.length !== evidenceRefs.length
          || authorities.some((authority, index) => (
            authority.run_evidence_unit_id !== evidenceRefs[index]?.run_evidence_unit_id
            || authority.content_hash !== evidenceRefs[index]?.content_hash
          ))
        ) {
          throw new AppError(
            409,
            'VERSION_CONFLICT',
            'Scientific closure evidence changed while the authoritative context was resolved.',
          );
        }
        const primaryFacts = authorities.flatMap((authority) => authority.primary_facts);
        if (primaryFacts.length !== 1) {
          throw new AppError(
            409,
            'GATE_CONSTRAINT_FAILED',
            'Scientific closure context requires exactly one protocol-designated primary comparison fact.',
          );
        }
        const primaryFact = primaryFacts[0]!;
        const authoritativeSources = this.uniqueSources(authorities.flatMap((authority) => {
          if (!authority.validation_report || !authority.evaluation_protocol) {
            throw new AppError(
              500,
              'INTERNAL_ERROR',
              'Scientific closure authority omitted its canonical report or protocol snapshot.',
            );
          }
          const runEvidenceRef = this.ref(
            'run_evidence_unit',
            authority.run_evidence_unit_id,
            authority.content_hash,
            input.title_card_id,
          );
          const reportRef = this.ref(
            'result_validation_report',
            authority.validation_report_id,
            authority.validation_hash,
            input.title_card_id,
          );
          const protocolRef = this.ref(
            'evaluation_protocol_revision',
            authority.evaluation_protocol_revision_id,
            authority.evaluation_protocol_content_hash,
            input.title_card_id,
          );
          return [
            this.source(
              runEvidenceRef,
              authority.content_hash,
              'run_evidence_unit',
              stableStringify({
                run_evidence_unit_id: authority.run_evidence_unit_id,
                content_hash: authority.content_hash,
                validation_report_id: authority.validation_report_id,
                validation_hash: authority.validation_hash,
                evaluation_protocol_revision_id: authority.evaluation_protocol_revision_id,
                evaluation_protocol_content_hash: authority.evaluation_protocol_content_hash,
              }),
              [
                `validation_report_id=${authority.validation_report_id}`,
                `evaluation_protocol_revision_id=${authority.evaluation_protocol_revision_id}`,
              ],
            ),
            this.source(
              reportRef,
              authority.validation_hash,
              'scientific_validation_report',
              stableStringify(authority.validation_report),
              [
                `run_id=${authority.validation_report.run_id}`,
                `status=${authority.validation_report.status}`,
                ...authority.primary_facts.map((fact) => (
                  `primary_comparison=${fact.comparison_key}:${fact.registered_relation}`
                )),
              ],
            ),
            this.source(
              protocolRef,
              authority.evaluation_protocol_content_hash,
              'evaluation_protocol_revision',
              stableStringify(authority.evaluation_protocol),
              [
                `primary_comparison_key=${authority.primary_comparison_key}`,
                `decision_if_positive=${authority.decision_if_positive}`,
                `decision_if_negative=${authority.decision_if_negative}`,
                `decision_if_inconclusive=${authority.decision_if_inconclusive}`,
              ],
            ),
          ];
        }));
        return {
          context: {
            schema_version: 'PaperImplementationScientificClosureContext@v1',
            validation_cycle_id: input.validation_cycle_id,
            closure_watermark_hash: readiness.watermark.closure_input_hash,
            primary_comparison_fact_ref: {
              comparison_fact_id: primaryFact.comparison_fact_id,
              comparison_fact_hash: primaryFact.comparison_fact_hash,
            },
            ordered_evidence_refs: evidenceRefs.map((ref, index) => ({
              ordinal: index + 1,
              run_evidence_unit_id: ref.run_evidence_unit_id,
              content_hash: ref.content_hash,
            })),
          },
          authoritative_sources: authoritativeSources,
        };
      });
    } catch (error) {
      if (error instanceof PaperImplementationCycleReadinessV2ServiceError) {
        if (error.reasonCode === 'VALIDATION_CYCLE_NOT_FOUND') {
          throw new AppError(404, 'NOT_FOUND', error.message, {
            reason_code: error.reasonCode,
          });
        }
        throw new AppError(409, 'GATE_CONSTRAINT_FAILED', error.message, {
          reason_code: error.reasonCode,
        });
      }
      if (
        error instanceof PaperImplementationValidationCycleClosureV2RepositoryError
        && error.reasonCode === 'CLOSURE_CONCURRENT_CONFLICT'
      ) {
        if (retryCount < SCIENTIFIC_CLOSURE_CONTEXT_TRANSACTION_RETRY_LIMIT) {
          return this.resolveWithRetry(input, retryCount + 1);
        }
        throw new AppError(
          409,
          'VERSION_CONFLICT',
          'Scientific closure context changed concurrently; retry with the latest Cycle watermark.',
          { reason_code: error.reasonCode },
        );
      }
      throw error;
    }
  }

  private ref(
    refType: string,
    refId: string,
    versionId: string,
    titleCardId: string | null,
  ): TopicSelectionFunctionalRef {
    return {
      ref_type: refType,
      ref_id: refId,
      title_card_id: titleCardId,
      version_id: versionId,
    };
  }

  private source(
    sourceRef: TopicSelectionFunctionalRef,
    canonicalHash: string,
    evidenceKind: string,
    contentSummary: string,
    keyFacts: string[],
  ): PaperImplementationScientificClosureAuthoritativeSource {
    if (!/^sha256:[0-9a-f]{64}$/.test(canonicalHash)) {
      throw new AppError(
        500,
        'INTERNAL_ERROR',
        `Scientific closure authority returned an invalid canonical hash for ${sourceRef.ref_type}.`,
      );
    }
    const sourceHash = canonicalHash.replace(/^sha256:/, '');
    return {
      source_ref: sourceRef,
      source_hash: sourceHash,
      source_context_packet: {
        source_ref: sourceRef,
        source_hash: sourceHash,
        evidence_kind: evidenceKind,
        content_summary: contentSummary,
        key_facts: keyFacts,
      },
    };
  }

  private uniqueSources(
    sources: PaperImplementationScientificClosureAuthoritativeSource[],
  ): PaperImplementationScientificClosureAuthoritativeSource[] {
    const unique = new Map<string, PaperImplementationScientificClosureAuthoritativeSource>();
    for (const source of sources) {
      const key = [
        source.source_ref.ref_type.toLowerCase().replace(/[^a-z0-9]/g, ''),
        source.source_ref.ref_id,
        source.source_ref.version_id ?? '',
      ].join(':');
      const existing = unique.get(key);
      if (!existing) {
        unique.set(key, source);
        continue;
      }
      if (stableStringify(existing) !== stableStringify(source)) {
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `Scientific closure authority returned conflicting duplicate source ${key}.`,
        );
      }
    }
    return [...unique.values()];
  }
}
