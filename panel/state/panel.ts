import { createMemo, createSignal } from 'solid-js';
import {
  ServiceError,
  type MemoryRow,
  type NotesPayload,
  type NoteRow,
  type Snapshot,
  type Target,
  health,
  memories as readMemories,
  notes as readNotes,
  snapshot as readSnapshot,
} from './service';

export type View = 'overview' | 'memories' | 'notes';
export type BodyState = 'loading' | 'content' | 'no-project' | 'no-usage' | 'no-match' | 'error';
export type Banner = { kind: 'partial' | 'stale' | 'drift'; title: string; body: string; action: string | null } | null;
export type Request = Parameters<typeof health>[0];

const REFRESH_MS = 4_000;
const STALE_AFTER_MS = 12_000;
const SEARCH_DEBOUNCE_MS = 200;
const PAGE_SIZE = 50;

export type CompositionGroup = {
  key: string;
  label: 'system' | 'conversation' | 'compartments' | 'memories' | 'profile' | 'facts';
  tokens: number;
  share: number;
  band: 'system' | 'conversation' | 'context';
  count?: number | null;
};

export type CompositionView = {
  rows: CompositionGroup[];
  subRows: { key: 'conversation' | 'toolCalls' | 'toolDefinitions'; tokens: number; share: number }[];
  bands: { system: number; conversation: number; context: number };
  total: number;
  magicContextTokens: number;
  magicContextShare: number;
};

