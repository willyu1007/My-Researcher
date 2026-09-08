// T-151 Phase 2: the product's MCP tool surface, independent of how it is transported.
//
// Two things live here because they must hold identically on the native 2026-07-28 path and through
// the compatibility shim, and putting them at the transport edge would mean writing them twice:
//
//  - Scope. MCP 2026-07-28 removes protocol-level sessions and directs servers that need cross-call
//    state to use explicit, server-minted handles passed as ordinary tool arguments. So an
//    invocation attempt mints a handle, the model passes it back on every call, and the server
//    resolves what that handle may see. This is revision-agnostic by construction.
//  - Budget. An agentic tool loop cannot be estimated ahead of time, so the product's pre-flight
//    token-budget gate is not the authority for this line. This server observes every call, which
//    makes it the only place a runtime budget can actually be enforced.

import { randomUUID } from 'node:crypto';

export interface TopicSelectionMcpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** One unit of the attempt's frozen evidence bundle. `index_fields` is what the index tool exposes,
 *  and choosing it is the whole design problem: a probe showed that an index carrying no
 *  discriminating signal makes an agent read the entire corpus one unit at a time, which cost four
 *  times as much and took twenty times as long as answering from a stuffed prompt. */
export interface TopicSelectionMcpEvidenceUnit {
  id: string;
  index_fields: Record<string, string | number | boolean | null>;
  body: string;
}

export interface TopicSelectionMcpScope {
  handle: string;
  invocation_attempt_id: string;
  workflow_run_id: string;
  /** Which tool scope this handle may reach. A research role must never hold an orchestration
   *  handle, which is what keeps a workflow input from gaining the power to advance the workflow. */
  scope_id: string;
  read_budget: number;
  /** The attempt's frozen bundle travels with the handle, so a handle can only ever reach the
   *  evidence its own attempt was authorised to see. */
  evidence: readonly TopicSelectionMcpEvidenceUnit[];
}

export interface TopicSelectionMcpMintScopeInput {
  invocation_attempt_id: string;
  workflow_run_id: string;
  scope_id: string;
  read_budget: number;
  evidence: readonly TopicSelectionMcpEvidenceUnit[];
}

export const TOPIC_SELECTION_MCP_REFUSALS = [
  'UNKNOWN_HANDLE',
  'SCOPE_MISMATCH',
  'READ_BUDGET_EXCEEDED',
  'UNKNOWN_TOOL',
  'INVALID_ARGUMENTS',
] as const;
export type TopicSelectionMcpRefusal = (typeof TOPIC_SELECTION_MCP_REFUSALS)[number];

export type TopicSelectionMcpToolResult =
  | { status: 'ok'; text: string; reads_charged: number }
  | { status: 'refused'; refusal: TopicSelectionMcpRefusal; text: string };

export interface TopicSelectionMcpToolHandler {
  definition: TopicSelectionMcpToolDefinition;
  /** The scope this tool belongs to; a handle for another scope is refused before the handler runs. */
  scope_id: string;
  /** Reads to charge against the handle's budget. Returning 0 keeps an index tool free, which is
   *  what lets an agent look before it chooses. */
  reads: (args: Record<string, unknown>) => number;
  run: (args: Record<string, unknown>, scope: TopicSelectionMcpScope) => Promise<string>;
}

/** Handles live for one invocation attempt. Nothing here is persisted: a handle that outlives the
 *  attempt would be a second, unaudited way into the product's data. */
export class TopicSelectionMcpScopeStore {
  private readonly scopes = new Map<string, TopicSelectionMcpScope & { reads_used: number }>();

  constructor(private readonly mintHandle: () => string = () => `mcp_${randomUUID()}`) {}

  mint(input: TopicSelectionMcpMintScopeInput): TopicSelectionMcpScope {
    const scope = { handle: this.mintHandle(), ...input, reads_used: 0 };
    this.scopes.set(scope.handle, scope);
    return { ...scope };
  }

  resolve(handle: string): (TopicSelectionMcpScope & { reads_used: number }) | null {
    return this.scopes.get(handle) ?? null;
  }

  /** Called only after a handler succeeds, so a refused call never spends budget. */
  charge(handle: string, reads: number): void {
    const scope = this.scopes.get(handle);
    if (scope) {
      scope.reads_used += reads;
    }
  }

  release(handle: string): void {
    this.scopes.delete(handle);
  }
}

