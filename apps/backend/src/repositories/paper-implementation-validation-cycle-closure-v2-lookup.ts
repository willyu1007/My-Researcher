/**
 * Cross-domain read boundary for the D-18 closed-Cycle write seal. Consumers
 * may ask only whether the immutable PI closure authority exists.
 */
export interface PaperImplementationValidationCycleClosureV2Lookup {
  isCycleClosed(validationCycleId: string): Promise<boolean>;
}

export class InMemoryPaperImplementationValidationCycleClosureV2Lookup
implements PaperImplementationValidationCycleClosureV2Lookup {
  private readonly closedCycleIds: Set<string>;

  constructor(closedCycleIds: readonly string[] = []) {
    this.closedCycleIds = new Set(closedCycleIds);
  }

  async isCycleClosed(validationCycleId: string): Promise<boolean> {
    return this.closedCycleIds.has(validationCycleId);
  }

  markClosed(validationCycleId: string): void {
    this.closedCycleIds.add(validationCycleId);
  }
}
