// service/server.ts
import { timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import http from "node:http";

// service/db.ts
import { DatabaseSync } from "node:sqlite";
import { homedir } from "node:os";
import { join } from "node:path";
var CONTEXT_DB_PATH = process.env.MAGIC_CONTEXT_DB ?? join(homedir(), ".local/share/cortexkit/magic-context/context.db");
var MEMORY_STATUSES = ["active", "archived"];
var MEMORY_CATEGORIES = ["ARCHITECTURE", "CONFIG_VALUES", "CONSTRAINTS", "NAMING", "PROJECT_RULES"];
var text = (row, key) => {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};
var num = (row, key) => {
  const value = row[key];
  if (typeof value === "number" && Number.isFinite(value))
    return value;
  return typeof value === "bigint" ? Number(value) : null;
};
var iso = (value) => {
  if (value === null || value <= 0)
    return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
var openReadOnly = () => {
  const db = new DatabaseSync(CONTEXT_DB_PATH, { readOnly: true });
  db.exec("PRAGMA busy_timeout = 2000");
  return db;
};
var readSessionContext = (db, sessionId) => {
  const row = db.prepare(`
    SELECT last_context_percentage, last_input_tokens, last_usage_context_limit, detected_context_limit,
           system_prompt_tokens, conversation_tokens, tool_call_tokens, memory_block_count,
           total_input_tokens, observed_safe_input_tokens, last_response_time,
           compartment_in_progress, is_subagent
    FROM session_meta WHERE session_id = ?
  `).get(sessionId);
  if (!row)
    return null;
  const lastLimit = num(row, "last_usage_context_limit");
  const detected = num(row, "detected_context_limit");
  return {
    lastContextPercentage: num(row, "last_context_percentage"),
    inputTokens: num(row, "last_input_tokens"),
    contextLimit: lastLimit && lastLimit > 0 ? lastLimit : detected && detected > 0 ? detected : null,
    detectedContextLimit: detected,
    systemPromptTokens: num(row, "system_prompt_tokens"),
    conversationTokens: num(row, "conversation_tokens"),
    toolCallTokens: num(row, "tool_call_tokens"),
    memoryBlockCount: num(row, "memory_block_count"),
    totalInputTokens: num(row, "total_input_tokens"),
    observedSafeInputTokens: num(row, "observed_safe_input_tokens"),
    lastResponseAt: iso(num(row, "last_response_time")),
    compartmentInProgress: num(row, "compartment_in_progress") === 1,
    isSubagent: num(row, "is_subagent") === 1
  };
};
var readCompartments = (db, sessionId, limit = 5) => {
  const aggregate = db.prepare("SELECT COUNT(*) AS count, MAX(sequence) AS latest_sequence FROM compartments WHERE session_id = ?").get(sessionId);
  const recent = db.prepare(`
    SELECT id, sequence, title, episode_type, importance, start_message, end_message, created_at
    FROM compartments WHERE session_id = ?
    ORDER BY sequence DESC LIMIT ?
  `).all(sessionId, limit);
  return {
    count: num(aggregate ?? {}, "count") ?? 0,
    latestSequence: num(aggregate ?? {}, "latest_sequence"),
    recent: recent.map((row) => ({
      id: num(row, "id") ?? 0,
      sequence: num(row, "sequence"),
      title: text(row, "title"),
      episodeType: text(row, "episode_type"),
      importance: num(row, "importance"),
      startMessage: num(row, "start_message"),
      endMessage: num(row, "end_message"),
      createdAt: iso(num(row, "created_at"))
    }))
  };
};
var readSchemaVersion = (db) => {
  try {
    const row = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get();
    return row ? num(row, "version") : null;
  } catch {
    return null;
  }
};
var readMemoryCounts = (db, projectId) => {
  const rows = db.prepare("SELECT status, COUNT(*) AS count FROM memories WHERE project_path = ? GROUP BY status").all(projectId);
  const counts = { total: 0, active: 0, archived: 0 };
  for (const row of rows) {
    const count = num(row, "count") ?? 0;
    counts.total += count;
    const status = text(row, "status");
    if (status === "active")
      counts.active = count;
    if (status === "archived")
      counts.archived = count;
  }
  return counts;
};
var readNoteCounts = (db, key, value) => {
  const rows = db.prepare(`SELECT status, COUNT(*) AS count FROM notes WHERE ${key} = ? GROUP BY status`).all(value);
  const counts = { total: 0, active: 0, dismissed: 0 };
  for (const row of rows) {
    const count = num(row, "count") ?? 0;
    const status = text(row, "status");
    counts.total += count;
    if (status)
      counts[status] = count;
  }
  return counts;
};
var escapeLike = (value) => value.replace(/[\\%_]/g, (match) => `\\${match}`);
var readMemories = (db, { projectId, search, status, category, limit, offset }) => {
  const clauses = ["project_path = ?"];
  const params = [projectId];
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (category) {
    clauses.push("category = ?");
    params.push(category);
  }
  if (search) {
    clauses.push("content LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(search)}%`);
  }
  const where = clauses.join(" AND ");
  const total = num(db.prepare(`SELECT COUNT(*) AS count FROM memories WHERE ${where}`).get(...params) ?? {}, "count") ?? 0;
  const rows = db.prepare(`
    SELECT id, category, status, importance, classified_at, content, seen_count, retrieval_count, first_seen_at, updated_at
    FROM memories WHERE ${where}
    ORDER BY importance DESC, updated_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return {
    total,
    rows: rows.map((row) => ({
      id: num(row, "id") ?? 0,
      category: text(row, "category") ?? "ARCHITECTURE",
      status: text(row, "status") ?? "active",
      importance: num(row, "importance"),
      classifiedAt: iso(num(row, "classified_at")),
      content: text(row, "content") ?? "",
      seenCount: num(row, "seen_count"),
      retrievalCount: num(row, "retrieval_count"),
      firstSeenAt: iso(num(row, "first_seen_at")),
      updatedAt: iso(num(row, "updated_at"))
    }))
  };
};
var toNote = (row) => ({
  id: num(row, "id") ?? 0,
  type: text(row, "type") === "smart" ? "smart" : "session",
  status: text(row, "status") ?? "unknown",
  content: text(row, "content") ?? "",
  sessionId: text(row, "session_id"),
  projectId: text(row, "project_path"),
  surfaceCondition: text(row, "surface_condition"),
  createdAt: iso(num(row, "created_at")),
  updatedAt: iso(num(row, "updated_at"))
});
var NOTE_COLUMNS = "id, type, status, content, session_id, project_path, surface_condition, created_at, updated_at";
var readNotes = (db, { sessionId, projectId, includeDismissed = false }) => {
  const session = sessionId ? db.prepare(`
        SELECT ${NOTE_COLUMNS} FROM notes
        WHERE type = 'session' AND session_id = ? AND (? = 1 OR status <> 'dismissed')
        ORDER BY updated_at DESC, id DESC
      `).all(sessionId, includeDismissed ? 1 : 0) : [];
  const smart = projectId ? db.prepare(`
        SELECT ${NOTE_COLUMNS} FROM notes
        WHERE type = 'smart' AND project_path = ? AND status <> 'dismissed'
        ORDER BY updated_at DESC, id DESC
      `).all(projectId) : [];
  return {
    session: session.map(toNote),
    smart: smart.map(toNote),
    sessionCounts: sessionId ? readNoteCounts(db, "session_id", sessionId) : { total: 0, active: 0, dismissed: 0 },
    smartCounts: projectId ? readNoteCounts(db, "project_path", projectId) : { total: 0, active: 0, dismissed: 0 }
  };
};

// service/project.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var run = promisify(execFile);
var ROOT_COMMIT = /^[0-9a-f]{40}$/;
var gitRootCommit = async (directory) => {
  try {
    const { stdout } = await run("git", ["-C", directory, "rev-list", "--max-parents=0", "HEAD"], {
      timeout: 2000,
      maxBuffer: 8192
    });
    const sha = stdout.trim().split(`
`)[0] ?? "";
    return ROOT_COMMIT.test(sha) ? sha : null;
  } catch {
    return null;
  }
};
var resolveProject = async (db, { sessionId, directory }) => {
  if (sessionId && db) {
    const row = db.prepare("SELECT project_path FROM session_projects WHERE session_id = ?").get(sessionId);
    const mapped = row?.project_path;
    if (typeof mapped === "string" && mapped.length > 0) {
      return { project: { id: mapped, source: "session-map" }, reason: null };
    }
  }
  if (directory) {
    const sha = await gitRootCommit(directory);
    if (sha)
      return { project: { id: `git:${sha}`, source: "git-root" }, reason: null };
  }
  return {
    project: null,
    reason: sessionId ? "session-unmapped" : directory ? "not-a-git-repository" : "no-session-or-directory"
  };
};
var isSessionId = (value) => /^[A-Za-z0-9_-]{1,128}$/.test(value);
var isProjectDirectory = (value) => value.startsWith("/") && value.length <= 4096 && !value.includes("\x00");

// service/rpc.ts
import { execFile as execFile2 } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
import { promisify as promisify2 } from "node:util";
var run2 = promisify2(execFile2);
var RPC_ROOT = join2(homedir2(), ".local/share/cortexkit/magic-context/rpc");
var MAX_PORT_FILES = 64;
var MAX_PORT_FILE_BYTES = 8 * 1024;
var MAX_HEALTH_BYTES = 8 * 1024;
var MAX_RPC_BYTES = 512 * 1024;
var HEALTH_TIMEOUT_MS = 2000;
var CALL_TIMEOUT_MS = 2000;
var GIT_TIMEOUT_MS = 2000;
var TOKEN_PATTERN = /^[0-9a-f]{64}$/i;
var RPC_METHODS = ["sidebar-snapshot", "status-detail"];
var reasonFromError = (error) => {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError")
      return "rpc-timeout";
    return `rpc-unreachable: ${error.message}`;
  }
  return "rpc-unreachable";
};
var readCapped = async (response, maxBytes) => {
  const reader = response.body?.getReader();
  if (!reader)
    return { ok: false, reason: "rpc-empty-response" };
  const chunks = [];
  let total = 0;
  try {
    for (;; ) {
      const { done, value } = await reader.read();
      if (done)
        break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, reason: "rpc-response-too-large" };
      }
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    return { ok: false, reason: reasonFromError(error) };
  }
  return { ok: true, text: Buffer.concat(chunks).toString("utf8") };
};
var asRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value) ? value : null;
var asNumber = (value) => typeof value === "number" && Number.isFinite(value) ? value : null;
var asInteger = (value) => {
  const number = asNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
};
var asText = (value, maxLength = 200) => typeof value === "string" && value.length > 0 ? value.slice(0, maxLength) : null;
var asIso = (value) => {
  const at = asNumber(value);
  if (at === null || at <= 0)
    return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
var stripTrailingSlashes = (directory) => {
  if (directory === "/")
    return "/";
  const stripped = directory.replace(/\/+$/, "");
  return stripped.length > 0 ? stripped : "/";
};
var directoryHash = (directory) => createHash("sha256").update(stripTrailingSlashes(directory)).digest("hex").slice(0, 16);
var gitTopLevel = async (directory) => {
  try {
    const { stdout } = await run2("git", ["-C", directory, "rev-parse", "--show-toplevel"], {
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: 8192
    });
    const top = stdout.trim();
    return top.startsWith("/") ? top : null;
  } catch {
    return null;
  }
};
var candidateDirectories = async (directory) => {
  const candidates = [stripTrailingSlashes(directory)];
  const top = await gitTopLevel(directory);
  if (top) {
    const normalized = stripTrailingSlashes(top);
    if (!candidates.includes(normalized))
      candidates.push(normalized);
  }
  return candidates;
};
var readPortFiles = (rpcDirectory) => {
  let entries;
  try {
    if (!statSync(rpcDirectory).isDirectory())
      return { exists: false, files: [], malformed: 0 };
    entries = readdirSync(rpcDirectory, { withFileTypes: true });
  } catch {
    return { exists: false, files: [], malformed: 0 };
  }
  const names = entries.filter((entry) => entry.isFile() && entry.name.startsWith("port-") && entry.name.endsWith(".json")).slice(0, MAX_PORT_FILES);
  const files = [];
  let malformed = 0;
  for (const entry of names) {
    const path = join2(rpcDirectory, entry.name);
    try {
      if (statSync(path).size > MAX_PORT_FILE_BYTES) {
        malformed += 1;
        continue;
      }
      const raw = asRecord(JSON.parse(readFileSync(path, "utf8")));
      const port = asInteger(raw?.port);
      const pid = asInteger(raw?.pid);
      const token = raw?.token;
      const instanceId = raw?.instance_id;
      const startedAt = asNumber(raw?.started_at) ?? 0;
      if (port === null || port < 1 || port > 65535 || pid === null || pid < 1 || typeof token !== "string" || !TOKEN_PATTERN.test(token) || typeof instanceId !== "string" || instanceId.length === 0 || instanceId.length > 128) {
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
var probeHealth = async (file) => {
  let response;
  try {
    response = await fetch(`http://127.0.0.1:${file.port}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS)
    });
  } catch (error) {
    return { ok: false, reason: reasonFromError(error) };
  }
  if (!response.ok)
    return { ok: false, reason: `rpc-health-${response.status}` };
  const body = await readCapped(response, MAX_HEALTH_BYTES);
  if (!body.ok)
    return { ok: false, reason: body.reason };
  try {
    const health = asRecord(JSON.parse(body.text));
    if (health?.ok !== true)
      return { ok: false, reason: "rpc-health-mismatch" };
    if (health.pid !== file.pid || health.instance_id !== file.instanceId) {
      return { ok: false, reason: "rpc-health-mismatch" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "rpc-invalid-response" };
  }
};
var discoverRpc = async (directory) => {
  if (!directory)
    return { ok: false, reason: "no-directory" };
  const candidates = await candidateDirectories(directory);
  let sawDirectory = false;
  let sawPortFile = false;
  let lastReason = "rpc-not-running";
  for (const candidate of candidates) {
    const listing = readPortFiles(join2(RPC_ROOT, directoryHash(candidate)));
    if (!listing.exists)
      continue;
    sawDirectory = true;
    if (listing.files.length === 0)
      continue;
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
            directory: candidate
          }
        };
      }
      lastReason = health.reason;
    }
  }
  if (!sawDirectory)
    return { ok: false, reason: "no-project-session" };
  if (!sawPortFile)
    return { ok: false, reason: "rpc-not-running" };
  return { ok: false, reason: lastReason };
};
var callRpc = async (endpoint, method, body) => {
  if (!RPC_METHODS.includes(method))
    return { ok: false, status: null, reason: "rpc-method-not-allowed" };
  let response;
  try {
    response = await fetch(`http://127.0.0.1:${endpoint.port}/rpc/${method}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${endpoint.token}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS)
    });
  } catch (error) {
    return { ok: false, status: null, reason: reasonFromError(error) };
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {
      return;
    });
    return { ok: false, status: response.status, reason: `rpc-http-${response.status}` };
  }
  const payload = await readCapped(response, MAX_RPC_BYTES);
  if (!payload.ok)
    return { ok: false, status: response.status, reason: payload.reason };
  try {
    const data = asRecord(JSON.parse(payload.text));
    if (!data)
      return { ok: false, status: response.status, reason: "rpc-invalid-response" };
    return { ok: true, data };
  } catch {
    return { ok: false, status: response.status, reason: "rpc-invalid-response" };
  }
};
var mapComposition = (raw) => {
  const fields = {
    systemPromptTokens: asNumber(raw.systemPromptTokens),
    compartmentTokens: asNumber(raw.compartmentTokens),
    factTokens: asNumber(raw.factTokens),
    memoryTokens: asNumber(raw.memoryTokens),
    docsTokens: asNumber(raw.docsTokens),
    profileTokens: asNumber(raw.profileTokens),
    conversationTokens: asNumber(raw.conversationTokens),
    toolCallTokens: asNumber(raw.toolCallTokens),
    toolDefinitionTokens: asNumber(raw.toolDefinitionTokens)
  };
  return Object.values(fields).every((value) => value !== null) ? fields : null;
};
var mapUsage = (raw) => ({
  usagePercentage: asNumber(raw.usagePercentage),
  nativeContextUsagePercentage: asNumber(raw.native_context_usage_percentage),
  inputTokens: asInteger(raw.inputTokens),
  contextLimit: asInteger(raw.contextLimit)
});
var mapCounts = (raw) => ({
  compartments: asInteger(raw.compartmentCount),
  archivedCompartments: asInteger(raw.archivedCompartmentCount),
  memories: asInteger(raw.memoryCount),
  memoryBlocks: asInteger(raw.memoryBlockCount),
  pendingOperations: asInteger(raw.pendingOpsCount),
  sessionNotes: asInteger(raw.sessionNoteCount),
  readySmartNotes: asInteger(raw.readySmartNoteCount)
});
var mapThresholds = (raw) => {
  const geometry = asRecord(raw.windowGeometry);
  const thresholds = {
    executeThreshold: asNumber(raw.executeThreshold),
    executeThresholdTokens: asInteger(raw.executeThresholdTokens),
    executeThresholdMode: asText(raw.executeThresholdMode, 32),
    usableSoft: asInteger(geometry?.usableSoft),
    usableHard: asInteger(geometry?.usableHard)
  };
  return Object.values(thresholds).some((value) => value !== null) ? thresholds : null;
};
var mapCache = (raw) => {
  const cache = {
    ttl: asText(raw.cacheTtl, 32),
    ttlMs: asInteger(raw.cacheTtlMs),
    remainingMs: asInteger(raw.cacheRemainingMs),
    expired: typeof raw.cacheExpired === "boolean" ? raw.cacheExpired : null
  };
  return Object.values(cache).some((value) => value !== null) ? cache : null;
};
var manyText = (value, cap) => {
  if (!Array.isArray(value))
    return [];
  return value.slice(0, cap).map((entry) => typeof entry === "string" ? entry.slice(0, 200) : null).filter((entry) => entry !== null);
};
var mapDreamer = (raw) => {
  const backlog = {};
  const source = asRecord(raw.dreamerBacklog);
  if (source) {
    for (const [key, value] of Object.entries(source).slice(0, 32)) {
      const entry = asRecord(value);
      if (!entry)
        continue;
      backlog[key.slice(0, 64)] = {
        pending: asInteger(entry.pending),
        total: asInteger(entry.total)
      };
    }
  }
  const dreamer = {
    backlog,
    lastRunAt: asIso(raw.lastDreamerRunAt),
    failures: manyText(raw.dreamerFailures, 20),
    skipped: manyText(raw.dreamerSkipped, 20)
  };
  return Object.keys(backlog).length > 0 || dreamer.lastRunAt !== null || dreamer.failures.length > 0 || dreamer.skipped.length > 0 ? dreamer : null;
};
var mapTailHygiene = (raw) => {
  const hygiene = asRecord(raw.tailHygiene);
  if (!hygiene)
    return null;
  const mapped = {
    u: asInteger(hygiene.u),
    t: asInteger(hygiene.t),
    severity: asNumber(hygiene.severity),
    reclaimableToolOutputCount: asInteger(hygiene.reclaimableToolOutputCount)
  };
  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
};
var mapEmbedding = (raw) => {
  const embedding = asRecord(raw.embedding);
  if (!embedding)
    return null;
  const mapped = {
    state: asText(embedding.state, 32),
    indexed: asInteger(embedding.indexed),
    total: asInteger(embedding.total)
  };
  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
};
var mapStorageVersions = (raw) => {
  const versions = asRecord(raw.storage_versions);
  if (!versions)
    return null;
  const mapped = {
    contextDbSchemaVersion: asInteger(versions.context_db_schema_version),
    pluginSupportedVersion: asInteger(versions.plugin_supported_version)
  };
  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
};
var mapLiveData = (raw) => {
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
    hasSessionSample: (usage.inputTokens ?? 0) > 0 || (asInteger(raw.systemPromptTokens) ?? 0) > 0
  };
};
var compositionTotal = (composition) => composition.systemPromptTokens + composition.compartmentTokens + composition.factTokens + composition.memoryTokens + composition.docsTokens + composition.profileTokens + composition.conversationTokens + composition.toolCallTokens + composition.toolDefinitionTokens;
var readLiveRpc = async ({
  sessionId,
  directory
}) => {
  const observedAt = new Date().toISOString();
  const discovery = await discoverRpc(directory);
  if (!discovery.ok)
    return { kind: "unavailable", source: "none", observedAt, reason: discovery.reason };
  if (!sessionId)
    return { kind: "unavailable", source: "none", observedAt, reason: "no-session" };
  const body = { sessionId, directory: discovery.endpoint.directory };
  let method = "status-detail";
  let call = await callRpc(discovery.endpoint, method, body);
  if (!call.ok && call.status === 404) {
    method = "sidebar-snapshot";
    call = await callRpc(discovery.endpoint, method, body);
  }
  if (!call.ok)
    return { kind: "unavailable", source: "none", observedAt, reason: call.reason };
  const data = mapLiveData(call.data);
  const reason = !data.hasSessionSample ? "no-session-sample" : data.composition !== null && data.usage.inputTokens !== null && compositionTotal(data.composition) !== data.usage.inputTokens ? "composition-mismatch" : data.composition === null ? "composition-unavailable" : undefined;
  return {
    kind: "ok",
    source: "rpc",
    method,
    observedAt,
    data,
    ...reason ? { reason } : {}
  };
};

// service/server.ts
var MAX_URL_LENGTH = 8192;
var MAX_ACTIVE_REQUESTS = 8;
var MAX_SEARCH_LENGTH = 200;
var MAX_PAGE_SIZE = 50;
var DEFAULT_PAGE_SIZE = 25;
var SUPPORTED_SCHEMA_VERSION = 95;
var lastSupportedSchema = null;
var reply = (response, status, body) => {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(body));
};
var isAuthorized = (header, token) => {
  if (!header?.startsWith("Bearer "))
    return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};
var readQuery = (url, allowed) => {
  const query = {};
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1)
      return null;
    query[key] = url.searchParams.get(key) ?? "";
  }
  return query;
};
var optional = (value) => value === undefined || value === "" ? null : value;
var reasonOf = (error) => error instanceof Error ? error.message : String(error);
var state = (observedAt, name, reason) => reason ? { state: name, observedAt, reason } : { state: name, observedAt };
var databaseProblem = () => existsSync(CONTEXT_DB_PATH) ? null : "database-missing";
var parsePage = (query) => {
  if (query.limit !== undefined && !/^\d+$/.test(query.limit))
    return null;
  if (query.offset !== undefined && !/^\d+$/.test(query.offset))
    return null;
  const limit = query.limit === undefined ? DEFAULT_PAGE_SIZE : Math.min(Math.max(Number(query.limit), 1), MAX_PAGE_SIZE);
  const offset = query.offset === undefined ? 0 : Math.min(Number(query.offset), 1e6);
  return { limit, offset };
};
var parseFilter = (value, allowed) => {
  if (value === undefined || value === "")
    return null;
  return allowed.includes(value) ? value : undefined;
};
var openDb = () => {
  const missing = databaseProblem();
  if (missing)
    return { db: null, reason: missing };
  try {
    return { db: openReadOnly(), reason: null };
  } catch (error) {
    return { db: null, reason: `database-open-failed: ${reasonOf(error)}` };
  }
};
var readSchema = (db) => {
  const dbVersion = db ? readSchemaVersion(db) : null;
  const pluginSupportedVersion = lastSupportedSchema ?? SUPPORTED_SCHEMA_VERSION;
  return {
    dbVersion,
    pluginSupportedVersion,
    compatible: dbVersion !== null && dbVersion === pluginSupportedVersion
  };
};
var buildSnapshot = async ({ handle, sessionId, directory, observedAt }) => {
  const { db, reason } = handle;
  const rpcPromise = readLiveRpc({ sessionId, directory });
  let resolution = { project: null, reason: reason ?? "project-unresolved" };
  try {
    resolution = await resolveProject(db, { sessionId, directory });
  } catch (error) {
    resolution = { project: null, reason: `project-resolution-failed: ${reasonOf(error)}` };
  }
  const project = resolution.project;
  const unavailable = (what) => state(observedAt, "unavailable", what);
  const sources = {
    project: project ? state(observedAt, "ready") : unavailable(resolution.reason ?? "project-unresolved"),
    live: unavailable("not-read"),
    sessionMeta: sessionId ? unavailable(reason ?? "not-read") : unavailable("no-session"),
    compartments: sessionId ? unavailable(reason ?? "not-read") : unavailable("no-session"),
    memories: unavailable(project ? reason ?? "not-read" : resolution.reason ?? "project-unresolved"),
    notes: unavailable(reason ?? "not-read")
  };
  let context = null;
  if (sessionId && db) {
    try {
      context = readSessionContext(db, sessionId);
      sources.sessionMeta = context === null ? unavailable("no-session-meta") : context.inputTokens === null && context.contextLimit === null ? state(observedAt, "partial", "no-token-sample") : state(observedAt, "ready");
    } catch (error) {
      sources.sessionMeta = state(observedAt, "error", reasonOf(error));
    }
  }
  let compartments = null;
  if (sessionId && db) {
    try {
      compartments = readCompartments(db, sessionId);
      sources.compartments = state(observedAt, "ready");
    } catch (error) {
      sources.compartments = state(observedAt, "error", reasonOf(error));
    }
  }
  let memories = null;
  if (project && db) {
    try {
      memories = readMemoryCounts(db, project.id);
      sources.memories = state(observedAt, "ready");
    } catch (error) {
      sources.memories = state(observedAt, "error", reasonOf(error));
    }
  }
  let notes = { session: null, smart: null };
  if (db && (sessionId || project)) {
    try {
      const page = readNotes(db, { sessionId, projectId: project?.id ?? null });
      notes = {
        session: sessionId ? page.sessionCounts : null,
        smart: project ? page.smartCounts : null
      };
      sources.notes = sessionId && project ? state(observedAt, "ready") : state(observedAt, "partial", project ? "no-session" : "project-unresolved");
    } catch (error) {
      sources.notes = state(observedAt, "error", reasonOf(error));
    }
  } else {
    sources.notes = unavailable(db ? "no-session-or-project" : reason ?? "database-unavailable");
  }
  const rpc = await rpcPromise;
  const rpcData = rpc.kind === "ok" ? rpc.data : null;
  const live = (() => {
    if (rpc.kind === "ok") {
      return {
        state: rpc.reason ? "partial" : "ready",
        source: "rpc",
        observedAt: rpc.observedAt,
        method: rpc.method,
        ...rpc.data.pluginVersion ? { pluginVersion: rpc.data.pluginVersion } : {},
        ...rpc.data.projectIdentity ? { projectIdentity: rpc.data.projectIdentity } : {},
        ...rpc.reason ? { reason: rpc.reason } : {}
      };
    }
    if (context && context.inputTokens !== null && context.inputTokens > 0) {
      return {
        state: "partial",
        source: "session-meta",
        observedAt,
        stale: true,
        reason: rpc.reason,
        ...context.lastResponseAt ? { lastResponseAt: context.lastResponseAt } : {}
      };
    }
    return { state: "unavailable", source: "none", observedAt, reason: rpc.reason };
  })();
  sources.live = state(observedAt, live.state, live.reason);
  const usage = rpcData?.usage ?? (context && context.inputTokens !== null && context.inputTokens > 0 ? {
    usagePercentage: context.lastContextPercentage,
    nativeContextUsagePercentage: null,
    inputTokens: context.inputTokens,
    contextLimit: context.contextLimit
  } : null);
  const rpcSupported = rpcData?.storageVersions?.pluginSupportedVersion ?? null;
  if (rpcSupported !== null)
    lastSupportedSchema = rpcSupported;
  const schema = readSchema(db);
  if (db && schema.dbVersion === null) {
    for (const key of ["sessionMeta", "compartments", "memories", "notes"]) {
      if (sources[key].state === "ready")
        sources[key] = state(observedAt, "partial", "schema-version-unavailable");
    }
  } else if (db && schema.dbVersion !== null && !schema.compatible) {
    const drift = `schema-drift-${schema.dbVersion}-vs-${schema.pluginSupportedVersion}`;
    for (const key of ["sessionMeta", "compartments", "memories", "notes"]) {
      if (sources[key].state === "ready")
        sources[key] = state(observedAt, "partial", drift);
    }
  }
  return {
    schemaVersion: 1,
    observedAt,
    sessionId,
    directory,
    project,
    schema,
    live,
    composition: rpcData?.composition ?? null,
    usage,
    thresholds: rpcData?.thresholds ?? null,
    cache: rpcData?.cache ?? null,
    dreamer: rpcData?.dreamer ?? null,
    tailHygiene: rpcData?.tailHygiene ?? null,
    embedding: rpcData?.embedding ?? null,
    liveCounts: rpcData?.counts ?? null,
    context,
    compartments,
    counts: { memories, notes },
    sources
  };
};
var createHandler = (token) => {
  let activeRequests = 0;
  return async (request, response) => {
    if (!isAuthorized(request.headers.authorization, token)) {
      reply(response, 401, { error: "unauthorized" });
      return;
    }
    if (request.method !== "GET" || typeof request.url !== "string" || request.url.length > MAX_URL_LENGTH) {
      reply(response, 405, { error: "method-not-allowed" });
      return;
    }
    if (activeRequests >= MAX_ACTIVE_REQUESTS) {
      reply(response, 429, { error: "service-busy" });
      return;
    }
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname === "/health") {
      if (!readQuery(url, [])) {
        reply(response, 400, { error: "invalid-request" });
        return;
      }
      const handle = openDb();
      let dbVersion = null;
      try {
        dbVersion = handle.db ? readSchemaVersion(handle.db) : null;
      } finally {
        handle.db?.close();
      }
      const pluginSupportedVersion = lastSupportedSchema ?? SUPPORTED_SCHEMA_VERSION;
      reply(response, 200, {
        ok: true,
        schema: {
          dbVersion,
          pluginSupportedVersion,
          compatible: dbVersion !== null && dbVersion === pluginSupportedVersion
        }
      });
      return;
    }
    const route = url.pathname === "/snapshot" ? "snapshot" : url.pathname === "/memories" ? "memories" : url.pathname === "/notes" ? "notes" : null;
    if (!route) {
      reply(response, 404, { error: "not-found" });
      return;
    }
    const common = ["sessionId", "directory"];
    const query = readQuery(url, route === "memories" ? [...common, "search", "status", "category", "limit", "offset"] : route === "notes" ? [...common, "includeDismissed"] : common);
    if (!query) {
      reply(response, 400, { error: "invalid-request" });
      return;
    }
    const sessionId = optional(query.sessionId);
    if (sessionId !== null && !isSessionId(sessionId)) {
      reply(response, 400, { error: "invalid-request", field: "sessionId" });
      return;
    }
    const directory = optional(query.directory);
    if (directory !== null && !isProjectDirectory(directory)) {
      reply(response, 400, { error: "invalid-request", field: "directory" });
      return;
    }
    activeRequests += 1;
    const handle = openDb();
    try {
      const observedAt = new Date().toISOString();
      if (route === "snapshot") {
        reply(response, 200, await buildSnapshot({ handle, sessionId, directory, observedAt }));
        return;
      }
      if (!handle.db) {
        reply(response, 503, { error: "database-unavailable", reason: handle.reason, observedAt });
        return;
      }
      const db = handle.db;
      const page = parsePage(query);
      if (!page) {
        reply(response, 400, { error: "invalid-request", field: "limit-or-offset" });
        return;
      }
      const search = query.search?.trim() ?? "";
      if (search.length > MAX_SEARCH_LENGTH) {
        reply(response, 400, { error: "invalid-request", field: "search" });
        return;
      }
      const status = parseFilter(query.status, MEMORY_STATUSES);
      const category = parseFilter(query.category, MEMORY_CATEGORIES);
      if (status === undefined) {
        reply(response, 400, { error: "invalid-request", field: "status" });
        return;
      }
      if (category === undefined) {
        reply(response, 400, { error: "invalid-request", field: "category" });
        return;
      }
      if (query.includeDismissed !== undefined && query.includeDismissed !== "true" && query.includeDismissed !== "false") {
        reply(response, 400, { error: "invalid-request", field: "includeDismissed" });
        return;
      }
      const includeDismissed = query.includeDismissed === "true";
      let resolution;
      try {
        resolution = await resolveProject(db, { sessionId, directory });
      } catch (error) {
        resolution = { project: null, reason: `project-resolution-failed: ${reasonOf(error)}` };
      }
      const project = resolution.project;
      if (route === "memories") {
        if (!project) {
          reply(response, 200, {
            schemaVersion: 1,
            observedAt,
            sessionId,
            project: null,
            state: state(observedAt, "unavailable", resolution.reason ?? "project-unresolved"),
            rows: [],
            page: { limit: page.limit, offset: page.offset, returned: 0, total: 0 }
          });
          return;
        }
        const result = readMemories(db, {
          projectId: project.id,
          search,
          status,
          category,
          limit: page.limit,
          offset: page.offset
        });
        reply(response, 200, {
          schemaVersion: 1,
          observedAt,
          sessionId,
          project,
          state: state(observedAt, "ready"),
          rows: result.rows,
          page: { limit: page.limit, offset: page.offset, returned: result.rows.length, total: result.total }
        });
        return;
      }
      const notes = readNotes(db, { sessionId, projectId: project?.id ?? null, includeDismissed });
      reply(response, 200, {
        schemaVersion: 1,
        observedAt,
        sessionId,
        project,
        state: sessionId && project ? state(observedAt, "ready") : sessionId || project ? state(observedAt, "partial", project ? "no-session" : "project-unresolved") : state(observedAt, "unavailable", "no-session-or-directory"),
        sessionNotes: notes.session,
        smartNotes: notes.smart,
        counts: { session: notes.sessionCounts, smart: notes.smartCounts }
      });
    } catch (error) {
      reply(response, 500, { error: "query-failed", reason: reasonOf(error), observedAt: new Date().toISOString() });
    } finally {
      handle.db?.close();
      activeRequests -= 1;
    }
  };
};
var createService = ({ port, token }) => {
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !token) {
    throw new Error("OpenChamber service port and token are required");
  }
  const handler = createHandler(token);
  return http.createServer((request, response) => {
    handler(request, response).catch(() => {
      if (!response.headersSent)
        reply(response, 500, { error: "internal" });
      else
        response.end();
    });
  });
};

// service/main.ts
var port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
var token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? "";
var start = async () => {
  const server = createService({ port, token });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
};
start().catch((error) => {
  process.stderr.write(`magic-context service failed: ${error instanceof Error ? error.message : String(error)}
`);
  process.exitCode = 1;
});
