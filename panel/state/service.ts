import type { GuestRequestResult } from '@openchamber/sdk';

export type Target = { sessionId: string | null; directory: string | null };

/** UI filter slug -> the DB category value the service whitelists. */
export const CATEGORY_QUERY: Record<string, string> = {
  rules: 'PROJECT_RULES',
  architecture: 'ARCHITECTURE',
  constraints: 'CONSTRAINTS',
  config: 'CONFIG_VALUES',
  naming: 'NAMING',
};

export type Counts = { total: number; active?: number; archived?: number; dismissed?: number };

export type SourceState = { state: string; observedAt?: string; reason?: string };

export type CompositionKey =
  | 'systemPromptTokens'
  | 'compartmentTokens'
  | 'factTokens'
  | 'memoryTokens'
  | 'docsTokens'
  | 'profileTokens'
  | 'conversationTokens'
  | 'toolCallTokens'
  | 'toolDefinitionTokens';

export type MemoryRow = {
  id: number;
  category: string;
  status: string;
  importance: number | null;
  classifiedAt: string | null;
  content: string;
  seenCount: number | null;
  retrievalCount: number | null;
  firstSeenAt: string | null;
  updatedAt: string | null;
};

export type NoteRow = {
  id: number;
  type: 'session' | 'smart';
  status: string;
  content: string;
  sessionId: string | null;
  projectId: string | null;
  surfaceCondition: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type Snapshot = {
  observedAt: string;
  sessionId: string | null;
  directory: string | null;
  live: {
    state: 'ready' | 'partial' | 'unavailable';
    source: 'rpc' | 'session-meta' | 'none';
    observedAt?: string;
    reason?: string;
    method?: 'status-detail' | 'sidebar-snapshot';
    pluginVersion?: string;
  };
  project: { id: string; source: string } | null;
  schema: { dbVersion: number | null; pluginSupportedVersion?: number | null; compatible: boolean };
  usage?: {
    usagePercentage: number | null;
    nativeContextUsagePercentage: number | null;
    inputTokens: number | null;
    contextLimit: number | null;
  } | null;
  thresholds?: {
    executeThreshold: number | null;
    executeThresholdTokens: number | null;
    usableSoft: number | null;
    usableHard: number | null;
  } | null;
  composition?: Record<CompositionKey, number> | null;
  cache?: { ttl: string | null; ttlMs: number | null; remainingMs: number | null; expired: boolean | null } | null;
  liveCounts?: {
    compartments: number | null;
    archivedCompartments: number | null;
    memories: number | null;
    memoryBlocks: number | null;
    pendingOperations: number | null;
    sessionNotes: number | null;
    readySmartNotes: number | null;
  } | null;
  embedding?: { state: string | null; indexed: number | null; total: number | null } | null;
  counts: { memories: Counts | null; notes: { session: Counts | null; smart: Counts | null } } | null;
  sources?: Record<string, SourceState>;
};

export type MemoriesPayload = {
  project: { id: string; source: string } | null;
  state: SourceState;
  rows: MemoryRow[];
  page: { limit: number; offset: number; returned: number; total: number };
};

export type NotesPayload = {
  project: { id: string; source: string } | null;
  state: SourceState;
  sessionNotes: NoteRow[];
  smartNotes: NoteRow[];
  counts: { session: Counts; smart: Counts };
};

export class ServiceError extends Error {
  status: number;
  reason: string;

  constructor(message: string, status = 0, reason = '') {
    super(message);
    this.name = 'ServiceError';
    this.status = status;
    this.reason = reason;
  }
}

type Request = (request: { method: 'GET'; path: string; query?: Record<string, string> }) => Promise<GuestRequestResult>;

const queryOf = (target: Target, extra: Record<string, string | number | undefined> = {}): Record<string, string> => {
  const query: Record<string, string> = {};
  if (target.sessionId) query.sessionId = target.sessionId;
  if (target.directory) query.directory = target.directory;
  for (const [key, value] of Object.entries(extra)) {
    if (value !== undefined && value !== '') query[key] = String(value);
  }
  return query;
};

const get = async <T>(request: Request, path: string, query: Record<string, string>): Promise<T> => {
  let result: GuestRequestResult;
  try {
    result = await request({ method: 'GET', path, query });
  } catch (error) {
    throw new ServiceError(error instanceof Error ? error.message : String(error), 0, 'host-unavailable');
  }
  let body: unknown = null;
  try {
    body = JSON.parse(result.body);
  } catch {
    body = null;
  }
  if (result.status !== 200) {
    const reason = typeof body === 'object' && body !== null && 'reason' in body
      ? String((body as { reason?: unknown }).reason ?? '')
      : '';
    throw new ServiceError(reason || `HTTP ${result.status}`, result.status, reason);
  }
  if (body === null || typeof body !== 'object') throw new ServiceError('invalid response', 200, 'invalid-response');
  return body as T;
};

export const snapshot = (request: Request, target: Target): Promise<Snapshot> =>
  get<Snapshot>(request, '/snapshot', queryOf(target));

export const memories = (
  request: Request,
  target: Target,
  options: { search: string; status: string; category: string; limit: number; offset: number },
): Promise<MemoriesPayload> => get<MemoriesPayload>(request, '/memories', queryOf(target, {
  search: options.search || undefined,
  status: options.status === 'all' ? undefined : options.status,
  category: options.category === 'all' ? undefined : CATEGORY_QUERY[options.category] ?? options.category,
  limit: options.limit,
  offset: options.offset,
}));

export const notes = (request: Request, target: Target, includeDismissed = false): Promise<NotesPayload> =>
  get<NotesPayload>(request, '/notes', queryOf(target, includeDismissed ? { includeDismissed: 'true' } : {}));

export type Health = { ok: boolean; schema: { dbVersion: number | null; pluginSupportedVersion: number | null; compatible: boolean } };

export const health = (request: Request): Promise<Health> => get<Health>(request, '/health', {});
