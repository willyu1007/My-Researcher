import {
  useAutoImportCommands,
} from './controllers/useAutoImportCommands';
import {
  useAutoImportLoaders,
} from './controllers/useAutoImportLoaders';
import {
  useAutoImportViewModel,
} from './controllers/useAutoImportViewModel';
import type {
  AutoImportControllerInput,
  AutoImportControllerOutput,
} from './types';

export type {
  AutoImportControllerInput,
  AutoImportControllerOutput,
} from './types';

export function useAutoImportController(input: AutoImportControllerInput): AutoImportControllerOutput {
  const viewModel = useAutoImportViewModel(input);
  const loaders = useAutoImportLoaders(input);
  const commands = useAutoImportCommands(input, {
    autoPullRuleById: viewModel.autoPullRuleById,
    loadTopicProfiles: loaders.loadTopicProfiles,
    loadAutoPullRules: loaders.loadAutoPullRules,
    loadAutoPullRuns: loaders.loadAutoPullRuns,
    loadAutoPullRunDetail: loaders.loadAutoPullRunDetail,
  });

  return {
    ...viewModel,
    ...loaders,
    ...commands,
  };
}
