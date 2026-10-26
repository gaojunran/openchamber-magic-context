import { timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import http from 'node:http';
import type { DatabaseSync } from 'node:sqlite';
import {
  CONTEXT_DB_PATH,
  MEMORY_CATEGORIES,
  MEMORY_STATUSES,
  openReadOnly,
  readCompartments,
  readMemories,
  readMemoryCounts,
  readNotes,
  readSchemaVersion,
  readSessionContext,
  type MemoryCategory,
  type MemoryStatus,
} from './db';
import { isProjectDirectory, isSessionId, resolveProject, type ProjectRef } from './project';
import { readLiveRpc, type RpcLiveData, type RpcLiveResult } from './rpc';

const MAX_URL_LENGTH = 8_192;
const MAX_ACTIVE_REQUESTS = 8;
const MAX_SEARCH_LENGTH = 200;
const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 25;
/**
 * Schema version this reader is written against. Used as the expectation when
 * the plugin RPC has not told us its own supported version yet.
 */
const SUPPORTED_SCHEMA_VERSION = 95;

type SourceStateName = 'ready' | 'partial' | 'unavailable' | 'error';

type SourceState = {
  state: SourceStateName;
  observedAt: string;
  reason?: string;
};

type Query = Record<string, string>;

/** Last `plugin_supported_version` seen from the RPC, for `/health`. */
let lastSupportedSchema: number | null = null;

const reply = (response: http.ServerResponse, status: number, body: unknown): void => {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
};

const isAuthorized = (header: string | undefined, token: string): boolean => {
  if (!header?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(token);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
};

const readQuery = (url: URL, allowed: readonly string[]): Query | null => {
  const query: Query = {};
  for (const key of url.searchParams.keys()) {
    if (!allowed.includes(key) || url.searchParams.getAll(key).length !== 1) return null;
    query[key] = url.searchParams.get(key) ?? '';
  }
  return query;
};

const optional = (value: string | undefined): string | null => (value === undefined || value === '' ? null : value);

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const state = (observedAt: string, name: SourceStateName, reason?: string): SourceState =>
  reason ? { state: name, observedAt, reason } : { state: name, observedAt };

const databaseProblem = (): string | null => (existsSync(CONTEXT_DB_PATH) ? null : 'database-missing');

const parsePage = (query: Query): { limit: number; offset: number } | null => {
  if (query.limit !== undefined && !/^\d+$/.test(query.limit)) return null;
  if (query.offset !== undefined && !/^\d+$/.test(query.offset)) return null;
  const limit = query.limit === undefined
    ? DEFAULT_PAGE_SIZE
    : Math.min(Math.max(Number(query.limit), 1), MAX_PAGE_SIZE);
  const offset = query.offset === undefined ? 0 : Math.min(Number(query.offset), 1_000_000);
  return { limit, offset };
};

const parseFilter = <T extends string>(value: string | undefined, allowed: readonly T[]): T | null | undefined => {
  if (value === undefined || value === '') return null;
  return allowed.includes(value as T) ? (value as T) : undefined;
};

type DbHandle = { db: DatabaseSync | null; reason: string | null };

const openDb = (): DbHandle => {
  const missing = databaseProblem();
  if (missing) return { db: null, reason: missing };
  try {
    return { db: openReadOnly(), reason: null };
  } catch (error) {
    return { db: null, reason: `database-open-failed: ${reasonOf(error)}` };
  }
};

const readSchema = (db: DatabaseSync | null): {
  dbVersion: number | null;
  pluginSupportedVersion: number;
  compatible: boolean;
} => {
  const dbVersion = db ? readSchemaVersion(db) : null;
  const pluginSupportedVersion = lastSupportedSchema ?? SUPPORTED_SCHEMA_VERSION;
  return {
    dbVersion,
    pluginSupportedVersion,
    compatible: dbVersion !== null && dbVersion === pluginSupportedVersion,
  };
};

type SnapshotArgs = {
  handle: DbHandle;
  sessionId: string | null;
  directory: string | null;
  observedAt: string;
};

const buildSnapshot = async ({ handle, sessionId, directory, observedAt }: SnapshotArgs): Promise<unknown> => {
  const { db, reason } = handle;
  // Runs beside the DB reads: discovery walks the git top level and probes /health.
  const rpcPromise: Promise<RpcLiveResult> = readLiveRpc({ sessionId, directory });

  let resolution: { project: ProjectRef | null; reason: string | null } =
    { project: null, reason: reason ?? 'project-unresolved' };
  try {
    resolution = await resolveProject(db, { sessionId, directory });
  } catch (error) {
    resolution = { project: null, reason: `project-resolution-failed: ${reasonOf(error)}` };
  }
  const project = resolution.project;
  const unavailable = (what: string): SourceState => state(observedAt, 'unavailable', what);

  const sources: Record<'project' | 'live' | 'sessionMeta' | 'compartments' | 'memories' | 'notes', SourceState> = {
    project: project ? state(observedAt, 'ready') : unavailable(resolution.reason ?? 'project-unresolved'),
    live: unavailable('not-read'),
    sessionMeta: sessionId ? unavailable(reason ?? 'not-read') : unavailable('no-session'),
    compartments: sessionId ? unavailable(reason ?? 'not-read') : unavailable('no-session'),
    memories: unavailable(project ? (reason ?? 'not-read') : (resolution.reason ?? 'project-unresolved')),
    notes: unavailable(reason ?? 'not-read'),
  };

  let context = null;
  if (sessionId && db) {
    try {
      context = readSessionContext(db, sessionId);
      sources.sessionMeta = context === null
        ? unavailable('no-session-meta')
        : context.inputTokens === null && context.contextLimit === null
          ? state(observedAt, 'partial', 'no-token-sample')
          : state(observedAt, 'ready');
    } catch (error) {
      sources.sessionMeta = state(observedAt, 'error', reasonOf(error));
    }
  }

  let compartments = null;
  if (sessionId && db) {
    try {
      compartments = readCompartments(db, sessionId);
      sources.compartments = state(observedAt, 'ready');
    } catch (error) {
      sources.compartments = state(observedAt, 'error', reasonOf(error));
    }
  }

  let memories: ReturnType<typeof readMemoryCounts> | null = null;
  if (project && db) {
    try {
      memories = readMemoryCounts(db, project.id);
      sources.memories = state(observedAt, 'ready');
    } catch (error) {
      sources.memories = state(observedAt, 'error', reasonOf(error));
    }
  }

  let notes: { session: Record<string, number> | null; smart: Record<string, number> | null } = { session: null, smart: null };
  if (db && (sessionId || project)) {
    try {
      const page = readNotes(db, { sessionId, projectId: project?.id ?? null });
      notes = {
        session: sessionId ? page.sessionCounts : null,
        smart: project ? page.smartCounts : null,
      };
      sources.notes = sessionId && project
        ? state(observedAt, 'ready')
        : state(observedAt, 'partial', project ? 'no-session' : 'project-unresolved');
    } catch (error) {
      sources.notes = state(observedAt, 'error', reasonOf(error));
    }
  } else {
    sources.notes = unavailable(db ? 'no-session-or-project' : (reason ?? 'database-unavailable'));
  }

  const rpc = await rpcPromise;
  const rpcData: RpcLiveData | null = rpc.kind === 'ok' ? rpc.data : null;

  const live: {
    state: 'ready' | 'partial' | 'unavailable';
    source: 'rpc' | 'session-meta' | 'none';
    observedAt: string;
    pluginVersion?: string;
    reason?: string;
    [key: string]: unknown;
  } = (() => {
    if (rpc.kind === 'ok') {
      return {
        state: rpc.reason ? 'partial' : 'ready',
        source: 'rpc',
        observedAt: rpc.observedAt,
        method: rpc.method,
        ...(rpc.data.pluginVersion ? { pluginVersion: rpc.data.pluginVersion } : {}),
        ...(rpc.data.projectIdentity ? { projectIdentity: rpc.data.projectIdentity } : {}),
        ...(rpc.reason ? { reason: rpc.reason } : {}),
      };
    }
    if (context && context.inputTokens !== null && context.inputTokens > 0) {
      return {
        state: 'partial',
        source: 'session-meta',
        observedAt,
        stale: true,
        reason: rpc.reason,
        ...(context.lastResponseAt ? { lastResponseAt: context.lastResponseAt } : {}),
      };
    }
    return { state: 'unavailable', source: 'none', observedAt, reason: rpc.reason };
  })();
  sources.live = state(observedAt, live.state, live.reason);

  const usage = rpcData?.usage ?? (context && context.inputTokens !== null && context.inputTokens > 0
    ? {
      usagePercentage: context.lastContextPercentage,
      nativeContextUsagePercentage: null,
      inputTokens: context.inputTokens,
      contextLimit: context.contextLimit,
    }
    : null);

  const rpcSupported = rpcData?.storageVersions?.pluginSupportedVersion ?? null;
  if (rpcSupported !== null) lastSupportedSchema = rpcSupported;
  const schema = readSchema(db);
  if (db && schema.dbVersion === null) {
    for (const key of ['sessionMeta', 'compartments', 'memories', 'notes'] as const) {
      if (sources[key].state === 'ready') sources[key] = state(observedAt, 'partial', 'schema-version-unavailable');
    }
  } else if (db && schema.dbVersion !== null && !schema.compatible) {
    const drift = `schema-drift-${schema.dbVersion}-vs-${schema.pluginSupportedVersion}`;
    for (const key of ['sessionMeta', 'compartments', 'memories', 'notes'] as const) {
      if (sources[key].state === 'ready') sources[key] = state(observedAt, 'partial', drift);
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
    sources,
  };
};

const createHandler = (token: string) => {
  let activeRequests = 0;

  return async (request: http.IncomingMessage, response: http.ServerResponse): Promise<void> => {
    if (!isAuthorized(request.headers.authorization, token)) {
      reply(response, 401, { error: 'unauthorized' });
      return;
    }
    if (request.method !== 'GET' || typeof request.url !== 'string' || request.url.length > MAX_URL_LENGTH) {
      reply(response, 405, { error: 'method-not-allowed' });
      return;
    }
    if (activeRequests >= MAX_ACTIVE_REQUESTS) {
      reply(response, 429, { error: 'service-busy' });
      return;
    }
    const url = new URL(request.url, 'http://127.0.0.1');

    if (url.pathname === '/health') {
      if (!readQuery(url, [])) {
        reply(response, 400, { error: 'invalid-request' });
        return;
      }
      const handle = openDb();
      let dbVersion: number | null = null;
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
          compatible: dbVersion !== null && dbVersion === pluginSupportedVersion,
        },
      });
      return;
    }

    const route = url.pathname === '/snapshot' ? 'snapshot'
      : url.pathname === '/memories' ? 'memories'
        : url.pathname === '/notes' ? 'notes'
          : null;
    if (!route) {
      reply(response, 404, { error: 'not-found' });
      return;
    }

    const common = ['sessionId', 'directory'] as const;
    const query = readQuery(
      url,
      route === 'memories'
        ? [...common, 'search', 'status', 'category', 'limit', 'offset']
        : route === 'notes' ? [...common, 'includeDismissed'] : common,
    );
    if (!query) {
      reply(response, 400, { error: 'invalid-request' });
      return;
    }
    const sessionId = optional(query.sessionId);
    if (sessionId !== null && !isSessionId(sessionId)) {
      reply(response, 400, { error: 'invalid-request', field: 'sessionId' });
      return;
    }
    const directory = optional(query.directory);
    if (directory !== null && !isProjectDirectory(directory)) {
      reply(response, 400, { error: 'invalid-request', field: 'directory' });
      return;
    }

    activeRequests += 1;
    const handle = openDb();
    try {
      const observedAt = new Date().toISOString();
      if (route === 'snapshot') {
        reply(response, 200, await buildSnapshot({ handle, sessionId, directory, observedAt }));
        return;
      }
      if (!handle.db) {
        reply(response, 503, { error: 'database-unavailable', reason: handle.reason, observedAt });
        return;
      }

      const db = handle.db;
      const page = parsePage(query);
      if (!page) {
        reply(response, 400, { error: 'invalid-request', field: 'limit-or-offset' });
        return;
      }
      const search = query.search?.trim() ?? '';
      if (search.length > MAX_SEARCH_LENGTH) {
        reply(response, 400, { error: 'invalid-request', field: 'search' });
        return;
      }
      const status = parseFilter<MemoryStatus>(query.status, MEMORY_STATUSES);
      const category = parseFilter<MemoryCategory>(query.category, MEMORY_CATEGORIES);
      if (status === undefined) {
        reply(response, 400, { error: 'invalid-request', field: 'status' });
        return;
      }
      if (category === undefined) {
        reply(response, 400, { error: 'invalid-request', field: 'category' });
        return;
      }
      if (query.includeDismissed !== undefined && query.includeDismissed !== 'true' && query.includeDismissed !== 'false') {
        reply(response, 400, { error: 'invalid-request', field: 'includeDismissed' });
        return;
      }
      const includeDismissed = query.includeDismissed === 'true';

      let resolution: { project: ProjectRef | null; reason: string | null };
      try {
        resolution = await resolveProject(db, { sessionId, directory });
      } catch (error) {
        resolution = { project: null, reason: `project-resolution-failed: ${reasonOf(error)}` };
      }
      const project = resolution.project;

      if (route === 'memories') {
        if (!project) {
          reply(response, 200, {
            schemaVersion: 1,
            observedAt,
            sessionId,
            project: null,
            state: state(observedAt, 'unavailable', resolution.reason ?? 'project-unresolved'),
            rows: [],
            page: { limit: page.limit, offset: page.offset, returned: 0, total: 0 },
          });
          return;
        }
        const result = readMemories(db, {
          projectId: project.id,
          search,
          status,
          category,
          limit: page.limit,
          offset: page.offset,
        });
        reply(response, 200, {
          schemaVersion: 1,
          observedAt,
          sessionId,
          project,
          state: state(observedAt, 'ready'),
          rows: result.rows,
          page: { limit: page.limit, offset: page.offset, returned: result.rows.length, total: result.total },
        });
        return;
      }

      const notes = readNotes(db, { sessionId, projectId: project?.id ?? null, includeDismissed });
      reply(response, 200, {
        schemaVersion: 1,
        observedAt,
        sessionId,
        project,
        state: sessionId && project
          ? state(observedAt, 'ready')
          : sessionId || project
            ? state(observedAt, 'partial', project ? 'no-session' : 'project-unresolved')
            : state(observedAt, 'unavailable', 'no-session-or-directory'),
        sessionNotes: notes.session,
        smartNotes: notes.smart,
        counts: { session: notes.sessionCounts, smart: notes.smartCounts },
      });
    } catch (error) {
      reply(response, 500, { error: 'query-failed', reason: reasonOf(error), observedAt: new Date().toISOString() });
    } finally {
      handle.db?.close();
      activeRequests -= 1;
    }
  };
};

export const createService = ({ port, token }: { port: number; token: string }): http.Server => {
  if (!Number.isInteger(port) || port < 1 || port > 65_535 || !token) {
    throw new Error('OpenChamber service port and token are required');
  }
  const handler = createHandler(token);
  return http.createServer((request, response) => {
    void handler(request, response).catch(() => {
      if (!response.headersSent) reply(response, 500, { error: 'internal' });
      else response.end();
    });
  });
};