export const createPanel = (request: Request) => {
  const [target, setTargetSignal] = createSignal<Target>({ sessionId: null, directory: null });
  const [snapshot, setSnapshot] = createSignal<Snapshot | null>(null);
  const [snapshotError, setSnapshotError] = createSignal<string | null>(null);
  const [listError, setListError] = createSignal<string | null>(null);
  const [memoryRows, setMemoryRows] = createSignal<MemoryRow[]>([]);
  const [memoryTotal, setMemoryTotal] = createSignal(0);
  const [notes, setNotes] = createSignal<NotesPayload | null>(null);
  const [dismissedNotes, setDismissedNotes] = createSignal<NoteRow[] | null>(null);
  const [dismissedLoading, setDismissedLoading] = createSignal(false);
  const [dismissedError, setDismissedError] = createSignal<string | null>(null);
  const [dismissedOpen, setDismissedOpen] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [updating, setUpdating] = createSignal(false);
  const [view, setViewSignal] = createSignal<View>('overview');
  const [pane, setPane] = createSignal<'list' | 'detail'>('list');
  const [selectedNoteId, setSelectedNoteId] = createSignal<number | null>(null);
  const [selectedMemoryId, setSelectedMemoryId] = createSignal<number | null>(null);
  const [filters, setFiltersSignal] = createSignal<{ status: string; category: string }>({ status: 'all', category: 'all' });
  const [query, setQuerySignal] = createSignal('');
  const [compositionOpen, setCompositionOpen] = createSignal(false);
  const [filterOpen, setFilterOpen] = createSignal(false);
  const [nowTick, setNowTick] = createSignal(Date.now());
  const [healthOk, setHealthOk] = createSignal<boolean | null>(null);

  let currentTarget: Target = { sessionId: null, directory: null };
  let listToken = 0;
  let inFlight: Promise<Snapshot | null> | null = null;
  let again = false;
  let started = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let noteRequest = 0;

  const reasonOf = (error: unknown): string => {
    if (error instanceof ServiceError) return error.reason || error.message;
    return error instanceof Error ? error.message : String(error);
  };

  const live = createMemo(() => {
    const current = snapshot();
    return current?.live ?? { state: 'unavailable' as const, source: 'none' as const };
  });

  const liveAgeMs = createMemo(() => {
    const current = snapshot();
    const observedAt = current?.live.observedAt ?? current?.observedAt;
    if (!observedAt) return null;
    const at = Date.parse(observedAt);
    return Number.isNaN(at) ? null : Math.max(0, nowTick() - at);
  });

  const isStale = createMemo(() => live().source === 'rpc' && (liveAgeMs() ?? 0) > STALE_AFTER_MS);

  const banner = createMemo<Banner>(() => {
    const current = snapshot();
    if (!current) return null;
    if (current.schema?.compatible === false) {
      return {
        kind: 'drift',
        title: 'schema.title',
        body: 'schema.body',
        action: null,
      };
    }
    if (live().source === 'session-meta') {
      return { kind: 'partial', title: 'partial.title', body: 'partial.body', action: 'partial.action' };
    }
    if (isStale()) {
      return { kind: 'stale', title: 'stale.title', body: 'stale.body', action: 'stale.action' };
    }
    return null;
  });

  const filtering = createMemo(() => filters().status !== 'all' || filters().category !== 'all' || query() !== '');

  const hasUsageSample = createMemo(() => {
    const usage = snapshot()?.usage;
    return Boolean(usage && ((usage.inputTokens ?? 0) > 0 || (usage.usagePercentage ?? 0) > 0));
  });

  const notesEmpty = createMemo(() => {
    const payload = notes();
    if (!payload) return false;
    const counts = payload.counts;
    return (payload.sessionNotes?.length ?? 0) === 0
      && (payload.smartNotes?.length ?? 0) === 0
      && (counts?.session?.total ?? 0) === 0
      && (counts?.smart?.total ?? 0) === 0;
  });

  const bodyState = createMemo<BodyState>(() => {
    if (loading()) return 'loading';
    if (snapshotError() && !snapshot()) return 'error';
    if (!snapshot()?.project) return 'no-project';
    if (view() === 'overview') return hasUsageSample() ? 'content' : 'no-usage';
    if (view() === 'memories') {
      if (listError() && memoryRows().length === 0) return 'error';
      if (filtering() && memoryRows().length === 0 && memoryTotal() === 0) return 'no-match';
      if (memoryTotal() === 0 && memoryRows().length === 0) return 'no-usage';
      return 'content';
    }
    if (listError() && !notes()) return 'error';
    return notesEmpty() ? 'no-usage' : 'content';
  });

  const usage = createMemo(() => {
    const current = snapshot();
    const usageValue = current?.usage;
    if (!current || !usageValue) return null;
    const percentage = usageValue.usagePercentage;
    const limit = usageValue.contextLimit ?? 0;
    const fallback = percentage === null || percentage === undefined
      ? (usageValue.inputTokens !== null && limit > 0 ? ((usageValue.inputTokens ?? 0) / limit) * 100 : null)
      : percentage;
    return {
      percent: fallback,
      tokens: usageValue.inputTokens,
      limit: usageValue.contextLimit,
      native: current.live.source === 'rpc' ? usageValue.nativeContextUsagePercentage : null,
    };
  });

  const thresholds = createMemo(() => {
    const t = snapshot()?.thresholds;
    if (!t || t.executeThreshold === null || t.executeThresholdTokens === null) return null;
    return { percent: t.executeThreshold, tokens: t.executeThresholdTokens, soft: t.usableSoft, hard: t.usableHard };
  });

  const composition = createMemo<CompositionView | null>(() => {
    const current = snapshot();
    if (!current || current.live.source !== 'rpc' || !current.composition) return null;
    const c = current.composition;
    const total = Object.values(c).reduce((sum, value) => sum + value, 0);
    if (!total || !current.usage?.inputTokens) return null;
    const share = (value: number): number => (value / total) * 100;
    const system = c.systemPromptTokens;
    const conversation = c.conversationTokens;
    const toolCalls = c.toolCallTokens;
    const toolDefinitions = c.toolDefinitionTokens;
    const conversationTools = conversation + toolCalls + toolDefinitions;
    const compartments = c.compartmentTokens;
    const memories = c.memoryTokens;
    const profile = c.profileTokens + c.docsTokens;
    const facts = c.factTokens;
    const context = compartments + memories + profile + facts;
    if (system + conversationTools + context !== total) return null;
    const liveCounts = current.liveCounts;
    return {
      total,
      magicContextTokens: context,
      magicContextShare: share(context),
      bands: { system: share(system), conversation: share(conversationTools), context: share(context) },
      rows: [
        { key: 'system', label: 'system', tokens: system, share: share(system), band: 'system' },
        { key: 'conversation', label: 'conversation', tokens: conversationTools, share: share(conversationTools), band: 'conversation' },
        { key: 'compartments', label: 'compartments', tokens: compartments, share: share(compartments), band: 'context', count: liveCounts?.compartments ?? null },
        { key: 'memories', label: 'memories', tokens: memories, share: share(memories), band: 'context', count: liveCounts?.memoryBlocks ?? null },
        { key: 'profile', label: 'profile', tokens: profile, share: share(profile), band: 'context' },
        { key: 'facts', label: 'facts', tokens: facts, share: share(facts), band: 'context' },
      ],
      subRows: [
        { key: 'conversation', tokens: conversation, share: share(conversation) },
        { key: 'toolCalls', tokens: toolCalls, share: share(toolCalls) },
        { key: 'toolDefinitions', tokens: toolDefinitions, share: share(toolDefinitions) },
      ],
    };
  });

  const memoryActive = createMemo(() => snapshot()?.counts?.memories?.active ?? 0);
  const memoryArchived = createMemo(() => snapshot()?.counts?.memories?.archived ?? 0);
  const memoryCount = createMemo(() => snapshot()?.counts?.memories?.total ?? 0);

  const counts = createMemo(() => {
    if (!snapshot()?.project) return null;
    const liveCounts = snapshot()?.liveCounts;
    const rpc = live().source === 'rpc';
    const payload = notes();
    return {
      compartments: rpc ? liveCounts?.compartments ?? null : null,
      memoryBlocks: rpc ? liveCounts?.memoryBlocks ?? null : null,
      sessionNotes: payload?.counts?.session?.active ?? null,
      dismissed: payload?.counts?.session?.dismissed ?? null,
      smartNotes: payload?.counts?.smart?.total ?? null,
      liveMemories: rpc ? liveCounts?.memories ?? null : null,
      readySmartNotes: rpc ? liveCounts?.readySmartNotes ?? null : null,
      embedding: rpc ? snapshot()?.embedding ?? null : null,
      memoriesActive: memoryActive(),
      memoriesArchived: memoryArchived(),
      memoriesTotal: memoryCount(),
    };
  });

  const notesTabCount = createMemo(() => {
    const payload = notes();
    if (!payload) return 0;
    return (payload.sessionNotes?.length ?? 0) + (payload.smartNotes?.length ?? 0);
  });

  const memoriesTabCount = createMemo(() => snapshot()?.counts?.memories?.total ?? 0);

  const fresh = createMemo(() => {
    if (loading() || !snapshot()) return null;
    const source = live().source;
    const ageMs = liveAgeMs();
    const word = source === 'rpc' ? 'fresh.rpc' : source === 'session-meta' ? 'fresh.session-meta' : 'fresh.none';
    const seconds = ageMs === null ? null : Math.round(ageMs / 1000);
    return { source, word, seconds, stale: isStale() || source === 'session-meta' };
  });

  const listCount = createMemo(() => {
    if (filtering()) return { matching: memoryTotal(), shown: memoryRows().length };
    return { shown: memoryRows().length, total: memoryTotal(), active: memoryActive() };
  });

  const activeMemory = createMemo<MemoryRow | null>(() => {
    const rows = memoryRows();
    if (rows.length === 0) return null;
    return rows.find((row) => row.id === selectedMemoryId()) ?? rows[0];
  });

  const allNotes = createMemo(() => {
    const payload = notes();
    if (!payload) return [] as NoteRow[];
    return [
      ...(payload.sessionNotes ?? []),
      ...(payload.smartNotes ?? []),
      ...(dismissedOpen() ? dismissedNotes() ?? [] : []),
    ];
  });

  const activeNote = createMemo<NoteRow | null>(() => {
    const list = allNotes();
    if (list.length === 0) return null;
    return list.find((row) => row.id === selectedNoteId()) ?? list[0];
  });

  const readSnapshotOnce = (override?: Target): Promise<Snapshot | null> => {
    if (inFlight) {
      again = true;
      return inFlight;
    }
    const current = override ?? currentTarget;
    inFlight = readSnapshot(request, current)
      .then((next) => {
        const previous = snapshot();
        if (previous && Date.parse(next.observedAt) <= Date.parse(previous.observedAt)) return previous;
        setSnapshot(next);
        setSnapshotError(null);
        return next;
      })
      .catch((error: unknown) => {
        setSnapshotError(reasonOf(error));
        return null;
      })
      .finally(() => {
        inFlight = null;
        if (again) {
          again = false;
          void readSnapshotOnce();
        }
      });
    return inFlight;
  };

  const loadMemories = async (
    reset: boolean,
    override?: { target?: Target; filters?: { status: string; category: string }; search?: string },
  ): Promise<void> => {
    const mine = ++listToken;
    const current = override?.target ?? currentTarget;
    const activeFilters = override?.filters ?? filters();
    try {
      const result = await readMemories(request, current, {
        search: override?.search ?? query(),
        status: activeFilters.status,
        category: activeFilters.category,
        limit: PAGE_SIZE,
        offset: reset ? 0 : memoryRows().length,
      });
      if (mine !== listToken) return;
      const nextRows = reset
        ? result.rows
        : [...memoryRows(), ...result.rows.filter((row) => !memoryRows().some((existing) => existing.id === row.id))];
      setMemoryRows(nextRows);
      setMemoryTotal(result.page.total);
      const selected = selectedMemoryId();
      if (selected !== null && !nextRows.some((row) => row.id === selected)) setSelectedMemoryId(null);
      setListError(null);
    } catch (error) {
      if (mine !== listToken) return;
      setListError(reasonOf(error));
    }
  };

  const loadNotes = async (override?: Target): Promise<void> => {
    const mine = ++noteRequest;
    try {
      const result = await readNotes(request, override ?? currentTarget);
      if (mine !== noteRequest) return;
      setNotes(result);
      setListError(null);
    } catch (error) {
      if (mine !== noteRequest) return;
      setListError(reasonOf(error));
    }
  };

  const loadAll = async (override?: Target): Promise<void> => {
    const current = override ?? currentTarget;
    const results = await Promise.allSettled([
      readSnapshotOnce(current),
      loadMemories(true, { target: current, filters: filters(), search: query() }),
      loadNotes(current),
    ]);
    const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failed) setListError(reasonOf(failed.reason));
    setLoading(false);
  };

  const setTarget = (next: Partial<Target>): void => {
    const previous = currentTarget;
    const merged: Target = {
      sessionId: next.sessionId !== undefined ? next.sessionId : previous.sessionId,
      directory: next.directory !== undefined ? next.directory : previous.directory,
    };
    if (merged.sessionId === previous.sessionId && merged.directory === previous.directory) return;
    currentTarget = merged;
    listToken += 1;
    noteRequest += 1;
    setTargetSignal(merged);
    setMemoryRows([]);
    setMemoryTotal(0);
    setSelectedMemoryId(null);
    setSelectedNoteId(null);
    setNotes(null);
    setDismissedNotes(null);
    setDismissedOpen(false);
    setSnapshot(null);
    setSnapshotError(null);
    setListError(null);
    setPane('list');
    setLoading(true);
    if (started) void loadAll(merged);
  };

  const refresh = async (): Promise<void> => {
    if (updating()) return;
    setUpdating(true);
    try {
      await loadAll();
    } finally {
      setUpdating(false);
      setNowTick(Date.now());
    }
  };

  const retry = (): void => {
    void loadAll();
  };

  const checkHealth = async (): Promise<void> => {
    try {
      const result = await health(request);
      setHealthOk(Boolean(result.ok));
    } catch {
      setHealthOk(false);
    }
  };

  const openDismissed = async (): Promise<void> => {
    if (dismissedOpen()) {
      setDismissedOpen(false);
      return;
    }
    setDismissedOpen(true);
    if (dismissedNotes() !== null || dismissedLoading()) return;
    setDismissedLoading(true);
    try {
      const result = await readNotes(request, currentTarget, true);
      setDismissedNotes((result.sessionNotes ?? []).filter((row) => row.status === 'dismissed'));
      setDismissedError(null);
    } catch (error) {
      setDismissedError(reasonOf(error));
    } finally {
      setDismissedLoading(false);
    }
  };

  const selectMemory = (id: number, open = false): void => {
    setSelectedMemoryId(id);
    if (open && matchMedia('(max-width: 599.98px)').matches) setPane('detail');
  };

  const selectNote = (id: number, open = false): void => {
    setSelectedNoteId(id);
    if (open && matchMedia('(max-width: 599.98px)').matches) setPane('detail');
  };

  const setView = (next: View): void => {
    setViewSignal(next);
    setPane('list');
    setFilterOpen(false);
  };

  const clearFilters = (): void => {
    const cleared = { status: 'all', category: 'all' };
    setFiltersSignal(cleared);
    setQuerySignal('');
    if (started) void loadMemories(true, { filters: cleared, search: '' });
  };

  const applyFilters = (next: { status?: string; category?: string }): void => {
    const merged = { ...filters(), ...next };
    setFiltersSignal(merged);
    if (started) void loadMemories(true, { filters: merged });
  };

  const setSearch = (value: string): void => {
    setQuerySignal(value);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (started) void loadMemories(true, { search: value });
    }, SEARCH_DEBOUNCE_MS);
  };

  const loadMore = (): void => {
    if (!filtering()) void loadMemories(false);
  };

  const resetSelection = (): void => {
    setSelectedMemoryId(null);
    setSelectedNoteId(null);
  };

  const startPolling = (): (() => void) => {
    const stop = (): void => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };
    const tick = (): void => {
      if (document.visibilityState === 'visible') void readSnapshotOnce();
    };
    const schedule = (): void => {
      stop();
      if (document.visibilityState === 'visible') pollTimer = setInterval(tick, REFRESH_MS);
    };
    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void readSnapshotOnce();
        schedule();
      } else {
        stop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    schedule();
    tickTimer = setInterval(() => setNowTick(Date.now()), 1_000);
    return () => {
      stop();
      if (tickTimer) clearInterval(tickTimer);
      if (searchTimer) clearTimeout(searchTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  };

  let stopPolling: (() => void) | null = null;

  const start = (initial?: Target): void => {
    if (started) return;
    if (initial) {
      currentTarget = initial;
      setTargetSignal(initial);
    }
    started = true;
    void checkHealth();
    stopPolling = startPolling();
    void loadAll(initial ?? target());
  };

  const dispose = (): void => {
    stopPolling?.();
    stopPolling = null;
    started = false;
  };

  return {
    target,
    isStarted: () => started,
    snapshot,
    snapshotError,
    listError,
    memoryRows,
    memoryTotal,
    notes,
    dismissedNotes,
    dismissedLoading,
    dismissedError,
    dismissedOpen,
    loading,
    updating,
    view,
    pane,
    selectedMemoryId,
    selectedNoteId,
    filters,
    query,
    compositionOpen,
    filterOpen,
    nowTick,
    healthOk,
    live,
    liveAgeMs,
    isStale,
    banner,
    bodyState,
    usage,
    thresholds,
    composition,
    counts,
    notesTabCount,
    memoriesTabCount,
    fresh,
    listCount,
    activeMemory,
    allNotes,
    activeNote,
    memoryActive,
    memoryArchived,
    filtering,
    setTarget,
    start,
    dispose,
    refresh,
    retry,
    openDismissed,
    selectMemory,
    selectNote,
    setView,
    setPane,
    setCompositionOpen,
    setFilterOpen,
    clearFilters,
    applyFilters,
    setSearch,
    loadMore,
    resetSelection,
    setSnapshot,
    setSnapshotError,
    setListError,
    setLoading,
    setNotes,
    setMemoryRows,
    setMemoryTotal,
    setNowTick,
    setTargetSignal,
  };
};

export type Panel = ReturnType<typeof createPanel>;
