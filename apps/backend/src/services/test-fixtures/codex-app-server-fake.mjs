// Scripted stand-in for `codex app-server` over stdio, for the App Server client's unit tests. It
// speaks the wire shape the T-152 spike observed on codex-cli 0.153.4 and behaves per argv[2]:
//   complete  one turn: an agent message, a usage update, turn/completed
//   ask       the turn first raises item/tool/requestUserInput; the final message echoes the answer
//   hang      the turn never completes; turn/interrupt is acknowledged and logged on stderr
//   exit      the process dies right after the turn starts

import { createInterface } from 'node:readline';

const scenario = process.argv[2] ?? 'complete';
const send = (message, done) => process.stdout.write(`${JSON.stringify(message)}\n`, done);
let threads = 0;
let turns = 0;
let pendingQuestion = null;

const complete = (threadId, turnId, text) => {
  const at = Date.now();
  send({
    method: 'item/completed',
    params: {
      threadId, turnId, completedAtMs: at,
      item: { type: 'agentMessage', id: `item_${turnId}`, text, phase: 'final_answer', memoryCitation: null, delivery: null, questions: null },
    },
    emittedAtMs: at,
  });
  const usage = { totalTokens: 125, inputTokens: 100, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 25, reasoningOutputTokens: 5 };
  send({ method: 'thread/tokenUsage/updated', params: { threadId, turnId, tokenUsage: { total: usage, last: usage, modelContextWindow: 1000 } }, emittedAtMs: at });
  send({
    method: 'turn/completed',
    params: { threadId, turn: { id: turnId, items: [], itemsView: 'full', status: 'completed', error: null, startedAt: null, completedAt: null, durationMs: 1 } },
    emittedAtMs: at,
  });
};

createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  const { id, method, params } = message;
  if (method === undefined) {
    // The client's answer to our server request: finish the turn by echoing it.
    if (pendingQuestion !== null) {
      complete(pendingQuestion.threadId, pendingQuestion.turnId, JSON.stringify(message.result ?? message.error));
      pendingQuestion = null;
    }
    return;
  }
  switch (method) {
    case 'initialize':
      send({ id, result: { userAgent: 'fake-codex-app-server/0', codexHome: process.env.CODEX_HOME ?? '', platformFamily: 'unix', platformOs: 'test' } });
      return;
    case 'initialized':
      return;
    case 'thread/start': {
      const threadId = `thread_${String(++threads)}`;
      send({ id, result: { thread: { id: threadId, ephemeral: params.ephemeral === true }, model: params.model ?? 'fake' } });
      send({ method: 'thread/started', params: { thread: { id: threadId } }, emittedAtMs: Date.now() });
      return;
    }
    case 'turn/start': {
      const turnId = `turn_${String(++turns)}`;
      const { threadId } = params;
      send({ id, result: { turn: { id: turnId, status: 'inProgress' } } });
      send({ method: 'turn/started', params: { threadId, turn: { id: turnId, status: 'inProgress' } }, emittedAtMs: Date.now() }, () => {
        if (scenario === 'exit') { process.exit(2); }
      });
      if (scenario === 'hang' || scenario === 'exit') { return; }
      if (scenario === 'ask') {
        pendingQuestion = { threadId, turnId };
        send({ id: 'server_1', method: 'item/tool/requestUserInput', params: { threadId, turnId, itemId: 'item_question', questions: [], isBlocking: true, autoResolutionMs: null } });
        return;
      }
      complete(threadId, turnId, '{"verdict":"supported"}');
      return;
    }
    case 'turn/interrupt':
      process.stderr.write(`interrupt ${params.turnId}\n`);
      send({ id, result: {} });
      return;
    case 'thread/unsubscribe':
      send({ id, result: { status: 'unsubscribed' } });
      return;
    default:
      send({ id, error: { code: -32601, message: `unknown method ${method}` } });
  }
});
