export interface ScientificEvidenceP5LiveSourceAttemptV1 {
  lifecycleState: string;
  terminalReasonCode: string | null;
  collectionAttempt: null | {
    collectionState: string;
    provisionalOutputs: ReadonlyArray<{ outputClass: string }>;
  };
}

/** Returns complete only after every expected terminal collection owns one scientific source. */
export function scientificEvidenceP5LiveSourceGateV1(input: {
  attempts: ReadonlyArray<ScientificEvidenceP5LiveSourceAttemptV1>;
  expected_attempt_count: number;
  pending_command_count: number;
}): 'continue' | 'complete' {
  const allTerminalAndCollected = input.attempts.length === input.expected_attempt_count
    && input.attempts.every((attempt) => (
      attempt.lifecycleState === 'succeeded'
      && attempt.terminalReasonCode === 'real_provider_succeeded'
      && attempt.collectionAttempt?.collectionState === 'collected'
    ));
  if (!allTerminalAndCollected || input.pending_command_count > 0) return 'continue';

  const sourceCounts = input.attempts.map((attempt) => (
    attempt.collectionAttempt?.provisionalOutputs.filter(
      (output) => output.outputClass === 'scientific_source',
    ).length ?? 0
  ));
  if (sourceCounts.every((count) => count === 1)) return 'complete';
  if (sourceCounts.some((count) => count === 0)) {
    throw new Error('T136_P5_SCIENTIFIC_SOURCE_MISSING');
  }
  throw new Error('T136_P5_SCIENTIFIC_SOURCE_CARDINALITY_INVALID');
}