export class TopicSelectionMcpToolSurfaceService {
  private readonly handlers: Map<string, TopicSelectionMcpToolHandler>;

  constructor(
    handlers: readonly TopicSelectionMcpToolHandler[],
    private readonly scopes: TopicSelectionMcpScopeStore,
  ) {
    this.handlers = new Map(handlers.map((handler) => [handler.definition.name, handler]));
  }

  /** Tool listing is not scoped: a handle is presented per call, not per connection, because the
   *  current revision has no connection-level state to hang a scope on. */
  listTools(scopeId?: string): TopicSelectionMcpToolDefinition[] {
    return [...this.handlers.values()]
      .filter((handler) => scopeId === undefined || handler.scope_id === scopeId)
      .map((handler) => handler.definition);
  }

  async call(name: string, rawArgs: unknown): Promise<TopicSelectionMcpToolResult> {
    const handler = this.handlers.get(name);
    if (!handler) {
      return refuse('UNKNOWN_TOOL', `No tool named ${name}.`);
    }
    if (typeof rawArgs !== 'object' || rawArgs === null || Array.isArray(rawArgs)) {
      return refuse('INVALID_ARGUMENTS', 'Tool arguments must be an object.');
    }
    const args = rawArgs as Record<string, unknown>;
    const handle = typeof args.handle === 'string' ? args.handle : '';
    const scope = this.scopes.resolve(handle);
    if (!scope) {
      return refuse('UNKNOWN_HANDLE', 'The supplied handle is not valid for this invocation.');
    }
    if (scope.scope_id !== handler.scope_id) {
      return refuse(
        'SCOPE_MISMATCH',
        `A ${scope.scope_id} handle may not call ${name}, which belongs to ${handler.scope_id}.`,
      );
    }

    const reads = Math.max(0, handler.reads(args));
    if (scope.reads_used + reads > scope.read_budget) {
      return refuse(
        'READ_BUDGET_EXCEEDED',
        `This task's read budget of ${scope.read_budget} is exhausted (${scope.reads_used} used). `
        + 'Answer from what you already have.',
      );
    }

    const text = await handler.run(args, { ...scope });
    this.scopes.charge(handle, reads);
    return { status: 'ok', text, reads_charged: reads };
  }
}

function refuse(refusal: TopicSelectionMcpRefusal, text: string): TopicSelectionMcpToolResult {
  return { status: 'refused', refusal, text };
}

export const TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE = 'research_role';

/** The two tools a research role needs, and no more. The index is free so the agent can look before
 *  it chooses; the fetch is batched and charged, so selecting well is cheaper than enumerating. */
export function createTopicSelectionResearchRoleTools(): TopicSelectionMcpToolHandler[] {
  return [
    {
      scope_id: TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
      definition: {
        name: 'list_evidence',
        description:
          'Index of every evidence unit available for this task, with the fields that distinguish '
          + 'them. Free to call. Use it to decide which units are worth reading in full.',
        inputSchema: {
          type: 'object',
          required: ['handle'],
          additionalProperties: false,
          properties: { handle: { type: 'string', description: 'The handle supplied with this task.' } },
        },
      },
      reads: () => 0,
      run: async (_args, scope) => {
        if (scope.evidence.length === 0) {
          return 'No evidence units are available for this task.';
        }
        const columns = ['id', ...Object.keys(scope.evidence[0]!.index_fields)];
        const rows = scope.evidence.map((unit) => [
          unit.id,
          ...columns.slice(1).map((column) => String(unit.index_fields[column] ?? '')),
        ].join(' | '));
        return [columns.join(' | '), ...rows].join('\n');
      },
    },
    {
      scope_id: TOPIC_SELECTION_MCP_RESEARCH_ROLE_SCOPE,
      definition: {
        name: 'read_evidence',
        description:
          'Read the full text of one or more evidence units. Pass every id you need in a single '
          + 'call. Each unit counts against this task\'s read budget.',
        inputSchema: {
          type: 'object',
          required: ['handle', 'ids'],
          additionalProperties: false,
          properties: {
            handle: { type: 'string' },
            ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
          },
        },
      },
      reads: (args) => (Array.isArray(args.ids) ? args.ids.length : 0),
      run: async (args, scope) => {
        const ids = (args.ids as unknown[]).map((id) => String(id));
        return ids
          .map((id) => scope.evidence.find((unit) => unit.id === id)?.body
            ?? `No evidence unit ${id} is available for this task.`)
          .join('\n\n');
      },
    },
  ];
}
