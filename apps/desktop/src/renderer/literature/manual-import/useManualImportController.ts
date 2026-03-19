import {
  useManualImportReviewController,
} from './controllers/useManualImportReviewController';
import {
  useManualImportSubmitController,
} from './controllers/useManualImportSubmitController';
import {
  useManualImportUploadController,
} from './controllers/useManualImportUploadController';
import {
  useManualImportZoteroController,
} from './controllers/useManualImportZoteroController';
import type {
  ManualImportControllerInput,
  ManualImportControllerOutput,
} from './types';

export type {
  ManualImportControllerInput,
  ManualImportControllerOutput,
} from './types';

export function useManualImportController(input: ManualImportControllerInput): ManualImportControllerOutput {
  const review = useManualImportReviewController(input);
  const upload = useManualImportUploadController(input);
  const submit = useManualImportSubmitController(input, {
    manualValidationByRowId: review.manualValidationByRowId,
  });
  const zotero = useManualImportZoteroController(input);

  return {
    ...review,
    ...upload,
    ...submit,
    ...zotero,
  };
}
