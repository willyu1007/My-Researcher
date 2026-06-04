import {
  PAPER_IMPLEMENTATION_RUNTIME_CACHE_STATUSES,
  PAPER_IMPLEMENTATION_RUNTIME_RESPONSE_REUSE_STATUSES,
  type PaperImplementationRuntimeAdmissionRecord,
  type PaperImplementationRuntimeArtifactEnvelope,
  type PaperImplementationRuntimeCacheStatus,
  type PaperImplementationRuntimeResponseReuseStatus,
  type PaperImplementationRuntimeStatus,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-runtime-contracts';
import type {
  PaperImplementationAgentWorkflowType,
} from '@paper-engineering-assistant/shared/research-lifecycle/paper-implementation-agent-common-contracts';

export const PAPER_IMPLEMENTATION_RUNTIME_OPERATIONAL_TELEMETRY_SCHEMA_VERSION =
  'PaperImplementationRuntimeOperationalTelemetry@v1' as const;

export interface PaperImplementationRuntimeOperationalTelemetry {
  schema_version: typeof PAPER_IMPLEMENTATION_RUNTIME_OPERATIONAL_TELEMETRY_SCHEMA_VERSION;
  run_id: string;
  workflow_type: PaperImplementationAgentWorkflowType;
  slot_id: string;
  status: PaperImplementationRuntimeStatus;
  provider_call_count: number;
  role_provider_call_count: number;
  final_provider_call_count: number;
  provider_call_count_consistent: boolean;
  runtime_artifact_count: number;
  role_artifact_count: number;
  final_artifact_count: number;
  admission_record_count: number;
  admitted_admission_count: number;
  rejected_admission_count: number;
  failed_runtime_artifact_count: number;
  blocked_artifact_count: number;
  final_artifact_present: boolean;
  final_admission_present: boolean;
  non_provider_artifact_count: number;
  retry_attempted_role_count: number;
  retry_recovered_role_count: number;
  retry_exhausted_role_count: number;
  response_reuse_status_counts: Record<PaperImplementationRuntimeResponseReuseStatus, number>;
  context_cache_status_counts: Record<PaperImplementationRuntimeCacheStatus, number>;
  prompt_packet_cache_status_counts: Record<PaperImplementationRuntimeCacheStatus, number>;
  runtime_failure_codes: string[];
  blocker_codes: string[];
  warning_codes: string[];
  admission_issue_codes: string[];
}

export interface BuildPaperImplementationRuntimeOperationalTelemetryInput {
  runId: string;
  workflowType: PaperImplementationAgentWorkflowType;
  slotId: string;
  status: PaperImplementationRuntimeStatus;
  providerCallCount: number;
  artifacts: PaperImplementationRuntimeArtifactEnvelope[];
  admissions: PaperImplementationRuntimeAdmissionRecord[];
  finalArtifact: PaperImplementationRuntimeArtifactEnvelope | null;
  finalAdmission: PaperImplementationRuntimeAdmissionRecord | null;
}

export function buildPaperImplementationRuntimeOperationalTelemetry(
  input: BuildPaperImplementationRuntimeOperationalTelemetryInput,
): PaperImplementationRuntimeOperationalTelemetry {
  const roleArtifacts = input.artifacts.filter((artifact) => artifact.artifact_scope === 'role');
  const finalArtifacts = input.artifacts.filter((artifact) => artifact.artifact_scope === 'final');
  const roleProviderCallCount = roleArtifacts.reduce((sum, artifact) => sum + artifact.provider_call_count, 0);
  const finalProviderCallCount = input.finalArtifact?.provider_call_count ?? 0;
  const effectiveProviderCallCount = input.finalArtifact ? finalProviderCallCount : roleProviderCallCount;

  return {
    schema_version: PAPER_IMPLEMENTATION_RUNTIME_OPERATIONAL_TELEMETRY_SCHEMA_VERSION,
    run_id: input.runId,
    workflow_type: input.workflowType,
    slot_id: input.slotId,
    status: input.status,
    provider_call_count: input.providerCallCount,
    role_provider_call_count: roleProviderCallCount,
    final_provider_call_count: finalProviderCallCount,
    provider_call_count_consistent: input.providerCallCount === effectiveProviderCallCount,
    runtime_artifact_count: input.artifacts.length,
    role_artifact_count: roleArtifacts.length,
    final_artifact_count: finalArtifacts.length,
    admission_record_count: input.admissions.length,
    admitted_admission_count: input.admissions.filter((admission) => admission.admission_status === 'admitted').length,
    rejected_admission_count: input.admissions.filter((admission) => admission.admission_status === 'rejected').length,
    failed_runtime_artifact_count: input.artifacts.filter((artifact) => artifact.runtime_status === 'failed_runtime').length,
    blocked_artifact_count: input.artifacts.filter((artifact) => artifact.runtime_status === 'blocked').length,
    final_artifact_present: input.finalArtifact !== null,
    final_admission_present: input.finalAdmission !== null,
    non_provider_artifact_count: input.artifacts.filter((artifact) => artifact.execution_mode !== 'provider_llm').length,
    retry_attempted_role_count: roleArtifacts.filter((artifact) => artifact.retry_attempt_index > 0).length,
    retry_recovered_role_count: roleArtifacts.filter((artifact) =>
      artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_RECOVERED'),
    ).length,
    retry_exhausted_role_count: roleArtifacts.filter((artifact) =>
      artifact.warning_codes.includes('RUNTIME_TECHNICAL_RETRY_EXHAUSTED'),
    ).length,
    response_reuse_status_counts: countByStatus(
      PAPER_IMPLEMENTATION_RUNTIME_RESPONSE_REUSE_STATUSES,
      input.artifacts.map((artifact) => artifact.response_reuse_status),
    ),
    context_cache_status_counts: countByStatus(
      PAPER_IMPLEMENTATION_RUNTIME_CACHE_STATUSES,
      input.artifacts.map((artifact) => artifact.context_cache_status),
    ),
    prompt_packet_cache_status_counts: countByStatus(
      PAPER_IMPLEMENTATION_RUNTIME_CACHE_STATUSES,
      input.artifacts.map((artifact) => artifact.prompt_packet_cache_status),
    ),
    runtime_failure_codes: uniqueStrings(input.artifacts.flatMap((artifact) => artifact.runtime_failure_code ?? [])),
    blocker_codes: uniqueStrings(input.artifacts.flatMap((artifact) => artifact.blocker_codes)),
    warning_codes: uniqueStrings(input.artifacts.flatMap((artifact) => artifact.warning_codes)),
    admission_issue_codes: uniqueStrings(input.admissions.flatMap((admission) => admission.issue_codes)),
  };
}

function countByStatus<TStatus extends string>(
  statuses: readonly TStatus[],
  values: TStatus[],
): Record<TStatus, number> {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as Record<TStatus, number>;
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}
