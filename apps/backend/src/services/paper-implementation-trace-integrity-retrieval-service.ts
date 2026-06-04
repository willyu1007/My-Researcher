import {
  PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_PACKET_SCHEMA_VERSION,
  type PaperImplementationTraceIntegrityRetrievalFreshnessStatus,
  type PaperImplementationTraceIntegrityRetrievalPacket,
  type PaperImplementationTraceIntegrityRetrievalSource,
  type PaperImplementationTraceIntegrityRetrievalSourceFamily,
  type PaperImplementationTraceIntegrityReviewedStatement,
  type PaperImplementationTraceIntegrityReviewedStatementInput,
  type PaperImplementationTraceIntegritySourcePacketInput,
  type RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  TopicSelectionFunctionalRef,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';

import {
  sha256Text,
  stableStringify,
} from './literature-content-processing-utils.js';

export interface PaperImplementationTraceIntegrityRetrievalResult {
  packet: PaperImplementationTraceIntegrityRetrievalPacket;
  packet_ref: TopicSelectionFunctionalRef;
  packet_hash: string;
  blocker_codes: string[];
  warning_codes: string[];
}

export class PaperImplementationTraceIntegrityRetrievalService {
  buildRetrievalPacket(
    implementationProjectId: string,
    runId: string,
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
  ): PaperImplementationTraceIntegrityRetrievalResult {
    const warningCodes: string[] = [];
    const blockerCodes: string[] = [];
    const reviewedStatementPackets = this.indexStatementPackets(request.reviewed_statement_packets ?? []);
    const sourcePackets = this.indexSourcePackets(request.source_packets ?? [], request, warningCodes);
    const sources = request.source_refs.map((sourceRef, index) => this.retrievalSource({
      sourceRef,
      expectedSourceHash: request.source_hashes[index] ?? '',
      sourcePacket: sourcePackets.get(this.refKey(sourceRef)) ?? null,
      warningCodes,
      blockerCodes,
    }));
    const reviewedStatements = request.reviewed_statement_refs.map((statementRef) => this.reviewedStatement(
      statementRef,
      reviewedStatementPackets.get(this.refKey(statementRef)) ?? null,
      warningCodes,
    ));
    const sourceFamilyCoverage = this.sourceFamilyCoverage(sources);
    const packet: PaperImplementationTraceIntegrityRetrievalPacket = {
      schema_version: PAPER_IMPLEMENTATION_TRACE_INTEGRITY_RETRIEVAL_PACKET_SCHEMA_VERSION,
      retrieval_packet_id: `${runId}.retrieval`,
      implementation_project_id: implementationProjectId,
      target_ref: request.target_ref,
      target_version_id: request.target_version_id ?? null,
      input_snapshot_ref: request.input_snapshot_ref,
      input_snapshot_hash: request.input_snapshot_hash,
      reviewed_statement_packet_ref: request.reviewed_statement_packet_ref,
      reviewed_statement_packet_hash: request.reviewed_statement_packet_hash,
      reviewed_statements: reviewedStatements,
      sources,
      source_family_coverage: sourceFamilyCoverage,
      max_depth: 2,
      freshness_status: this.packetFreshnessStatus(sources),
      blocker_codes: this.uniqueStrings(blockerCodes),
      warning_codes: this.uniqueStrings(warningCodes),
    };
    const packetHash = sha256Text(stableStringify(packet));
    return {
      packet,
      packet_ref: {
        ref_type: 'trace_integrity_retrieval_packet',
        ref_id: `${runId}.retrieval`,
        version_id: packetHash,
        title_card_id: this.titleCardId(request),
      },
      packet_hash: packetHash,
      blocker_codes: packet.blocker_codes,
      warning_codes: packet.warning_codes,
    };
  }

  private reviewedStatement(
    statementRef: TopicSelectionFunctionalRef,
    packet: PaperImplementationTraceIntegrityReviewedStatementInput | null,
    warningCodes: string[],
  ): PaperImplementationTraceIntegrityReviewedStatement {
    const statementText = this.trimmedOrNull(packet?.statement_text);
    if (!statementText) {
      warningCodes.push('reviewed_statement_content_unavailable');
    }
    return {
      statement_ref: statementRef,
      statement_hash: this.trimmedOrNull(packet?.statement_hash) ?? (statementText ? sha256Text(statementText) : null),
      statement_text: statementText,
      semantic_role: this.trimmedOrNull(packet?.semantic_role),
      content_available: Boolean(statementText),
    };
  }

  private retrievalSource(input: {
    sourceRef: TopicSelectionFunctionalRef;
    expectedSourceHash: string;
    sourcePacket: PaperImplementationTraceIntegritySourcePacketInput | null;
    warningCodes: string[];
    blockerCodes: string[];
  }): PaperImplementationTraceIntegrityRetrievalSource {
    const explicitFamily = input.sourcePacket?.source_family ?? null;
    const sourceFamily = explicitFamily ?? this.inferSourceFamily(input.sourceRef.ref_type);
    const contentSummary = this.trimmedOrNull(input.sourcePacket?.content_summary);
    const sourceExcerpt = this.trimmedOrNull(input.sourcePacket?.source_excerpt);
    const contentAvailable = Boolean(contentSummary || sourceExcerpt);
    const freshnessStatus = input.sourcePacket?.freshness_status ?? 'unknown';
    if (!contentAvailable) {
      input.warningCodes.push('retrieval_source_content_unavailable');
    }
    if (!explicitFamily && sourceFamily === 'unknown') {
      input.warningCodes.push('retrieval_source_family_unknown');
    }
    if (!input.sourcePacket) {
      input.warningCodes.push('retrieval_source_packet_unavailable');
    } else if (input.sourcePacket.source_hash !== input.expectedSourceHash) {
      input.blockerCodes.push('source_hash_drift');
    }
    if (freshnessStatus === 'stale') {
      input.blockerCodes.push('source_ref_stale');
    }
    return {
      source_ref: input.sourceRef,
      source_hash: input.expectedSourceHash,
      source_family: sourceFamily,
      freshness_status: freshnessStatus,
      evidence_role: this.trimmedOrNull(input.sourcePacket?.evidence_role),
      content_summary: contentSummary,
      source_excerpt: sourceExcerpt,
      content_available: contentAvailable,
    };
  }

  private indexStatementPackets(
    packets: PaperImplementationTraceIntegrityReviewedStatementInput[],
  ): Map<string, PaperImplementationTraceIntegrityReviewedStatementInput> {
    return new Map(packets.map((packet) => [this.refKey(packet.statement_ref), packet]));
  }

  private indexSourcePackets(
    packets: PaperImplementationTraceIntegritySourcePacketInput[],
    request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest,
    warningCodes: string[],
  ): Map<string, PaperImplementationTraceIntegritySourcePacketInput> {
    const allowedRefs = new Set(request.source_refs.map((ref) => this.refKey(ref)));
    const indexed = new Map<string, PaperImplementationTraceIntegritySourcePacketInput>();
    for (const packet of packets) {
      const key = this.refKey(packet.source_ref);
      if (!allowedRefs.has(key)) {
        warningCodes.push('retrieval_source_packet_unreferenced');
      }
      indexed.set(key, packet);
    }
    return indexed;
  }

  private sourceFamilyCoverage(
    sources: PaperImplementationTraceIntegrityRetrievalSource[],
  ): Record<string, number> {
    const coverage: Record<string, number> = {};
    for (const source of sources) {
      coverage[source.source_family] = (coverage[source.source_family] ?? 0) + 1;
    }
    return coverage;
  }

  private packetFreshnessStatus(
    sources: PaperImplementationTraceIntegrityRetrievalSource[],
  ): PaperImplementationTraceIntegrityRetrievalFreshnessStatus {
    if (sources.some((source) => source.freshness_status === 'stale')) {
      return 'stale';
    }
    if (sources.length > 0 && sources.every((source) => source.freshness_status === 'fresh')) {
      return 'fresh';
    }
    return 'unknown';
  }

  private inferSourceFamily(refType: string): PaperImplementationTraceIntegrityRetrievalSourceFamily {
    const normalized = refType.toLowerCase();
    if (normalized.includes('claim_trace')) {
      return 'claim_trace_packet';
    }
    if (normalized.includes('trace')) {
      return 'trace_lineage';
    }
    if (normalized.includes('citation')) {
      return 'citation_candidate';
    }
    if (normalized.includes('board') || normalized.includes('binding') || normalized.includes('assertion')) {
      return 'evidence_board';
    }
    if (
      normalized.includes('validation')
      || normalized.includes('probe')
      || normalized.includes('experiment')
      || normalized.includes('route')
    ) {
      return 'validation_artifact';
    }
    if (normalized.includes('run') || normalized.includes('evidence_unit') || normalized.includes('job')) {
      return 'run_evidence';
    }
    if (normalized.includes('result') || normalized.includes('interpretation') || normalized.includes('limitation')) {
      return 'result_packet';
    }
    if (normalized.includes('dossier') || normalized.includes('writing')) {
      return 'dossier_readiness';
    }
    if (normalized.includes('target') || normalized.includes('claim_candidate') || normalized.includes('paper_implementation_project')) {
      return 'target_object';
    }
    return 'unknown';
  }

  private titleCardId(request: RunPaperImplementationTraceIntegrityDebateRuntimeRequest): string | null {
    return request.target_ref.title_card_id
      ?? request.input_snapshot_ref.title_card_id
      ?? request.source_refs[0]?.title_card_id
      ?? null;
  }

  private refKey(ref: TopicSelectionFunctionalRef): string {
    return stableStringify({
      ref_type: ref.ref_type,
      ref_id: ref.ref_id,
      version_id: ref.version_id ?? null,
      title_card_id: ref.title_card_id ?? null,
    });
  }

  private trimmedOrNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private uniqueStrings(values: string[]): string[] {
    return [...new Set(values.filter((value) => value.trim().length > 0))];
  }
}
