import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import * as paperImplementationContracts from './paper-implementation-contracts.js';
import * as researchLifecycleContracts from './index.js';
import {
  TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS,
  topicSelectionDownstreamTopicFeedbackCreateInputSchema,
} from './topic-selection-v1c-downstream-feedback-recheck-contracts.js';

type JsonSchema = Readonly<Record<string, unknown>>;

function functionalRef(refType: string, refId: string) {
  return {
    ref_type: refType,
    ref_id: refId,
  };
}

async function validateWithSchema(schema: JsonSchema, payload: object) {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  await app.ready();
  const response = await app.inject({
    method: 'POST',
    url: '/validate',
    payload,
  });
  await app.close();
  return response.statusCode;
}

test('paper-implementation schemas load through direct and aggregate exports', () => {
  assert.ok(paperImplementationContracts.bootstrapImplementationProjectRequestSchema);
  assert.ok(paperImplementationContracts.implementationIntakeSnapshotSchema);
  assert.ok(paperImplementationContracts.implementationProjectSchema);
  assert.ok(paperImplementationContracts.createPaperImplementationTopicHandoffRequestSchema);
  assert.ok(paperImplementationContracts.paperImplementationTopicHandoffResponseSchema);
  assert.ok(paperImplementationContracts.recordImplementationFeedbackEventRequestSchema);
  assert.ok(paperImplementationContracts.implementationFeedbackEventSchema);
  assert.ok(researchLifecycleContracts.bootstrapImplementationProjectRequestSchema);
  assert.ok(researchLifecycleContracts.paperImplementationTopicHandoffResponseSchema);
  assert.ok(researchLifecycleContracts.implementationProjectSchema);
});

test('bootstrap implementation project request validates required bridge fields', async () => {
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.bootstrapImplementationProjectRequestSchema,
      {
        paper_project_bridge_id: 'paper_project_bridge_001',
        bridge_payload_hash: 'bridge_hash_001',
        workspace_id: 'workspace_001',
        created_by: 'hybrid',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.bootstrapImplementationProjectRequestSchema,
      {
        paper_project_bridge_id: 'paper_project_bridge_001',
      },
    ),
    400,
  );
});

test('topic handoff requires the single bridge-id input', async () => {
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.createPaperImplementationTopicHandoffRequestSchema,
      { paper_project_bridge_id: 'paper_project_bridge_001' },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.createPaperImplementationTopicHandoffRequestSchema,
      {},
    ),
    400,
  );
});

test('topic handoff response keeps semantic context separate from owner lineage', async () => {
  const response = {
    schema_version: paperImplementationContracts.PAPER_IMPLEMENTATION_TOPIC_HANDOFF_SCHEMA_VERSION,
    status: 'resumed',
    effects: {
      paper_project_created: false,
      implementation_project_created: false,
    },
    semantic_context: {
      editable_title: 'Working paper title',
      problem_statement: 'Evaluate one bounded research question.',
      contribution_summary: 'Provide one traceable result.',
      evaluation_plan: 'Run the admitted comparison.',
      initial_planning_notes: ['Preserve the fixed setup.'],
      claim_ceiling: 'Claim only the admitted comparison.',
      prohibited_claims: ['Do not generalize beyond the benchmark.'],
      conditions: [],
      accepted_risk_refs: [],
      early_check_obligations: [],
      source_lineage_summary: {},
    },
    lineage: {
      paper_project_bridge_ref: functionalRef('paper_project_bridge', 'paper_project_bridge_001'),
      title_card_id: 'title_card_001',
      topic_package_id: 'topic_package_001',
      package_version: 'v1',
      paper_project_intake_ref: functionalRef('paper_project_intake', 'paper_project_intake_001'),
      paper_project_ref: functionalRef('paper_project', 'P001'),
      implementation_project_id: 'implementation_project_001',
      implementation_intake_snapshot_id: 'implementation_intake_snapshot_001',
    },
    resume_policy: paperImplementationContracts.PAPER_IMPLEMENTATION_TOPIC_HANDOFF_RESUME_POLICY,
  };
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.paperImplementationTopicHandoffResponseSchema,
      response,
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.paperImplementationTopicHandoffResponseSchema,
      {
        ...response,
        lineage: {
          paper_project_bridge_ref: response.lineage.paper_project_bridge_ref,
          title_card_id: response.lineage.title_card_id,
          topic_package_id: response.lineage.topic_package_id,
          package_version: response.lineage.package_version,
          paper_project_intake_ref: response.lineage.paper_project_intake_ref,
          paper_project_ref: response.lineage.paper_project_ref,
          implementation_intake_snapshot_id:
            response.lineage.implementation_intake_snapshot_id,
        },
      },
    ),
    400,
  );
});

test('implementation feedback request validates event type and severity', async () => {
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.recordImplementationFeedbackEventRequestSchema,
      {
        feedback_type: 'infeasible_route',
        severity: 'blocking',
        summary: 'The admitted route cannot be executed under the current dataset constraints.',
        source_object_refs: [functionalRef('implementation_project', 'implementation_project_001')],
        recommended_upstream_action: 'recheck_topic_selection',
      },
    ),
    200,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.recordImplementationFeedbackEventRequestSchema,
      {
        feedback_type: 'paper_project_drift',
        severity: 'blocking',
        summary: 'Invalid feedback type.',
      },
    ),
    400,
  );
  assert.equal(
    await validateWithSchema(
      paperImplementationContracts.recordImplementationFeedbackEventRequestSchema,
      {
        feedback_type: 'infeasible_route',
        severity: 'fatal',
        summary: 'Invalid severity.',
      },
    ),
    400,
  );
});

test('topic-selection downstream feedback accepts paper_implementation source kind', async () => {
  assert.ok(TOPIC_SELECTION_DOWNSTREAM_FEEDBACK_SOURCE_KINDS.includes('paper_implementation'));
  assert.equal(
    await validateWithSchema(
      topicSelectionDownstreamTopicFeedbackCreateInputSchema,
      {
        paper_project_bridge_id: 'paper_project_bridge_001',
        downstream_source_kind: 'paper_implementation',
        downstream_source_ref: functionalRef('implementation_feedback_event', 'feedback_event_001'),
        feedback_signal: 'unanswerable_question',
        severity: 'blocking',
        summary: 'Implementation found the promoted question is not answerable.',
      },
    ),
    200,
  );
});
