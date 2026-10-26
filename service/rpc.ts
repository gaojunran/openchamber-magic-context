import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

/**
 * Read-only client for the Magic Context plugin's private loopback RPC.
 *
 * Wire: GET /health (identity check), POST /rpc/<method> with a bearer token.
 * Discovery: ~/.local/share/cortexkit/magic-context/rpc/<hash>/port-*.json,
 * hash = sha256(directory without trailing slashes).slice(0, 16).
 *
 * Only the two read methods below are ever addressed. The plugin has no
 * `activity-status` method; asking for it returns 404.
 */
const run = promisify(execFile);

const RPC_ROOT = join(homedir(), '.local/share/cortexkit/magic-context/rpc');
const MAX_PORT_FILES = 64;
const MAX_PORT_FILE_BYTES = 8 * 1024;
const MAX_HEALTH_BYTES = 8 * 1024;
const MAX_RPC_BYTES = 512 * 1024;
const HEALTH_TIMEOUT_MS = 2_000;
const CALL_TIMEOUT_MS = 2_000;
const GIT_TIMEOUT_MS = 2_000;
const TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

export const RPC_METHODS = ['sidebar-snapshot', 'status-detail'] as const;
export type RpcMethod = (typeof RPC_METHODS)[number];

export type RpcComposition = {
  systemPromptTokens: number;
  compartmentTokens: number;
  factTokens: number;
  memoryTokens: number;
  docsTokens: number;
  profileTokens: number;
  conversationTokens: number;
  toolCallTokens: number;
  toolDefinitionTokens: number;
};

export type RpcUsage = {
  usagePercentage: number | null;
  nativeContextUsagePercentage: number | null;
  inputTokens: number | null;
  contextLimit: number | null;
};

export type RpcThresholds = {
  executeThreshold: number | null;
  executeThresholdTokens: number | null;
  executeThresholdMode: string | null;
  usableSoft: number | null;
  usableHard: number | null;
};

export type RpcCache = {
  ttl: string | null;
  ttlMs: number | null;
  remainingMs: number | null;
  expired: boolean | null;
};

export type RpcDreamer = {
  backlog: Record<string, { pending: number | null; total: number | null }>;
  lastRunAt: string | null;
  failures: string[];
  skipped: string[];
};

export type RpcTailHygiene = {
  u: number | null;
  t: number | null;
  severity: number | null;
  reclaimableToolOutputCount: number | null;
};

export type RpcEmbedding = {
  state: string | null;
  indexed: number | null;
  total: number | null;
};

export type RpcCounts = {
  compartments: number | null;
  archivedCompartments: number | null;
  memories: number | null;
  memoryBlocks: number | null;
  pendingOperations: number | null;
  sessionNotes: number | null;
  readySmartNotes: number | null;
};

export type RpcStorageVersions = {
  contextDbSchemaVersion: number | null;
  pluginSupportedVersion: number | null;
};

export type RpcLiveData = {
  composition: RpcComposition | null;
  usage: RpcUsage;
  counts: RpcCounts;
  cache: RpcCache | null;
  thresholds: RpcThresholds | null;
  dreamer: RpcDreamer | null;
  tailHygiene: RpcTailHygiene | null;
  embedding: RpcEmbedding | null;
  pluginVersion: string | null;
  storageVersions: RpcStorageVersions | null;
  projectIdentity: string | null;
  hasSessionSample: boolean;
};

export type RpcLiveResult =
  | {
    kind: 'ok';
    source: 'rpc';
    method: RpcMethod;
    observedAt: string;
    data: RpcLiveData;
    reason?: string;
  }
  | {
    kind: 'unavailable';
    source: 'none';
    observedAt: string;
    reason: string;
  };

type RpcEndpoint = {
  port: number;
  token: string;
  instanceId: string;
  directory: string;
};

type Discovery =
  | { ok: true; endpoint: RpcEndpoint }
  | { ok: false; reason: string };

type CappedText =
  | { ok: true; text: string }
  | { ok: false; reason: string };

const reasonFromError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') return 'rpc-timeout';
    return `rpc-unreachable: ${error.message}`;
  }
  return 'rpc-unreachable';
};

const readCapped = async (response: Response, maxBytes: number): Promise<CappedText> => {
  const reader = response.body?.getReader();
  if (!reader) return { ok: false, reason: 'rpc-empty-response' };
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: 'rpc-response-too-large' };
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    return { ok: false, reason: reasonFromError(error) };
  }
  return { ok: true, text: Buffer.concat(chunks).toString('utf8') };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asInteger = (value: unknown): number | null => {
  const number = asNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
};

