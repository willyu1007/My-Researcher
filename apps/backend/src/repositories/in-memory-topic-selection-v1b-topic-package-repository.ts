import type {
  TopicSelectionArtifactRefRecord,
  TopicSelectionChainTransitionAttemptRecord,
  TopicSelectionInputSnapshotRecord,
  TopicSelectionLlmWorkflowRunRecord,
  TopicSelectionReadinessGateResultRecord,
  TopicSelectionTraceSnapshotRecord,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionPackageTraceBoundaryCheckRecord,
  TopicSelectionTopicPackageReadinessAssessmentRecord,
  TopicSelectionTopicPackageRecord,
  TopicSelectionV1bToV1cInputBundleRecord,
  TopicSelectionV1bTopicPackageCreationResult,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-topic-package-contracts';
import type {
  TopicSelectionV1bValueAssessmentRepository,
} from './topic-selection-v1b-value-assessment.repository.js';
import type {
  TopicSelectionV1bTopicPackageAuthorityPersistence,
  TopicSelectionV1bTopicPackagePersistence,
  TopicSelectionV1bTopicPackageRepository,
} from './topic-selection-v1b-topic-package.repository.js';

export class InMemoryTopicSelectionV1bTopicPackageRepository
implements TopicSelectionV1bTopicPackageRepository {
  private readonly packages = new Map<string, TopicSelectionTopicPackageRecord>();
  private readonly checks = new Map<string, TopicSelectionPackageTraceBoundaryCheckRecord>();
  private readonly readinessAssessments = new Map<string, TopicSelectionTopicPackageReadinessAssessmentRecord>();
  private readonly bundles = new Map<string, TopicSelectionV1bToV1cInputBundleRecord>();
  private readonly inputSnapshots = new Map<string, TopicSelectionInputSnapshotRecord>();
  private readonly workflowRuns = new Map<string, TopicSelectionLlmWorkflowRunRecord>();
  private readonly artifactRefs = new Map<string, TopicSelectionArtifactRefRecord>();
  private readonly gateResults = new Map<string, TopicSelectionReadinessGateResultRecord>();
  private readonly transitionAttempts = new Map<string, TopicSelectionChainTransitionAttemptRecord>();
  private readonly traceSnapshots = new Map<string, TopicSelectionTraceSnapshotRecord>();

  constructor(
    private readonly valueAssessmentRepository: TopicSelectionV1bValueAssessmentRepository,
  ) {}

  async createDraftPackage(
    persistence: TopicSelectionV1bTopicPackagePersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    if (this.findPackageByDecision(persistence.topic_package.value_disposition_decision_id)) {
      throw new Error('TopicPackage already exists for this ValueDispositionDecision.');
    }
    const snapshot = this.snapshot();
    try {
      this.inputSnapshots.set(
        persistence.control_plane.input_snapshot.input_snapshot_id,
        persistence.control_plane.input_snapshot,
      );
      this.workflowRuns.set(
        persistence.control_plane.workflow_run.workflow_run_id,
        persistence.control_plane.workflow_run,
      );
      for (const artifactRef of persistence.control_plane.artifact_refs) {
        this.artifactRefs.set(artifactRef.artifact_ref_id, artifactRef);
      }
      this.gateResults.set(
        persistence.control_plane.readiness_gate_result.readiness_gate_result_id,
        persistence.control_plane.readiness_gate_result,
      );
      this.transitionAttempts.set(
        persistence.control_plane.transition_attempt.chain_transition_attempt_id,
        persistence.control_plane.transition_attempt,
      );
      this.traceSnapshots.set(
        persistence.control_plane.trace_snapshot.trace_snapshot_id,
        persistence.control_plane.trace_snapshot,
      );
      this.supersedePriorAssessmentPackages(persistence.topic_package);
      this.packages.set(persistence.topic_package.topic_package_id, persistence.topic_package);
      this.checks.set(
        persistence.package_trace_boundary_check.package_trace_boundary_check_id,
        persistence.package_trace_boundary_check,
      );
      this.readinessAssessments.set(
        persistence.package_readiness_assessment.package_readiness_assessment_id,
        persistence.package_readiness_assessment,
      );
      if (persistence.v1c_input_bundle) {
        this.bundles.set(
          persistence.v1c_input_bundle.v1b_to_v1c_input_bundle_id,
          persistence.v1c_input_bundle,
        );
      }
      await this.valueAssessmentRepository.patchDispositionDecisionOutputTopicPackage(
        persistence.topic_package.value_disposition_decision_id,
        persistence.topic_package.topic_package_id,
      );
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
    return persistence;
  }

  async createDraftPackageAuthority(
    persistence: TopicSelectionV1bTopicPackageAuthorityPersistence,
  ): Promise<TopicSelectionV1bTopicPackageCreationResult> {
    if (this.findPackageByDecision(persistence.topic_package.value_disposition_decision_id)) {
      throw new Error('TopicPackage already exists for this ValueDispositionDecision.');
    }
    const snapshot = this.snapshot();
    try {
      this.supersedePriorAssessmentPackages(persistence.topic_package);
      this.packages.set(persistence.topic_package.topic_package_id, persistence.topic_package);
      this.checks.set(
        persistence.package_trace_boundary_check.package_trace_boundary_check_id,
        persistence.package_trace_boundary_check,
      );
      this.readinessAssessments.set(
        persistence.package_readiness_assessment.package_readiness_assessment_id,
        persistence.package_readiness_assessment,
      );
      if (persistence.v1c_input_bundle) {
        this.bundles.set(
          persistence.v1c_input_bundle.v1b_to_v1c_input_bundle_id,
          persistence.v1c_input_bundle,
        );
      }
      await this.valueAssessmentRepository.patchDispositionDecisionOutputTopicPackage(
        persistence.topic_package.value_disposition_decision_id,
        persistence.topic_package.topic_package_id,
      );
    } catch (error) {
      this.restore(snapshot);
      throw error;
    }
    return persistence;
  }

  async findPackageById(
    topicPackageId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    return this.packages.get(topicPackageId) ?? null;
  }

  async listPackagesByTitleCardId(
    titleCardId: string,
  ): Promise<TopicSelectionTopicPackageRecord[]> {
    return [...this.packages.values()]
      .filter((record) => record.title_card_id === titleCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  async findPackageByValueDispositionDecisionId(
    valueDispositionDecisionId: string,
  ): Promise<TopicSelectionTopicPackageRecord | null> {
    return this.findPackageByDecision(valueDispositionDecisionId);
  }

  async findTraceBoundaryCheckById(
    traceBoundaryCheckId: string,
  ): Promise<TopicSelectionPackageTraceBoundaryCheckRecord | null> {
    return this.checks.get(traceBoundaryCheckId) ?? null;
  }

  async findReadinessAssessmentById(
    readinessAssessmentId: string,
  ): Promise<TopicSelectionTopicPackageReadinessAssessmentRecord | null> {
    return this.readinessAssessments.get(readinessAssessmentId) ?? null;
  }

  async findV1cInputBundleById(
    v1bToV1cInputBundleId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    return this.bundles.get(v1bToV1cInputBundleId) ?? null;
  }

  async findV1cInputBundleByPackageId(
    topicPackageId: string,
  ): Promise<TopicSelectionV1bToV1cInputBundleRecord | null> {
    return [...this.bundles.values()].find((bundle) => bundle.topic_package_id === topicPackageId) ?? null;
  }

  private findPackageByDecision(valueDispositionDecisionId: string): TopicSelectionTopicPackageRecord | null {
    return [...this.packages.values()]
      .find((record) => record.value_disposition_decision_id === valueDispositionDecisionId) ?? null;
  }

  private supersedePriorAssessmentPackages(nextPackage: TopicSelectionTopicPackageRecord): void {
    const priorPackageIds = new Set<string>();
    for (const [packageId, record] of this.packages) {
      if (
        record.topic_value_assessment_id !== nextPackage.topic_value_assessment_id
        || record.value_disposition_decision_id === nextPackage.value_disposition_decision_id
        || record.package_readiness_status === 'superseded'
      ) {
        continue;
      }
      priorPackageIds.add(packageId);
      this.packages.set(packageId, {
        ...record,
        package_readiness_status: 'superseded',
        updated_at: nextPackage.created_at,
      });
    }
    for (const [bundleId, bundle] of this.bundles) {
      if (priorPackageIds.has(bundle.topic_package_id)) {
        this.bundles.set(bundleId, { ...bundle, bundle_status: 'superseded' });
      }
    }
  }

  private snapshot() {
    return {
      packages: new Map(this.packages),
      checks: new Map(this.checks),
      readinessAssessments: new Map(this.readinessAssessments),
      bundles: new Map(this.bundles),
      inputSnapshots: new Map(this.inputSnapshots),
      workflowRuns: new Map(this.workflowRuns),
      artifactRefs: new Map(this.artifactRefs),
      gateResults: new Map(this.gateResults),
      transitionAttempts: new Map(this.transitionAttempts),
      traceSnapshots: new Map(this.traceSnapshots),
    };
  }

  private restore(snapshot: ReturnType<InMemoryTopicSelectionV1bTopicPackageRepository['snapshot']>): void {
    this.packages.clear();
    this.checks.clear();
    this.readinessAssessments.clear();
    this.bundles.clear();
    this.inputSnapshots.clear();
    this.workflowRuns.clear();
    this.artifactRefs.clear();
    this.gateResults.clear();
    this.transitionAttempts.clear();
    this.traceSnapshots.clear();
    for (const [id, record] of snapshot.packages) this.packages.set(id, record);
    for (const [id, record] of snapshot.checks) this.checks.set(id, record);
    for (const [id, record] of snapshot.readinessAssessments) this.readinessAssessments.set(id, record);
    for (const [id, record] of snapshot.bundles) this.bundles.set(id, record);
    for (const [id, record] of snapshot.inputSnapshots) this.inputSnapshots.set(id, record);
    for (const [id, record] of snapshot.workflowRuns) this.workflowRuns.set(id, record);
    for (const [id, record] of snapshot.artifactRefs) this.artifactRefs.set(id, record);
    for (const [id, record] of snapshot.gateResults) this.gateResults.set(id, record);
    for (const [id, record] of snapshot.transitionAttempts) this.transitionAttempts.set(id, record);
    for (const [id, record] of snapshot.traceSnapshots) this.traceSnapshots.set(id, record);
  }
}
