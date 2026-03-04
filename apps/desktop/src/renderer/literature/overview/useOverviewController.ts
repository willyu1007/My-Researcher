export type OverviewControllerInput = Record<string, unknown>;

export function useOverviewController<T extends OverviewControllerInput>(input: T): T {
  return input;
}
