import type {
  TopicSelectionFormTopicQuestionRunRecord,
  TopicSelectionQuestionFrameRecord,
  TopicSelectionTopicQuestionAnswerabilityPlanRecord,
  TopicSelectionTopicQuestionAssumptionRefRecord,
  TopicSelectionTopicQuestionBoundaryRefRecord,
  TopicSelectionTopicQuestionCandidateRecord,
  TopicSelectionTopicQuestionCandidateSetRecord,
  TopicSelectionTopicQuestionContractRecord,
  TopicSelectionTopicQuestionEvidenceRefRecord,
  TopicSelectionTopicQuestionFalsificationConditionRecord,
  TopicSelectionTopicQuestionNeedRefRecord,
  TopicSelectionTopicQuestionRecord,
  TopicSelectionTopicQuestionSelectionDecisionRecord,
  TopicSelectionV1bTopicQuestionMaterialization,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-question-contracts';
import type {
  TopicSelectionTopicQuestionCandidatePersistence,
  TopicSelectionTopicQuestionSelectionPersistence,
  TopicSelectionV1bTopicQuestionRepository,
} from './topic-selection-v1b-topic-question.repository.js';

export class InMemoryTopicSelectionV1bTopicQuestionRepository
implements TopicSelectionV1bTopicQuestionRepository {
  private readonly formationRuns = new Map<string, TopicSelectionFormTopicQuestionRunRecord>();
  private readonly questionFrames = new Map<string, TopicSelectionQuestionFrameRecord>();
  private readonly candidateSets = new Map<string, TopicSelectionTopicQuestionCandidateSetRecord>();
  private readonly candidates = new Map<string, TopicSelectionTopicQuestionCandidateRecord>();
  private readonly decisions = new Map<string, TopicSelectionTopicQuestionSelectionDecisionRecord>();
  private readonly topicQuestions = new Map<string, TopicSelectionTopicQuestionRecord>();
  private readonly contracts = new Map<string, TopicSelectionTopicQuestionContractRecord>();
  private readonly answerabilityPlans = new Map<string, TopicSelectionTopicQuestionAnswerabilityPlanRecord>();
  private readonly needRefs = new Map<string, TopicSelectionTopicQuestionNeedRefRecord>();
  private readonly evidenceRefs = new Map<string, TopicSelectionTopicQuestionEvidenceRefRecord>();
  private readonly boundaryRefs = new Map<string, TopicSelectionTopicQuestionBoundaryRefRecord>();
  private readonly assumptionRefs = new Map<string, TopicSelectionTopicQuestionAssumptionRefRecord>();
  private readonly falsificationConditions =
    new Map<string, TopicSelectionTopicQuestionFalsificationConditionRecord>();

  async createFormationRun(
    record: TopicSelectionFormTopicQuestionRunRecord,
  ): Promise<TopicSelectionFormTopicQuestionRunRecord> {
    this.formationRuns.set(record.form_topic_question_run_id, record);
    return record;
  }

  async findFormationRunById(runId: string): Promise<TopicSelectionFormTopicQuestionRunRecord | null> {
    return this.formationRuns.get(runId) ?? null;
  }

  async createFormationRunWithCandidates(
    persistence: TopicSelectionTopicQuestionCandidatePersistence,
  ): Promise<{
    form_topic_question_run: TopicSelectionFormTopicQuestionRunRecord;
    question_frame: TopicSelectionQuestionFrameRecord;
    candidate_set: TopicSelectionTopicQuestionCandidateSetRecord;
    candidates: TopicSelectionTopicQuestionCandidateRecord[];
  }> {
    this.formationRuns.set(
      persistence.form_topic_question_run.form_topic_question_run_id,
      persistence.form_topic_question_run,
    );
    this.questionFrames.set(persistence.question_frame.question_frame_id, persistence.question_frame);
    this.candidateSets.set(
      persistence.candidate_set.topic_question_candidate_set_id,
      persistence.candidate_set,
    );
    for (const candidate of persistence.candidates) {
      this.candidates.set(candidate.topic_question_candidate_id, candidate);
    }
    return persistence;
  }

  async findCandidateSetById(
    candidateSetId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateSetRecord | null> {
    return this.candidateSets.get(candidateSetId) ?? null;
  }

  async listCandidateSetsByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateSetRecord[]> {
    return [...this.candidateSets.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async findQuestionFrameById(frameId: string): Promise<TopicSelectionQuestionFrameRecord | null> {
    return this.questionFrames.get(frameId) ?? null;
  }

  async listCandidatesByCandidateSetId(
    candidateSetId: string,
  ): Promise<TopicSelectionTopicQuestionCandidateRecord[]> {
    return [...this.candidates.values()]
      .filter((candidate) => candidate.candidate_set_id === candidateSetId)
      .sort((left, right) => left.candidate_ordinal - right.candidate_ordinal);
  }

  async findCandidateById(candidateId: string): Promise<TopicSelectionTopicQuestionCandidateRecord | null> {
    return this.candidates.get(candidateId) ?? null;
  }

  async createSelectionDecisionWithMaterializations(
    persistence: TopicSelectionTopicQuestionSelectionPersistence,
  ): Promise<{
    decision: TopicSelectionTopicQuestionSelectionDecisionRecord;
    materializations: TopicSelectionV1bTopicQuestionMaterialization[];
  }> {
    const snapshot = this.snapshot();
    try {
      this.decisions.set(
        persistence.decision.topic_question_selection_decision_id,
        persistence.decision,
      );
      const candidateSet = this.require(
        this.candidateSets,
        persistence.decision.candidate_set_id,
        'TopicQuestionCandidateSet',
      );
      this.candidateSets.set(persistence.decision.candidate_set_id, {
        ...candidateSet,
        ...persistence.candidate_set_patch,
      });
      for (const patch of persistence.candidate_status_patches) {
        const current = this.require(this.candidates, patch.candidate_id, 'TopicQuestionCandidate');
        this.candidates.set(patch.candidate_id, { ...current, status: patch.status });
      }
      if (persistence.superseded_materialization) {
        const superseded = persistence.superseded_materialization;
        const previousQuestion = this.require(this.topicQuestions, superseded.topic_question_id, 'TopicQuestion');
        const previousContract = this.require(
          this.contracts,
          superseded.topic_question_contract_id,
          'TopicQuestionContract',
        );
        this.topicQuestions.set(superseded.topic_question_id, {
          ...previousQuestion,
          status: 'superseded',
          updated_at: superseded.updated_at,
        });
        this.contracts.set(superseded.topic_question_contract_id, {
          ...previousContract,
          status: 'superseded',
          updated_at: superseded.updated_at,
        });
      }
      for (const materialization of persistence.materializations) {
        this.topicQuestions.set(materialization.topic_question.topic_question_id, materialization.topic_question);
        this.contracts.set(
          materialization.topic_question_contract.topic_question_contract_id,
          materialization.topic_question_contract,
        );
        this.answerabilityPlans.set(
          materialization.answerability_plan.topic_question_answerability_plan_id,
          materialization.answerability_plan,
        );
        for (const needRef of materialization.need_refs) {
          this.needRefs.set(needRef.topic_question_need_ref_id, needRef);
        }
        for (const evidenceRef of materialization.evidence_refs) {
          this.evidenceRefs.set(evidenceRef.topic_question_evidence_ref_id, evidenceRef);
        }
        for (const boundaryRef of materialization.boundary_refs) {
          this.boundaryRefs.set(boundaryRef.topic_question_boundary_ref_id, boundaryRef);
        }
        for (const assumptionRef of materialization.assumption_refs) {
          this.assumptionRefs.set(assumptionRef.topic_question_assumption_ref_id, assumptionRef);
        }
        for (const condition of materialization.falsification_conditions) {
          this.falsificationConditions.set(
            condition.topic_question_falsification_condition_id,
            condition,
          );
        }
      }
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
    return persistence;
  }

  async findSelectionDecisionById(
    decisionId: string,
  ): Promise<TopicSelectionTopicQuestionSelectionDecisionRecord | null> {
    return this.decisions.get(decisionId) ?? null;
  }

  async findTopicQuestionById(questionId: string): Promise<TopicSelectionTopicQuestionRecord | null> {
    return this.topicQuestions.get(questionId) ?? null;
  }

  async findTopicQuestionContractById(
    contractId: string,
  ): Promise<TopicSelectionTopicQuestionContractRecord | null> {
    return this.contracts.get(contractId) ?? null;
  }

  async findAnswerabilityPlanByContractId(
    contractId: string,
  ): Promise<TopicSelectionTopicQuestionAnswerabilityPlanRecord | null> {
    return [...this.answerabilityPlans.values()]
      .find((plan) => plan.topic_question_contract_id === contractId) ?? null;
  }

  async findAnswerabilityPlanById(
    planId: string,
  ): Promise<TopicSelectionTopicQuestionAnswerabilityPlanRecord | null> {
    return this.answerabilityPlans.get(planId) ?? null;
  }

  async listNeedRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionNeedRefRecord[]> {
    return this.byContract(this.needRefs, contractId);
  }

  async listEvidenceRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionEvidenceRefRecord[]> {
    return this.byContract(this.evidenceRefs, contractId);
  }

  async listBoundaryRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionBoundaryRefRecord[]> {
    return this.byContract(this.boundaryRefs, contractId);
  }

  async listAssumptionRefsByContractId(contractId: string): Promise<TopicSelectionTopicQuestionAssumptionRefRecord[]> {
    return this.byContract(this.assumptionRefs, contractId);
  }

  async listFalsificationConditionsByContractId(
    contractId: string,
  ): Promise<TopicSelectionTopicQuestionFalsificationConditionRecord[]> {
    return this.byContract(this.falsificationConditions, contractId);
  }

  private byContract<T extends { topic_question_contract_id: string; created_at: string }>(
    records: Map<string, T>,
    contractId: string,
  ): T[] {
    return [...records.values()]
      .filter((record) => record.topic_question_contract_id === contractId)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }

  private require<T>(records: Map<string, T>, id: string, label: string): T {
    const record = records.get(id);
    if (!record) {
      throw new Error(`${label} ${id} not found.`);
    }
    return record;
  }

  private snapshot() {
    return {
      decisions: new Map(this.decisions),
      candidateSets: new Map(this.candidateSets),
      candidates: new Map(this.candidates),
      topicQuestions: new Map(this.topicQuestions),
      contracts: new Map(this.contracts),
      answerabilityPlans: new Map(this.answerabilityPlans),
      needRefs: new Map(this.needRefs),
      evidenceRefs: new Map(this.evidenceRefs),
      boundaryRefs: new Map(this.boundaryRefs),
      assumptionRefs: new Map(this.assumptionRefs),
      falsificationConditions: new Map(this.falsificationConditions),
    };
  }

  private restore(snapshot: ReturnType<InMemoryTopicSelectionV1bTopicQuestionRepository['snapshot']>): void {
    this.decisions.clear();
    this.candidateSets.clear();
    this.candidates.clear();
    this.topicQuestions.clear();
    this.contracts.clear();
    this.answerabilityPlans.clear();
    this.needRefs.clear();
    this.evidenceRefs.clear();
    this.boundaryRefs.clear();
    this.assumptionRefs.clear();
    this.falsificationConditions.clear();
    for (const [id, record] of snapshot.decisions) this.decisions.set(id, record);
    for (const [id, record] of snapshot.candidateSets) this.candidateSets.set(id, record);
    for (const [id, record] of snapshot.candidates) this.candidates.set(id, record);
    for (const [id, record] of snapshot.topicQuestions) this.topicQuestions.set(id, record);
    for (const [id, record] of snapshot.contracts) this.contracts.set(id, record);
    for (const [id, record] of snapshot.answerabilityPlans) this.answerabilityPlans.set(id, record);
    for (const [id, record] of snapshot.needRefs) this.needRefs.set(id, record);
    for (const [id, record] of snapshot.evidenceRefs) this.evidenceRefs.set(id, record);
    for (const [id, record] of snapshot.boundaryRefs) this.boundaryRefs.set(id, record);
    for (const [id, record] of snapshot.assumptionRefs) this.assumptionRefs.set(id, record);
    for (const [id, record] of snapshot.falsificationConditions) this.falsificationConditions.set(id, record);
  }
}