const asText = (value: unknown, maxLength = 200): string | null =>
  typeof value === 'string' && value.length > 0 ? value.slice(0, maxLength) : null;

const asIso = (value: unknown): string | null => {
  const at = asNumber(value);
  if (at === null || at <= 0) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const stripTrailingSlashes = (directory: string): string => {
  if (directory === '/') return '/';
  const stripped = directory.replace(/\/+$/, '');
  return stripped.length > 0 ? stripped : '/';
};

export const directoryHash = (directory: string): string =>
  createHash('sha256').update(stripTrailingSlashes(directory)).digest('hex').slice(0, 16);

const gitTopLevel = async (directory: string): Promise<string | null> => {
  try {
    const { stdout } = await run('git', ['-C', directory, 'rev-parse', '--show-toplevel'], {
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: 8_192,
    });
    const top = stdout.trim();
    return top.startsWith('/') ? top : null;
  } catch {
    return null;
  }
};

const candidateDirectories = async (directory: string): Promise<string[]> => {
  const candidates = [stripTrailingSlashes(directory)];
  const top = await gitTopLevel(directory);
  if (top) {
    const normalized = stripTrailingSlashes(top);
    if (!candidates.includes(normalized)) candidates.push(normalized);
  }
  return candidates;
};

type PortFile = {
  port: number;
  pid: number;
  token: string;
  instanceId: string;
  startedAt: number;
};

const readPortFiles = (rpcDirectory: string): { exists: boolean; files: PortFile[]; malformed: number } => {
  let entries;
  try {
    if (!statSync(rpcDirectory).isDirectory()) return { exists: false, files: [], malformed: 0 };
    entries = readdirSync(rpcDirectory, { withFileTypes: true });
  } catch {
    return { exists: false, files: [], malformed: 0 };
  }
  const names = entries
    .filter((entry) => entry.isFile() && entry.name.startsWith('port-') && entry.name.endsWith('.json'))
    .slice(0, MAX_PORT_FILES);
  const files: PortFile[] = [];
  let malformed = 0;
  for (const entry of names) {
    const path = join(rpcDirectory, entry.name);
    try {
      if (statSync(path).size > MAX_PORT_FILE_BYTES) {
        malformed += 1;
        continue;
      }
      const raw = asRecord(JSON.parse(readFileSync(path, 'utf8')));
      const port = asInteger(raw?.port);
      const pid = asInteger(raw?.pid);
      const token = raw?.token;
      const instanceId = raw?.instance_id;
      const startedAt = asNumber(raw?.started_at) ?? 0;
      if (port === null || port < 1 || port > 65_535 || pid === null || pid < 1
        || typeof token !== 'string' || !TOKEN_PATTERN.test(token)
        || typeof instanceId !== 'string' || instanceId.length === 0 || instanceId.length > 128) {
        malformed += 1;
        continue;
      }
      files.push({ port, pid, token, instanceId, startedAt });
    } catch {
      malformed += 1;
    }
  }
  files.sort((left, right) => right.startedAt - left.startedAt);
  return { exists: true, files, malformed };
};

const probeHealth = async (file: PortFile): Promise<{ ok: true } | { ok: false; reason: string }> => {
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${file.port}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, reason: reasonFromError(error) };
  }
  if (!response.ok) return { ok: false, reason: `rpc-health-${response.status}` };
  const body = await readCapped(response, MAX_HEALTH_BYTES);
  if (!body.ok) return { ok: false, reason: body.reason };
  try {
    const health = asRecord(JSON.parse(body.text));
    if (health?.ok !== true) return { ok: false, reason: 'rpc-health-mismatch' };
    if (health.pid !== file.pid || health.instance_id !== file.instanceId) {
      return { ok: false, reason: 'rpc-health-mismatch' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'rpc-invalid-response' };
  }
};

export const discoverRpc = async (directory: string | null): Promise<Discovery> => {
  if (!directory) return { ok: false, reason: 'no-directory' };
  const candidates = await candidateDirectories(directory);
  let sawDirectory = false;
  let sawPortFile = false;
  let lastReason = 'rpc-not-running';
  for (const candidate of candidates) {
    const listing = readPortFiles(join(RPC_ROOT, directoryHash(candidate)));
    if (!listing.exists) continue;
    sawDirectory = true;
    if (listing.files.length === 0) continue;
    sawPortFile = true;
    for (const file of listing.files) {
      const health = await probeHealth(file);
      if (health.ok) {
        return {
          ok: true,
          endpoint: {
            port: file.port,
            token: file.token,
            instanceId: file.instanceId,
            directory: candidate,
          },
        };
      }
      lastReason = health.reason;
    }
  }
  if (!sawDirectory) return { ok: false, reason: 'no-project-session' };
  if (!sawPortFile) return { ok: false, reason: 'rpc-not-running' };
  return { ok: false, reason: lastReason };
};

