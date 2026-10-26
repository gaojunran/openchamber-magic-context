import { DatabaseSync, type SQLOutputValue } from 'node:sqlite';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONTEXT_DB_PATH = process.env.MAGIC_CONTEXT_DB ?? join(homedir(), '.local/share/cortexkit/magic-context/context.db');

export const MEMORY_STATUSES = ['active', 'archived'] as const;
export const MEMORY_CATEGORIES = ['ARCHITECTURE', 'CONFIG_VALUES', 'CONSTRAINTS', 'NAMING', 'PROJECT_RULES'] as const;
export type MemoryStatus = (typeof MEMORY_STATUSES)[number];
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type MemoryRow = {
  id: number;
  category: MemoryCategory;
  status: MemoryStatus;
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

export type SessionContext = {
  lastContextPercentage: number | null;
  inputTokens: number | null;
  contextLimit: number | null;
  detectedContextLimit: number | null;
  systemPromptTokens: number | null;
  conversationTokens: number | null;
  toolCallTokens: number | null;
  memoryBlockCount: number | null;
  totalInputTokens: number | null;
  observedSafeInputTokens: number | null;
  lastResponseAt: string | null;
  compartmentInProgress: boolean;
  isSubagent: boolean;
};

export type CompartmentSummary = {
  id: number;
  sequence: number | null;
  title: string | null;
  episodeType: string | null;
  importance: number | null;
  startMessage: number | null;
  endMessage: number | null;
  createdAt: string | null;
};

export type MemoryPage = {
  rows: MemoryRow[];
  total: number;
};

export type NotesPage = {
  session: NoteRow[];
  smart: NoteRow[];
  sessionCounts: Record<string, number>;
  smartCounts: Record<string, number>;
};

const text = (row: Record<string, SQLOutputValue>, key: string): string | null => {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const num = (row: Record<string, SQLOutputValue>, key: string): number | null => {
  const value = row[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return typeof value === 'bigint' ? Number(value) : null;
};

const iso = (value: number | null): string | null => {
  if (value === null || value <= 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const openReadOnly = (): DatabaseSync => {
  const db = new DatabaseSync(CONTEXT_DB_PATH, { readOnly: true });
  db.exec('PRAGMA busy_timeout = 2000');
  return db;
};

export const withDb = <T>(run: (db: DatabaseSync) => T): T => {
  const db = openReadOnly();
  try {
    return run(db);
  } finally {
    db.close();
  }
};

export const readSessionContext = (db: DatabaseSync, sessionId: string): SessionContext | null => {
  const row = db.prepare(`
    SELECT last_context_percentage, last_input_tokens, last_usage_context_limit, detected_context_limit,
           system_prompt_tokens, conversation_tokens, tool_call_tokens, memory_block_count,
           total_input_tokens, observed_safe_input_tokens, last_response_time,
           compartment_in_progress, is_subagent
    FROM session_meta WHERE session_id = ?
  `).get(sessionId);
  if (!row) return null;
  const lastLimit = num(row, 'last_usage_context_limit');
  const detected = num(row, 'detected_context_limit');
  return {
    lastContextPercentage: num(row, 'last_context_percentage'),
    inputTokens: num(row, 'last_input_tokens'),
    contextLimit: lastLimit && lastLimit > 0 ? lastLimit : detected && detected > 0 ? detected : null,
    detectedContextLimit: detected,
    systemPromptTokens: num(row, 'system_prompt_tokens'),
    conversationTokens: num(row, 'conversation_tokens'),
    toolCallTokens: num(row, 'tool_call_tokens'),
    memoryBlockCount: num(row, 'memory_block_count'),
    totalInputTokens: num(row, 'total_input_tokens'),
    observedSafeInputTokens: num(row, 'observed_safe_input_tokens'),
    lastResponseAt: iso(num(row, 'last_response_time')),
    compartmentInProgress: num(row, 'compartment_in_progress') === 1,
    isSubagent: num(row, 'is_subagent') === 1,
  };
};

export const readCompartments = (db: DatabaseSync, sessionId: string, limit = 5): {
  count: number;
  latestSequence: number | null;
  recent: CompartmentSummary[];
} => {
  const aggregate = db.prepare(
    'SELECT COUNT(*) AS count, MAX(sequence) AS latest_sequence FROM compartments WHERE session_id = ?',
  ).get(sessionId);
  const recent = db.prepare(`
    SELECT id, sequence, title, episode_type, importance, start_message, end_message, created_at
    FROM compartments WHERE session_id = ?
    ORDER BY sequence DESC LIMIT ?
  `).all(sessionId, limit);
  return {
    count: num(aggregate ?? {}, 'count') ?? 0,
    latestSequence: num(aggregate ?? {}, 'latest_sequence'),
    recent: recent.map((row) => ({
      id: num(row, 'id') ?? 0,
      sequence: num(row, 'sequence'),
      title: text(row, 'title'),
      episodeType: text(row, 'episode_type'),
      importance: num(row, 'importance'),
      startMessage: num(row, 'start_message'),
      endMessage: num(row, 'end_message'),
      createdAt: iso(num(row, 'created_at')),
    })),
  };
};

/** Highest applied migration. `PRAGMA user_version` is 0 here and is not the schema version. */
export const readSchemaVersion = (db: DatabaseSync): number | null => {
  try {
    const row = db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get();
    return row ? num(row, 'version') : null;
  } catch {
    return null;
  }
};

export const readMemoryCounts = (db: DatabaseSync, projectId: string): { total: number; active: number; archived: number } => {
  const rows = db.prepare(
    'SELECT status, COUNT(*) AS count FROM memories WHERE project_path = ? GROUP BY status',
  ).all(projectId);
  const counts = { total: 0, active: 0, archived: 0 };
  for (const row of rows) {
    const count = num(row, 'count') ?? 0;
    counts.total += count;
    const status = text(row, 'status');
    if (status === 'active') counts.active = count;
    if (status === 'archived') counts.archived = count;
  }
  return counts;
};

export const readNoteCounts = (db: DatabaseSync, key: 'session_id' | 'project_path', value: string): Record<string, number> => {
  const rows = db.prepare(
    `SELECT status, COUNT(*) AS count FROM notes WHERE ${key} = ? GROUP BY status`,
  ).all(value);
  const counts: Record<string, number> = { total: 0, active: 0, dismissed: 0 };
  for (const row of rows) {
    const count = num(row, 'count') ?? 0;
    const status = text(row, 'status');
    counts.total += count;
    if (status) counts[status] = count;
  }
  return counts;
};

/** Escapes LIKE wildcards; pairs with `ESCAPE '\\'` in the query. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (match) => `\\${match}`);

export const readMemories = (
  db: DatabaseSync,
  { projectId, search, status, category, limit, offset }: {
    projectId: string;
    search: string;
    status: MemoryStatus | null;
    category: MemoryCategory | null;
    limit: number;
    offset: number;
  },
): MemoryPage => {
  const clauses = ['project_path = ?'];
  const params: (string | number)[] = [projectId];
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (category) {
    clauses.push('category = ?');
    params.push(category);
  }
  if (search) {
    clauses.push("content LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLike(search)}%`);
  }
  const where = clauses.join(' AND ');
  const total = num(db.prepare(`SELECT COUNT(*) AS count FROM memories WHERE ${where}`).get(...params) ?? {}, 'count') ?? 0;
  const rows = db.prepare(`
    SELECT id, category, status, importance, classified_at, content, seen_count, retrieval_count, first_seen_at, updated_at
    FROM memories WHERE ${where}
    ORDER BY importance DESC, updated_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
  return {
    total,
    rows: rows.map((row) => ({
      id: num(row, 'id') ?? 0,
      category: (text(row, 'category') ?? 'ARCHITECTURE') as MemoryCategory,
      status: (text(row, 'status') ?? 'active') as MemoryStatus,
      importance: num(row, 'importance'),
      classifiedAt: iso(num(row, 'classified_at')),
      content: text(row, 'content') ?? '',
      seenCount: num(row, 'seen_count'),
      retrievalCount: num(row, 'retrieval_count'),
      firstSeenAt: iso(num(row, 'first_seen_at')),
      updatedAt: iso(num(row, 'updated_at')),
    })),
  };
};

const toNote = (row: Record<string, SQLOutputValue>): NoteRow => ({
  id: num(row, 'id') ?? 0,
  type: text(row, 'type') === 'smart' ? 'smart' : 'session',
  status: text(row, 'status') ?? 'unknown',
  content: text(row, 'content') ?? '',
  sessionId: text(row, 'session_id'),
  projectId: text(row, 'project_path'),
  surfaceCondition: text(row, 'surface_condition'),
  createdAt: iso(num(row, 'created_at')),
  updatedAt: iso(num(row, 'updated_at')),
});

const NOTE_COLUMNS = 'id, type, status, content, session_id, project_path, surface_condition, created_at, updated_at';

export const readNotes = (
  db: DatabaseSync,
  { sessionId, projectId, includeDismissed = false }: {
    sessionId: string | null;
    projectId: string | null;
    includeDismissed?: boolean;
  },
): NotesPage => {
  const session = sessionId
    ? db.prepare(`
        SELECT ${NOTE_COLUMNS} FROM notes
        WHERE type = 'session' AND session_id = ? AND (? = 1 OR status <> 'dismissed')
        ORDER BY updated_at DESC, id DESC
      `).all(sessionId, includeDismissed ? 1 : 0)
    : [];
  const smart = projectId
    ? db.prepare(`
        SELECT ${NOTE_COLUMNS} FROM notes
        WHERE type = 'smart' AND project_path = ? AND status <> 'dismissed'
        ORDER BY updated_at DESC, id DESC
      `).all(projectId)
    : [];
  return {
    session: session.map(toNote),
    smart: smart.map(toNote),
    sessionCounts: sessionId ? readNoteCounts(db, 'session_id', sessionId) : { total: 0, active: 0, dismissed: 0 },
    smartCounts: projectId ? readNoteCounts(db, 'project_path', projectId) : { total: 0, active: 0, dismissed: 0 },
  };
};
