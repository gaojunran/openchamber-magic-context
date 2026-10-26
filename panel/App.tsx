import { Show, createEffect, onCleanup } from 'solid-js';
import { age, currentLocale, number, t, type MessageKey } from './i18n';
import type { Panel, View } from './state/panel';
import { KitBanner, KitTabs } from './components/kit';
import { Overview } from './views/Overview';
import { Memories } from './views/Memories';
import { Notes } from './views/Notes';

export const App = (props: { panel: Panel }) => {
  const panel = props.panel;

  const stateName = (): string => {
    const body = panel.bodyState();
    if (body === 'content') {
      const banner = panel.banner();
      if (banner?.kind === 'drift') return 'drift';
      if (banner?.kind === 'partial') return 'partial';
      if (banner?.kind === 'stale') return 'stale';
      return 'ready';
    }
    if (body === 'no-project' || body === 'no-match') return 'empty';
    return body;
  };

  const ageText = (): string | null => {
    const ms = panel.liveAgeMs();
    if (ms === null) return null;
    if (ms < 60_000) return t('time.s', { n: Math.round(ms / 1000) });
    const current = panel.snapshot();
    const iso = current?.live.observedAt ?? current?.observedAt;
    return iso ? age(iso, 'long', panel.nowTick()) : null;
  };

  const bannerBody = (): string => {
    const banner = panel.banner();
    if (!banner) return '';
    if (banner.kind === 'drift') {
      return t('schema.body', {
        plugin: number(panel.snapshot()?.schema.pluginSupportedVersion),
        db: number(panel.snapshot()?.schema.dbVersion),
      });
    }
    return t(banner.body as MessageKey);
  };

  const bannerAction = () => {
    const banner = panel.banner();
    if (!banner?.action) return undefined;
    if (banner.kind === 'stale') return { label: t('stale.action'), onClick: () => void panel.refresh() };
    return { label: t(banner.action as MessageKey), onClick: () => panel.retry() };
  };

  const focusSearch = (): void => {
    const input = document.querySelector<HTMLInputElement>('.mc-search-host input');
    if (!input) return;
    input.focus();
    input.select();
  };

  const keydown = (event: KeyboardEvent): void => {
    const target = event.target;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    if (event.key === 'Escape') {
      if (panel.filterOpen()) {
        panel.setFilterOpen(false);
        document.querySelector<HTMLElement>('.mc-filter-btn')?.focus();
        return;
      }
      if (panel.pane() === 'detail') {
        panel.setPane('list');
        return;
      }
      if (panel.query()) {
        panel.setSearch('');
        return;
      }
      return;
    }
    if (event.key === '/' && !event.metaKey && !event.ctrlKey && !typing) {
      if (panel.view() !== 'memories' || panel.bodyState() === 'loading') return;
      event.preventDefault();
      focusSearch();
    }
  };

  const click = (event: MouseEvent): void => {
    if (!panel.filterOpen()) return;
    const target = event.target as Node;
    const popup = document.querySelector('.mc-filter-panel');
    const trigger = document.querySelector('.mc-filter-btn');
    if (popup?.contains(target) || trigger?.contains(target)) return;
    panel.setFilterOpen(false);
  };

  document.addEventListener('keydown', keydown);
  document.addEventListener('click', click);

  let lastPane = panel.pane();
  createEffect(
    () => ({ pane: panel.pane(), view: panel.view(), selected: panel.selectedMemoryId(), selectedNote: panel.selectedNoteId() }),
    (now) => {
      if (now.pane === lastPane) return;
      const previous = lastPane;
      lastPane = now.pane;
      queueMicrotask(() => {
        if (now.pane === 'detail') {
          document.querySelector<HTMLElement>('.mc-back')?.focus();
          return;
        }
        if (previous === 'detail') {
          const id = now.view === 'memories' ? now.selected : now.selectedNote;
          const row = id === null ? null : document.querySelector<HTMLElement>(`.mc-view[data-active="true"] .mc-item[data-id="${id}"]`);
          (row ?? document.querySelector<HTMLElement>('.mc-view[data-active="true"] .mc-item'))?.focus();
        }
      });
    },
  );

  onCleanup(() => {
    document.removeEventListener('keydown', keydown);
    document.removeEventListener('click', click);
  });

  const tabs = () => [
    { id: 'overview', label: t('view.overview') },
    ...(panel.memoriesTabCount() > 0 ? [{ id: 'memories', label: t('view.memories'), count: panel.memoriesTabCount() }] : [{ id: 'memories', label: t('view.memories') }]),
    ...(panel.notesTabCount() > 0 ? [{ id: 'notes', label: t('view.notes'), count: panel.notesTabCount() }] : [{ id: 'notes', label: t('view.notes') }]),
  ];

  return (
    <div
      class="oc-sdk mc"
      data-view={panel.view()}
      data-state={stateName()}
      data-pane={panel.pane()}
      lang={currentLocale()}
    >
      <header class="mc-chrome">
        <KitTabs
          items={tabs()}
          active={panel.view()}
          label={t('chrome.tabsLabel')}
          onChange={(id) => panel.setView(id as View)}
        />

        <button class="mc-back" type="button" onClick={() => panel.setPane('list')}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M7.82843 10.9999H20V12.9999H7.82843L13.1924 18.3638L11.7782 19.778L4 11.9999L11.7782 4.22168L13.1924 5.63589L7.82843 10.9999Z" />
          </svg>
          <span>{t(panel.view() === 'memories' ? 'chrome.backMemories' : 'chrome.backNotes')}</span>
        </button>

        <div class="mc-chrome-end">
          <Show when={!panel.loading() && panel.fresh()}>
            <span
              class="mc-fresh"
              data-source={panel.fresh()!.source}
              data-stale={panel.fresh()!.stale ? 'true' : 'false'}
              role="status"
              aria-live="off"
            >
              <span class="mc-fresh-dot" aria-hidden="true" />
              <span class="mc-fresh-label">{t(panel.fresh()!.word as MessageKey)}</span>
              <Show when={ageText()}>
                <span class="mc-fresh-age">{t('fresh.age', { time: ageText() ?? '' })}</span>
              </Show>
            </span>
          </Show>
          <button
            class="oc-sdk-btn mc-icon-btn"
            data-variant="ghost"
            data-size="sm"
            type="button"
            aria-label={t('chrome.refresh')}
            title={panel.updating() ? t('chrome.updating') : t('chrome.lastUpdate', { time: ageText() ?? '—' })}
            disabled={panel.loading() || panel.updating()}
            onClick={() => void panel.refresh()}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M5.46257 4.43262C7.21556 2.91688 9.5007 2 12 2C17.5228 2 22 6.47715 22 12C22 14.1361 21.3302 16.1158 20.1892 17.7406L17 12H20C20 7.58172 16.4183 4 12 4C9.84982 4 7.89777 4.84827 6.46023 6.22842L5.46257 4.43262ZM18.5374 19.5674C16.7844 21.0831 14.4993 22 12 22C6.47715 22 2 17.5228 2 12C2 9.86386 2.66979 7.88416 3.8108 6.25944L7 12H4C4 16.4183 7.58172 20 12 20C14.1502 20 16.1022 19.1517 17.5398 17.7716L18.5374 19.5674Z" />
            </svg>
          </button>
        </div>
      </header>

      <Show when={panel.banner()}>
        <div class="mc-banner-slot">
          <KitBanner
            tone="warning"
            title={t(panel.banner()!.title as MessageKey)}
            body={bannerBody()}
            action={bannerAction()}
          />
        </div>
      </Show>

      <main class="mc-body">
        <Overview panel={panel} onBrowse={() => panel.setView('memories')} />
        <Memories panel={panel} />
        <Notes panel={panel} />
      </main>
    </div>
  );
};
