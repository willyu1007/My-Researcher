// Experiment-foundation protocol hash (T-131, decision anchored in T-118 07 + T-131 02).
//
// Hashes a PROTOCOL DEFINITION (not a repo tree): sha256 over a canonically-serialized JSON
// document containing { repo_url, git_head, entrypoint_shape, key_knobs, metric_definitions }.
// Rationale: repo trees live outside this repo and are not recomputable here; local paths and
// throwaway-workspace content are unstable. The definition document IS what a RunRecipe lock
// needs to pin.
//
// Tiers:
//   faithful      — hash of the pristine protocol definition only.
//   cpu_adapter   — same document PLUS the adapter patch digest (the patch set changes the
//                   actually-executed protocol, so tier semantics must enter the hash).
//
// Canonical serialization: recursively sort object keys, no whitespace, UTF-8. Arrays keep
// their order (order is semantic for metric tables and patch lists).
//
// Usage:
//   node .ai/scripts/experiment-foundation-protocol-hash.mjs <protocol-definition.json> [--tier cpu_adapter|faithful]
//     The definition file must contain { tier, definition: {...}, adapter_patch_digest? }.
//     Prints the tier-qualified hash line: `<tier>:sha256:<hex>`.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function computeProtocolHash(document) {
  const tier = document.tier;
  if (tier !== 'faithful' && tier !== 'cpu_adapter') {
    throw new Error(`tier must be faithful|cpu_adapter, got ${tier}`);
  }
  if (!document.definition || typeof document.definition !== 'object') {
    throw new Error('document.definition object is required');
  }
  const hashInput = {
    tier,
    definition: document.definition,
    ...(tier === 'cpu_adapter'
      ? { adapter_patch_digest: requireString(document.adapter_patch_digest, 'adapter_patch_digest (required for cpu_adapter tier)') }
      : {}),
  };
  const digest = createHash('sha256').update(canonicalJson(hashInput), 'utf8').digest('hex');
  return `${tier}:sha256:${digest}`;
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (invokedDirectly) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node experiment-foundation-protocol-hash.mjs <protocol-definition.json>');
    process.exit(1);
  }
  const document = JSON.parse(readFileSync(file, 'utf8'));
  console.log(computeProtocolHash(document));
}
