import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import {
  TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION,
  topicSelectionModelProfileRegistrySchema,
  type TopicSelectionModelProfileRegistry,
} from './topic-selection-agent-profile-contracts.js';

function validRegistry(): TopicSelectionModelProfileRegistry {
  return {
    schema_version: TOPIC_SELECTION_MODEL_PROFILE_REGISTRY_SCHEMA_VERSION,
    profiles: [
      {
        profile_id: 'topic-selection.need-discovery.explorer.v1',
        profile_version: 'v1',
        status: 'active',
        profile_function: 'need_discovery_exploration',
        role_family: 'explorer',
        stage_family: 'round_1_discovery',
        quality_objectives: ['broaden_candidate_framing'],
        allowed_execution_modes: ['mocked_llm', 'provider_llm', 'codex_assisted'],
        run_mode_eligibility: {
          mocked_llm: ['test', 'acceptance'],
          codex_assisted: ['acceptance', 'product'],
          codex_cli: [],
          provider_llm: ['acceptance', 'product'],
        },
        required_capabilities: ['structured_output', 'json_schema'],
        output_contract: 'NeedDiscoveryExplorerNotes@v1',
        model_options: [
          {
            option_id: 'topic-selection.need-discovery.explorer.v1.openai-balanced',
            option_purpose: 'default_balanced_provider_run',
            provider_id: 'openai',
            model_id: 'gpt-5.5',
            use_when: ['default_provider_run'],
            request_policy: {
              timeout_ms: 180000,
            },
            normalized_params: {
              creativity: 'medium',
              reasoning_depth: 'high',
              output_budget: 'medium',
              structured_output_required: true,
              output_format: 'json_schema',
            },
            provider_overrides: {},
            capability_degrade_policy: {
              allow_optional_degrade: false,
            },
          },
        ],
        provider_fallback_policy: {
          automatic_fallback: false,
          manual_rerun_allowed: true,
          explicit_profile_override_allowed: true,
          provider_failure_result: 'blocked',
          record_failure_artifact: true,
        },
        failure_handling_policy: {
          technical_retry: {
            enabled: true,
            max_provider_call_attempts: 2,
            retryable_error_classes: ['network_timeout'],
            require_same_profile: true,
            require_same_model_option: true,
            require_same_prompt_packet_hash: true,
            require_same_context_packet_hashes: true,
          },
          semantic_retry: {
            enabled: false,
          },
          provider_fallback: {
            automatic_fallback: false,
          },
          supplemental_round: {
            is_retry: false,
            requires_arbiter_scoped_questions: true,
          },
        },
        audit_policy: {
          store_prompt_hash: true,
          store_response_hash: true,
          store_structured_output: true,
          store_raw_provider_response: false,
          forbid_hidden_reasoning: true,
        },
        budget_policy: {
          max_provider_attempts: 1,
          max_estimated_cost_usd: null,
        },
      },
    ],
  };
}

async function validatesBody(schema: Record<string, unknown>, body: unknown): Promise<boolean> {
  const app = Fastify();
  app.post('/validate', { schema: { body: schema } }, async () => ({ ok: true }));
  try {
    const result = await app.inject({
      method: 'POST',
      url: '/validate',
      payload: body as Record<string, unknown>,
    });
    return result.statusCode === 200;
  } finally {
    await app.close();
  }
}

test('topic-selection model profile registry schema accepts DMP v1 profile shape', async () => {
  assert.equal(await validatesBody(topicSelectionModelProfileRegistrySchema, validRegistry()), true);
});

test('topic-selection model profile registry schema rejects invalid normalized params', async () => {
  const registry = validRegistry() as unknown as Record<string, unknown>;
  const profile = (registry.profiles as Array<Record<string, unknown>>)[0]!;
  const option = (profile.model_options as Array<Record<string, unknown>>)[0]!;
  option.normalized_params = {
    ...(option.normalized_params as Record<string, unknown>),
    creativity: 'temperature_0_3',
  };

  assert.equal(await validatesBody(topicSelectionModelProfileRegistrySchema, registry), false);
});

test('topic-selection model profile registry schema rejects automatic fallback and semantic retry', async () => {
  const registry = validRegistry() as unknown as Record<string, unknown>;
  const profile = (registry.profiles as Array<Record<string, unknown>>)[0]!;
  profile.provider_fallback_policy = {
    ...(profile.provider_fallback_policy as Record<string, unknown>),
    automatic_fallback: true,
  };

  assert.equal(await validatesBody(topicSelectionModelProfileRegistrySchema, registry), false);
});
