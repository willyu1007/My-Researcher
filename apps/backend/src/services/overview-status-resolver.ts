import type { OverviewStatus, TopicScopeStatus } from '@paper-engineering-assistant/shared';

export type OverviewStatusResolverInput = {
  topicScopeStatus: TopicScopeStatus | null;
  citationComplete: boolean;
  abstractReady: boolean;
  keyContentReady: boolean;
};

export class OverviewStatusResolver {
  resolve(input: OverviewStatusResolverInput): OverviewStatus {
    if (input.topicScopeStatus === 'excluded') {
      return 'excluded';
    }

    if (input.abstractReady && input.keyContentReady) {
      return 'automation_ready';
    }

    if (input.citationComplete) {
      return 'citable';
    }

    return 'not_citable';
  }
}