export type RpcCallResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; status: number | null; reason: string };

export const callRpc = async (
  endpoint: RpcEndpoint,
  method: RpcMethod,
  body: Record<string, unknown>,
): Promise<RpcCallResult> => {
  if (!RPC_METHODS.includes(method)) return { ok: false, status: null, reason: 'rpc-method-not-allowed' };
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:${endpoint.port}/rpc/${method}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${endpoint.token}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, status: null, reason: reasonFromError(error) };
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    return { ok: false, status: response.status, reason: `rpc-http-${response.status}` };
  }
  const payload = await readCapped(response, MAX_RPC_BYTES);
  if (!payload.ok) return { ok: false, status: response.status, reason: payload.reason };
  try {
    const data = asRecord(JSON.parse(payload.text));
    if (!data) return { ok: false, status: response.status, reason: 'rpc-invalid-response' };
    return { ok: true, data };
  } catch {
    return { ok: false, status: response.status, reason: 'rpc-invalid-response' };
  }
};

const mapComposition = (raw: Record<string, unknown>): RpcComposition | null => {
  const fields = {
    systemPromptTokens: asNumber(raw.systemPromptTokens),
    compartmentTokens: asNumber(raw.compartmentTokens),
    factTokens: asNumber(raw.factTokens),
    memoryTokens: asNumber(raw.memoryTokens),
    docsTokens: asNumber(raw.docsTokens),
    profileTokens: asNumber(raw.profileTokens),
    conversationTokens: asNumber(raw.conversationTokens),
    toolCallTokens: asNumber(raw.toolCallTokens),
    toolDefinitionTokens: asNumber(raw.toolDefinitionTokens),
  };
  return Object.values(fields).every((value) => value !== null) ? fields as RpcComposition : null;
};

const mapUsage = (raw: Record<string, unknown>): RpcUsage => ({
  usagePercentage: asNumber(raw.usagePercentage),
  nativeContextUsagePercentage: asNumber(raw.native_context_usage_percentage),
  inputTokens: asInteger(raw.inputTokens),
  contextLimit: asInteger(raw.contextLimit),
});

const mapCounts = (raw: Record<string, unknown>): RpcCounts => ({
  compartments: asInteger(raw.compartmentCount),
  archivedCompartments: asInteger(raw.archivedCompartmentCount),
  memories: asInteger(raw.memoryCount),
  memoryBlocks: asInteger(raw.memoryBlockCount),
  pendingOperations: asInteger(raw.pendingOpsCount),
  sessionNotes: asInteger(raw.sessionNoteCount),
  readySmartNotes: asInteger(raw.readySmartNoteCount),
});

const mapThresholds = (raw: Record<string, unknown>): RpcThresholds | null => {
  const geometry = asRecord(raw.windowGeometry);
  const thresholds: RpcThresholds = {
    executeThreshold: asNumber(raw.executeThreshold),
    executeThresholdTokens: asInteger(raw.executeThresholdTokens),
    executeThresholdMode: asText(raw.executeThresholdMode, 32),
    usableSoft: asInteger(geometry?.usableSoft),
    usableHard: asInteger(geometry?.usableHard),
  };
  return Object.values(thresholds).some((value) => value !== null) ? thresholds : null;
};

const mapCache = (raw: Record<string, unknown>): RpcCache | null => {
  const cache: RpcCache = {
    ttl: asText(raw.cacheTtl, 32),
    ttlMs: asInteger(raw.cacheTtlMs),
    remainingMs: asInteger(raw.cacheRemainingMs),
    expired: typeof raw.cacheExpired === 'boolean' ? raw.cacheExpired : null,
  };
  return Object.values(cache).some((value) => value !== null) ? cache : null;
};

const manyText = (value: unknown, cap: number): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, cap)
    .map((entry) => (typeof entry === 'string' ? entry.slice(0, 200) : null))
    .filter((entry): entry is string => entry !== null);
};

