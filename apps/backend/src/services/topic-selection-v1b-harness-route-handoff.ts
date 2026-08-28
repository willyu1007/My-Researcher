/**
 * W-12 / D-T127-01: v1b harness route + handoff builders, relocated VERBATIM from the harness.
 * Pure, `this`-free helpers that compute the static node graph (handoffEdge /
 * nextNodeForImplementedHandoff / routeTargetNode) and assemble a handoff envelope (buildHandoff,
 * via the pure canonicalHash).
 */
import { AppError } from '../errors/app-error.js';
import type { TopicSelectionFunctionalRef } from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-control-plane-contracts';
import type {
  TopicSelectionV1bWorkflowHarnessHandoff,
  TopicSelectionV1bWorkflowHarnessHandoffKind,
  TopicSelectionV1bWorkflowHarnessHandoffPayload,
  TopicSelectionV1bWorkflowHarnessNodeId,
  TopicSelectionV1bWorkflowHarnessRouteDecision,
  TopicSelectionV1bWorkflowHarnessRunRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/topic-selection-v1b-workflow-harness-contracts';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';

export function buildHandoff(
  input: TopicSelectionV1bWorkflowHarnessRunRequest,
  options: {
    handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind;
    payload: TopicSelectionV1bWorkflowHarnessHandoffPayload;
    requiredRefs: TopicSelectionFunctionalRef[];
    residualRiskRefs: TopicSelectionFunctionalRef[];
    sourceAuthorityHash: string;
    sourceAuthorityRef: TopicSelectionFunctionalRef;
    sourceGateResultHash: string;
    upstreamLineageHash: string;
    warningCodes: string[];
  },
): TopicSelectionV1bWorkflowHarnessHandoff {
  const edge = handoffEdge(options.handoffKind);
  const payloadHash = canonicalHash(options.payload);
  return {
    envelope: {
      handoff_kind: options.handoffKind,
      source_node_id: input.node_id,
      source_node_attempt_id: input.node_attempt_id,
      source_authority_ref: options.sourceAuthorityRef,
      source_authority_hash: options.sourceAuthorityHash,
      source_gate_result_hash: options.sourceGateResultHash,
      upstream_lineage_hash: options.upstreamLineageHash,
      policy_version: input.policy_version,
      schema_version: edge.payload_schema_version,
      warning_codes: options.warningCodes,
      residual_risk_refs: options.residualRiskRefs,
    },
    target_node_id: edge.target_node_id,
    route_signal: edge.route_signal,
    payload_hash: payloadHash,
    required_refs: options.requiredRefs,
    payload: options.payload,
  };
}

export function handoffEdge(
  handoffKind: TopicSelectionV1bWorkflowHarnessHandoffKind,
): {
  target_node_id: TopicSelectionV1bWorkflowHarnessNodeId | 'v1c.entry';
  route_signal: string;
  payload_schema_version: string;
} {
  switch (handoffKind) {
    case 'N1ToN2Handoff':
      return {
        target_node_id: 'topic-selection.v1b.record-research-constraint-profile.v1',
        route_signal: 'snapshot_created',
        payload_schema_version: 'N1ToN2Handoff@v1',
      };
    case 'N2ToN3Handoff':
      return {
        target_node_id: 'topic-selection.v1b.assess-intake-readiness.v1',
        route_signal: 'constraint_profile_recorded',
        payload_schema_version: 'N2ToN3Handoff@v1',
      };
    case 'N3ToN4Handoff':
      return {
        target_node_id: 'topic-selection.v1b.generate-research-slice-options.v1',
        route_signal: 'intake_ready_for_slice_generation',
        payload_schema_version: 'N3ToN4Handoff@v1',
      };
    case 'N4ToN5Handoff':
      return {
        target_node_id: 'topic-selection.v1b.select-research-slice.v1',
        route_signal: 'slice_options_generated',
        payload_schema_version: 'N4ToN5Handoff@v1',
      };
    case 'N5ToN6Handoff':
      return {
        target_node_id: 'topic-selection.v1b.generate-topic-question-candidates.v1',
        route_signal: 'slice_selected',
        payload_schema_version: 'N5ToN6Handoff@v1',
      };
    case 'N6ToN7Handoff':
      return {
        target_node_id: 'topic-selection.v1b.materialize-topic-question-contract.v1',
        route_signal: 'question_candidates_generated',
        payload_schema_version: 'N6ToN7Handoff@v1',
      };
    case 'N7ToN8Handoff':
      return {
        target_node_id: 'topic-selection.v1b.assess-topic-value.v1',
        route_signal: 'topic_question_contract_materialized',
        payload_schema_version: 'N7ToN8Handoff@v1',
      };
    case 'N8ToN9Handoff':
      return {
        target_node_id: 'topic-selection.v1b.decide-value-disposition.v1',
        route_signal: 'topic_value_assessed',
        payload_schema_version: 'N8ToN9Handoff@v1',
      };
    case 'N9ToN10Handoff':
      return {
        target_node_id: 'topic-selection.v1b.create-draft-topic-package.v1',
        route_signal: 'advance_to_package_candidate',
        payload_schema_version: 'N9ToN10Handoff@v1',
      };
    case 'N10ToN11Handoff':
      return {
        target_node_id: 'topic-selection.v1b.publish-v1c-input-bundle.v1',
        route_signal: 'package_created',
        payload_schema_version: 'N10ToN11Handoff@v1',
      };
    case 'V1cInputBundle':
      return {
        target_node_id: 'v1c.entry',
        route_signal: 'v1c_bundle_published',
        payload_schema_version: 'V1cInputBundle@v1',
      };
    default:
      throw new AppError(500, 'INTERNAL_ERROR', `T-107 harness closure cannot build handoff kind ${handoffKind}.`);
  }
}

export function nextNodeForImplementedHandoff(
  nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
): TopicSelectionV1bWorkflowHarnessNodeId | null {
  switch (nodeId) {
    case 'topic-selection.v1b.create-intake-snapshot.v1':
      return 'topic-selection.v1b.record-research-constraint-profile.v1';
    case 'topic-selection.v1b.record-research-constraint-profile.v1':
      return 'topic-selection.v1b.assess-intake-readiness.v1';
    case 'topic-selection.v1b.assess-intake-readiness.v1':
      return 'topic-selection.v1b.generate-research-slice-options.v1';
    case 'topic-selection.v1b.generate-research-slice-options.v1':
      return 'topic-selection.v1b.select-research-slice.v1';
    case 'topic-selection.v1b.select-research-slice.v1':
      return 'topic-selection.v1b.generate-topic-question-candidates.v1';
    case 'topic-selection.v1b.generate-topic-question-candidates.v1':
      return 'topic-selection.v1b.materialize-topic-question-contract.v1';
    case 'topic-selection.v1b.materialize-topic-question-contract.v1':
      return 'topic-selection.v1b.assess-topic-value.v1';
    case 'topic-selection.v1b.assess-topic-value.v1':
      return 'topic-selection.v1b.decide-value-disposition.v1';
    case 'topic-selection.v1b.decide-value-disposition.v1':
      return 'topic-selection.v1b.create-draft-topic-package.v1';
    case 'topic-selection.v1b.create-draft-topic-package.v1':
      return 'topic-selection.v1b.publish-v1c-input-bundle.v1';
    default:
      return null;
  }
}

export function routeTargetNode(
  nodeId: TopicSelectionV1bWorkflowHarnessNodeId,
  routeDecision: TopicSelectionV1bWorkflowHarnessRouteDecision,
): TopicSelectionV1bWorkflowHarnessNodeId | null {
  if (routeDecision === 'invoke_next') {
    return nextNodeForImplementedHandoff(nodeId);
  }
  if (nodeId === 'topic-selection.v1b.generate-research-slice-options.v1' && routeDecision === 'expand_evidence') {
    return 'topic-selection.v1b.create-intake-snapshot.v1';
  }
  if (nodeId === 'topic-selection.v1b.generate-research-slice-options.v1' && routeDecision === 'reframe_scope') {
    return 'topic-selection.v1b.record-research-constraint-profile.v1';
  }
  if (nodeId === 'topic-selection.v1b.select-research-slice.v1' && routeDecision === 'loopback') {
    return 'topic-selection.v1b.generate-research-slice-options.v1';
  }
  if (nodeId === 'topic-selection.v1b.generate-topic-question-candidates.v1' && routeDecision === 'loopback') {
    return 'topic-selection.v1b.generate-topic-question-candidates.v1';
  }
  if (nodeId === 'topic-selection.v1b.materialize-topic-question-contract.v1' && routeDecision === 'loopback') {
    return 'topic-selection.v1b.generate-topic-question-candidates.v1';
  }
  if (nodeId === 'topic-selection.v1b.assess-topic-value.v1' && routeDecision === 'loopback') {
    return 'topic-selection.v1b.materialize-topic-question-contract.v1';
  }
  return null;
}
