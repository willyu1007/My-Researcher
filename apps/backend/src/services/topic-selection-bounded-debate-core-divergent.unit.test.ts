// T-127 W-07 (core-gen slice) — direct unit test for the ADDITIVE divergent fan-out walk on the
// shared bounded-debate core. The per-role-turn primitive (generateRoleArtifact) is already covered
// by the N8 + v1c-N2 bounded-debate suites and is left byte-identical here; this test isolates the
// NEW logic runDivergentLoop introduces: per-stage fan-out arity, append-only prior-artifact
// threading, the deterministic loop_transcript_hash fold over a variable-arity set, blocked
// propagation (failed_slot + failed_instance_index), and the misconfiguration guards. It fakes the
// per-turn primitive via a subclass so no orchestrator/control-plane machinery is needed.

import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalHash } from './topic-selection-v1b-harness-authority-hash.js';
import { TopicSelectionBoundedDebateCoreService } from './topic-selection-bounded-debate-core-service.js';
import type { DivergentDebateStrategy } from './topic-selection-bounded-debate-strategy.js';

type Artifact = { slot: string; instanceIndex: number; hash: string };
type Inputs = { instanceIndex: number };
type Strat = DivergentDebateStrategy<unknown, string, Record<string, unknown>, Artifact, Inputs>;

// A core whose per-role-turn primitive is replaced by a deterministic fake, isolating the divergent
// walk. The fake records each turn (slot/instance/prior count) and can be told to block at a point.
class FakeTurnCore extends TopicSelectionBoundedDebateCoreService {
  public readonly turns: Array<{ slot: string; instanceIndex: number; priorCount: number }> = [];

  constructor(private readonly blockAt?: { slot: string; instanceIndex: number }) {
    super({ controlPlane: {} as never, agentOrchestrator: {} as never });
  }

  override async generateRoleArtifact(_strategy: never, ctx: never): Promise<never> {
    const turnCtx = ctx as unknown as { slotId: string; priorRoleArtifacts: Artifact[]; invocationInputs: Inputs };
    const instanceIndex = turnCtx.invocationInputs.instanceIndex;
    this.turns.push({ slot: turnCtx.slotId, instanceIndex, priorCount: turnCtx.priorRoleArtifacts.length });
    if (this.blockAt && this.blockAt.slot === turnCtx.slotId && this.blockAt.instanceIndex === instanceIndex) {
      return {
        status: 'blocked',
        invocation_result: { status: 'blocked' },
        context_packet_ref: { ref_type: 'artifact_ref', ref_id: 'ctx', title_card_id: null },
        context_packet_hash: 'f'.repeat(64),
      } as never;
    }
    const role_artifact: Artifact = { slot: turnCtx.slotId, instanceIndex, hash: canonicalHash([turnCtx.slotId, instanceIndex]) };
    return {
      status: 'succeeded',
      role_artifact,
      structured_output: { slot: turnCtx.slotId, instanceIndex },
      invocation_result: { status: 'succeeded' },
      context_packet_ref: { ref_type: 'artifact_ref', ref_id: 'ctx', title_card_id: null },
      context_packet_hash: 'f'.repeat(64),
    } as never;
  }
}

function makeStrategy(overrides: Partial<Strat> = {}): Strat {
  const arity: Record<string, number> = { explorer: 2, critic: 1, arbiter: 1 };
  return {
    roleOrder: ['explorer', 'critic', 'arbiter'],
    debateLoopId: 'test_divergent_loop_001',
    instanceCountFor: (slot: string) => arity[slot] ?? 1,
    priorRoleArtifactHashOf: (a: Artifact) => ({ slotId: a.slot, hash: a.hash }),
    // The remaining per-turn hooks are never reached (generateRoleArtifact is faked).
    ...overrides,
  } as unknown as Strat;
}

const BASE = {
  handoff: null,
  workflowRunId: 'wf_divergent_001',
  nodeAttemptId: 'na_divergent_001',
  executionMode: 'mocked_llm',
  runMode: 'test',
  policyVersion: null,
  modelOptionId: null,
  createdBy: 'system',
} as never;

