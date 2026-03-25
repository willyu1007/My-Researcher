import type {
  PackageDTO,
  ResearchQuestionDTO,
  ValueAssessmentDTO,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';
import { AppError } from '../../errors/app-error.js';
import type {
  StoredTitleCard,
  TitleCardManagementRepository,
} from '../../repositories/title-card-management.repository.js';
import type { TitleCardManagementReferenceGateway } from './support.js';
import { isRecordUsable } from './support.js';

type GuardrailsDeps = {
  repository: TitleCardManagementRepository;
  references: TitleCardManagementReferenceGateway;
};

export function createTitleCardManagementGuardrails({
  repository,
  references,
}: GuardrailsDeps) {
  async function assertTitleCardExists(titleCardId: string): Promise<StoredTitleCard> {
    const titleCard = await repository.getTitleCard(titleCardId);
    if (!titleCard) {
      throw new AppError(404, 'NOT_FOUND', `TitleCard ${titleCardId} not found.`);
    }
    return titleCard;
  }

  async function assertLiteraturesExist(literatureIds: string[]) {
    const results = await Promise.all(
      literatureIds.map(async (literatureId) => ({
        literatureId,
        found: await references.findLiteratureById(literatureId),
      })),
    );
    const missing = results.filter((result) => !result.found).map((result) => result.literatureId);
    if (missing.length > 0) {
      throw new AppError(404, 'NOT_FOUND', `Literature records not found: ${missing.join(', ')}.`, {
        missing_literature_ids: missing,
      });
    }
  }

  async function assertEvidenceSelectedInBasket(titleCardId: string, literatureIds: string[]) {
    const basket = await repository.getEvidenceBasket(titleCardId);
    const selected = new Set(basket.items.map((item) => item.literature_id));
    const missing = literatureIds.filter((literatureId) => !selected.has(literatureId));
    if (missing.length > 0) {
      throw new AppError(
        422,
        'GATE_CONSTRAINT_FAILED',
        'Referenced evidence must already be selected in the title-card evidence basket.',
        { missing_literature_ids: missing },
      );
    }
  }

  async function assertNeedReviewUsable(titleCardId: string, needId: string) {
    const review = await repository.getNeedReview(titleCardId, needId);
    if (!review) {
      throw new AppError(404, 'NOT_FOUND', `NeedReview ${needId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(review.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `NeedReview ${needId} is ${review.record_status} and cannot be used as an upstream source.`,
      );
    }
    return review;
  }

  async function assertResearchQuestionUsable(
    titleCardId: string,
    researchQuestionId: string,
  ): Promise<ResearchQuestionDTO> {
    const question = await repository.getResearchQuestion(titleCardId, researchQuestionId);
    if (!question) {
      throw new AppError(404, 'NOT_FOUND', `ResearchQuestion ${researchQuestionId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(question.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `ResearchQuestion ${researchQuestionId} is ${question.record_status} and cannot be used.`,
      );
    }
    return question;
  }

  async function assertValueAssessmentUsable(
    titleCardId: string,
    valueAssessmentId: string,
  ): Promise<ValueAssessmentDTO> {
    const assessment = await repository.getValueAssessment(titleCardId, valueAssessmentId);
    if (!assessment) {
      throw new AppError(404, 'NOT_FOUND', `ValueAssessment ${valueAssessmentId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(assessment.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `ValueAssessment ${valueAssessmentId} is ${assessment.record_status} and cannot be used.`,
      );
    }
    return assessment;
  }

  async function assertPackageUsable(titleCardId: string, packageId: string): Promise<PackageDTO> {
    const pkg = await repository.getPackage(titleCardId, packageId);
    if (!pkg) {
      throw new AppError(404, 'NOT_FOUND', `Package ${packageId} not found for title card ${titleCardId}.`);
    }
    if (!isRecordUsable(pkg.record_status)) {
      throw new AppError(
        409,
        'VERSION_CONFLICT',
        `Package ${packageId} is ${pkg.record_status} and cannot be used.`,
      );
    }
    return pkg;
  }

  return {
    assertTitleCardExists,
    assertLiteraturesExist,
    assertEvidenceSelectedInBasket,
    assertNeedReviewUsable,
    assertResearchQuestionUsable,
    assertValueAssessmentUsable,
    assertPackageUsable,
  };
}