const mapDreamer = (raw: Record<string, unknown>): RpcDreamer | null => {
  const backlog: RpcDreamer['backlog'] = {};
  const source = asRecord(raw.dreamerBacklog);
  if (source) {
    for (const [key, value] of Object.entries(source).slice(0, 32)) {
      const entry = asRecord(value);
      if (!entry) continue;
      backlog[key.slice(0, 64)] = {
        pending: asInteger(entry.pending),
        total: asInteger(entry.total),
      };
    }
  }
  const dreamer: RpcDreamer = {
    backlog,
    lastRunAt: asIso(raw.lastDreamerRunAt),
    failures: manyText(raw.dreamerFailures, 20),
    skipped: manyText(raw.dreamerSkipped, 20),
  };
  return Object.keys(backlog).length > 0 || dreamer.lastRunAt !== null
    || dreamer.failures.length > 0 || dreamer.skipped.length > 0 ? dreamer : null;
};

const mapTailHygiene = (raw: Record<string, unknown>): RpcTailHygiene | null => {
  const hygiene = asRecord(raw.tailHygiene);
  if (!hygiene) return null;
  const mapped: RpcTailHygiene = {
    u: asInteger(hygiene.u),
    t: asInteger(hygiene.t),
    severity: asNumber(hygiene.severity),
    reclaimableToolOutputCount: asInteger(hygiene.reclaimableToolOutputCount),
  };
  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
};

const mapEmbedding = (raw: Record<string, unknown>): RpcEmbedding | null => {
  const embedding = asRecord(raw.embedding);
  if (!embedding) return null;
  const mapped: RpcEmbedding = {
    state: asText(embedding.state, 32),
    indexed: asInteger(embedding.indexed),
    total: asInteger(embedding.total),
  };
  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
};

const mapStorageVersions = (raw: Record<string, unknown>): RpcStorageVersions | null => {
  const versions = asRecord(raw.storage_versions);
  if (!versions) return null;
  const mapped: RpcStorageVersions = {
    contextDbSchemaVersion: asInteger(versions.context_db_schema_version),
    pluginSupportedVersion: asInteger(versions.plugin_supported_version),
  };
  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
};

const mapLiveData = (raw: Record<string, unknown>): RpcLiveData => {
  const usage = mapUsage(raw);
  return {
    composition: mapComposition(raw),
    usage,
    counts: mapCounts(raw),
    cache: mapCache(raw),
    thresholds: mapThresholds(raw),
    dreamer: mapDreamer(raw),
    tailHygiene: mapTailHygiene(raw),
    embedding: mapEmbedding(raw),
    pluginVersion: asText(raw.pluginVersion, 64),
    storageVersions: mapStorageVersions(raw),
    projectIdentity: asText(raw.projectIdentity, 256),
    hasSessionSample: (usage.inputTokens ?? 0) > 0 || (asInteger(raw.systemPromptTokens) ?? 0) > 0,
  };
};

export const compositionTotal = (composition: RpcComposition): number =>
  composition.systemPromptTokens + composition.compartmentTokens + composition.factTokens
  + composition.memoryTokens + composition.docsTokens + composition.profileTokens
  + composition.conversationTokens + composition.toolCallTokens + composition.toolDefinitionTokens;

/**
 * Discover the plugin RPC for a directory (falling back to the git top level),
 * then read one live snapshot. Never throws: every failure becomes a reason.
 */
export const readLiveRpc = async ({
  sessionId,
  directory,
}: {
  sessionId: string | null;
  directory: string | null;
}): Promise<RpcLiveResult> => {
  const observedAt = new Date().toISOString();
  const discovery = await discoverRpc(directory);
  if (!discovery.ok) return { kind: 'unavailable', source: 'none', observedAt, reason: discovery.reason };
  if (!sessionId) return { kind: 'unavailable', source: 'none', observedAt, reason: 'no-session' };

  const body = { sessionId, directory: discovery.endpoint.directory };
  let method: RpcMethod = 'status-detail';
  let call = await callRpc(discovery.endpoint, method, body);
  if (!call.ok && call.status === 404) {
    method = 'sidebar-snapshot';
    call = await callRpc(discovery.endpoint, method, body);
  }
  if (!call.ok) return { kind: 'unavailable', source: 'none', observedAt, reason: call.reason };

  const data = mapLiveData(call.data);
  const reason = !data.hasSessionSample
    ? 'no-session-sample'
    : data.composition !== null && data.usage.inputTokens !== null
      && compositionTotal(data.composition) !== data.usage.inputTokens
      ? 'composition-mismatch'
      : data.composition === null
        ? 'composition-unavailable'
        : undefined;
  return {
    kind: 'ok',
    source: 'rpc',
    method,
    observedAt,
    data,
    ...(reason ? { reason } : {}),
  };
};
