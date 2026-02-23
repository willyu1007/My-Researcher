import {
  InProcessGovernanceEventDeliveryAdapter,
  type GovernanceDeliveryResult,
  type GovernanceEventDeliveryAdapter,
  type GovernanceEventEnvelope,
} from './governance-event-delivery-adapter.js';
import type { GovernanceDeliveryOutboxStore } from './governance-delivery-outbox-store.js';

type DurableOutboxGovernanceEventDeliveryAdapterOptions = {
  delegate?: GovernanceEventDeliveryAdapter;
};

export class DurableOutboxGovernanceEventDeliveryAdapter
  implements GovernanceEventDeliveryAdapter
{
  readonly mode = 'durable-outbox' as const;
  private readonly delegate: GovernanceEventDeliveryAdapter;

  constructor(
    private readonly outboxStore: GovernanceDeliveryOutboxStore,
    options: DurableOutboxGovernanceEventDeliveryAdapterOptions = {},
  ) {
    this.delegate = options.delegate ?? new InProcessGovernanceEventDeliveryAdapter();
  }

  async deliver<T>(
    envelope: GovernanceEventEnvelope,
    dispatch: () => Promise<T>,
  ): Promise<GovernanceDeliveryResult<T>> {
    const outboxRecord = await this.outboxStore.enqueue(envelope);

    const delegated = await this.delegate.deliver(envelope, dispatch);
    if (delegated.status === 'failed') {
      await this.outboxStore.markFailed(
        outboxRecord.outbox_id,
        delegated.final_error ?? 'Delivery failed.',
      );
      return {
        ...delegated,
        mode: this.mode,
      };
    }

    await this.outboxStore.markDelivered(outboxRecord.outbox_id);
    return {
      ...delegated,
      mode: this.mode,
    };
  }
}