const perInstance = (_slot: string, instanceIndex: number): Inputs => ({ instanceIndex });

test('runDivergentLoop fans out per-stage arity, threads prior artifacts, folds a deterministic transcript hash', async () => {
  const core = new FakeTurnCore();
  const result = await core.runDivergentLoop(makeStrategy(), BASE, perInstance);
  assert.equal(result.status, 'completed');
  if (result.status !== 'completed') return;

  // 2 explorer + 1 critic + 1 arbiter = 4 turns, in stage/instance order.
  assert.equal(result.ordered_role_artifacts.length, 4);
  assert.deepEqual(
    core.turns.map((t) => `${t.slot}#${t.instanceIndex}`),
    ['explorer#0', 'explorer#1', 'critic#0', 'arbiter#0'],
  );
  // Prior artifacts thread append-only: each turn sees all completed-so-far.
  assert.deepEqual(core.turns.map((t) => t.priorCount), [0, 1, 2, 3]);

  // loop_transcript_hash = canonicalHash([loopId, [[slot, arity], ...], ordered artifact hashes]).
  const orderedHashes = result.ordered_role_artifacts.map((a) => a.hash);
  const expected = canonicalHash([
    'test_divergent_loop_001',
    [['explorer', 2], ['critic', 1], ['arbiter', 1]],
    orderedHashes,
  ]);
  assert.equal(result.loop_transcript_hash, expected);
  assert.match(result.loop_transcript_hash, /^[a-f0-9]{64}$/);
  assert.equal(result.final_role_artifact.slot, 'arbiter');
});

test('runDivergentLoop transcript hash is reproducible across fresh runs', async () => {
  const a = await new FakeTurnCore().runDivergentLoop(makeStrategy(), BASE, perInstance);
  const b = await new FakeTurnCore().runDivergentLoop(makeStrategy(), BASE, perInstance);
  assert.equal(a.status, 'completed');
  assert.equal(b.status, 'completed');
  if (a.status === 'completed' && b.status === 'completed') {
    assert.equal(a.loop_transcript_hash, b.loop_transcript_hash);
  }
});

test('runDivergentLoop transcript hash changes when fan-out arity changes', async () => {
  const two = await new FakeTurnCore().runDivergentLoop(makeStrategy(), BASE, perInstance);
  const three = await new FakeTurnCore().runDivergentLoop(
    makeStrategy({ instanceCountFor: (slot: string) => (slot === 'explorer' ? 3 : 1) }),
    BASE,
    perInstance,
  );
  assert.equal(two.status, 'completed');
  assert.equal(three.status, 'completed');
  if (two.status === 'completed' && three.status === 'completed') {
    assert.notEqual(two.loop_transcript_hash, three.loop_transcript_hash);
    assert.equal(three.ordered_role_artifacts.length, 5); // 3 explorer + 1 critic + 1 arbiter
  }
});

test('runDivergentLoop propagates a blocked turn with failed slot + instance index', async () => {
  const core = new FakeTurnCore({ slot: 'explorer', instanceIndex: 1 });
  const result = await core.runDivergentLoop(makeStrategy(), BASE, perInstance);
  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;
  assert.equal(result.failed_slot, 'explorer');
  assert.equal(result.failed_instance_index, 1);
  assert.equal(result.ordered_role_artifacts.length, 1); // only explorer#0 completed before the block
});

test('runDivergentLoop rejects empty role order, duplicate stage slots, and invalid arity', async () => {
  const core = new FakeTurnCore();
  await assert.rejects(
    () => core.runDivergentLoop(makeStrategy({ roleOrder: [] }), BASE, perInstance),
    /empty role order/,
  );
  await assert.rejects(
    () => core.runDivergentLoop(makeStrategy({ roleOrder: ['explorer', 'explorer'] }), BASE, perInstance),
    /duplicate stage slots/,
  );
  await assert.rejects(
    () => core.runDivergentLoop(makeStrategy({ instanceCountFor: () => 0 }), BASE, perInstance),
    /invalid instance count/,
  );
});
