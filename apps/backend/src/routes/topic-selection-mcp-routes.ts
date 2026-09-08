// T-151 Phase 2: HTTP transport for the product's MCP tool surface.
//
// Serving MCP from the backend rather than from a spawned stdio subprocess is what lets the tools
// reach the product's own repositories; a subprocess would have needed its own database access.
//
// Two mechanics are load-bearing and were established by probing a real Codex client, because both
// present as an unexplained hang rather than an error:
//   - Codex health-checks `GET /health` at the endpoint's origin before it will initialise. The
//     backend's existing `/health` satisfies that; do not move or gate it.
//   - Codex then holds a `GET` open on the endpoint itself for server-to-client notifications.
//     The current revision replaces that with `subscriptions/listen`, so this route exists only for
//     the revisions the shim serves and can go when the shim does.
//
// Access posture: the backend has no auth infrastructure yet, so reaching this endpoint is reaching
// the tool surface. What actually gates data is the handle — unguessable, minted per invocation
// attempt, released with it — which every tool call must carry. Discovery and listing are open and
// expose only the tool catalogue.

import type { FastifyInstance } from 'fastify';

import type {
  TopicSelectionMcpProtocolService,
} from '../services/topic-selection-mcp-protocol-service.js';

export const TOPIC_SELECTION_MCP_ENDPOINT_PATH = '/topic-selection/mcp';

export async function registerTopicSelectionMcpRoutes(
  fastify: FastifyInstance,
  protocol: TopicSelectionMcpProtocolService,
): Promise<void> {
  fastify.post(TOPIC_SELECTION_MCP_ENDPOINT_PATH, async (request, reply) => {
    const message = (request.body ?? {}) as Record<string, unknown>;
    const response = await protocol.handle(message);
    if (response === null) {
      // A notification carries no id and expects no body.
      return reply.code(202).send();
    }
    return reply.code(200).type('application/json').send(response);
  });

  fastify.get(TOPIC_SELECTION_MCP_ENDPOINT_PATH, async (request, reply) => {
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    // Nothing is pushed yet: the product has no server-to-client notifications on this surface.
    // The stream exists because the shimmed revisions expect it to stay open, and a comment frame
    // keeps intermediaries from closing an idle connection.
    reply.raw.write(': open\n\n');
    const heartbeat = setInterval(() => reply.raw.write(': keep-alive\n\n'), 15_000);
    const stop = (): void => {
      clearInterval(heartbeat);
      reply.raw.end();
    };
    request.raw.on('close', stop);
    request.raw.on('error', stop);
    return reply;
  });
}
