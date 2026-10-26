import { For, Show, createEffect } from 'solid-js';
import { t } from '../i18n';
import type { Panel } from '../state/panel';
import { KitEmpty, KitSearch } from '../components/kit';
import { FilterPanel, MemoryRow, walkList } from '../components/Lists';
import { MemoryDetail } from '../components/Content';

export const Memories = (props: { panel: Panel }) => {
  const panel = props.panel;

  createEffect(
    () => ({ rows: panel.memoryRows(), selected: panel.selectedMemoryId() }),
    ({ rows, selected }) => {
      if (rows.length === 0 || selected !== null) return;
      if (matchMedia('(max-width: 599.98px)').matches) return;
      panel.selectMemory(rows[0].id);
    },
  );

  let list: HTMLDivElement | undefined;

  const selectElement = (element: HTMLElement, open = false): void => {
    const id = Number(element.dataset.id);
    const row = panel.memoryRows().find((candidate) => candidate.id === id);
    if (row) panel.selectMemory(row.id, open);
  };

  return (
    <section class="mc-view mc-split" data-view="memories" data-active={panel.view() === 'memories' ? 'true' : 'false'}>
      <div class="mc-list-pane">
        <Show when={panel.bodyState() === 'content'}>
          <div class="mc-filters">
            <KitSearch
              value={panel.query()}
              onChange={(value) => panel.setSearch(value)}
              placeholder={t('memories.searchPlaceholder')}
              label={t('memories.searchLabel')}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' && list) {
                  const first = list.querySelector<HTMLElement>('.mc-item');
                  if (first) {
                    event.preventDefault();
                    first.focus();
                    selectElement(first);
                  }
                }
              }}
            />
            <FilterPanel
              open={panel.filterOpen()}
              status={panel.filters().status}
              category={panel.filters().category}
              counts={{
                total: panel.snapshot()?.counts?.memories?.total ?? 0,
                active: panel.memoryActive(),
                archived: panel.memoryArchived(),
              }}
              onOpen={(open) => panel.setFilterOpen(open)}
              onStatus={(status) => panel.applyFilters({ status })}
              onCategory={(category) => panel.applyFilters({ category })}
              onClear={() => panel.clearFilters()}
            />
          </div>
        </Show>

        <Show when={panel.bodyState() === 'content'}>
          <div class="mc-scroll">
            <div
              class="mc-list"
              role="listbox"
              aria-label={t('memories.listLabel')}
              ref={(element) => { list = element; }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') return;
                const next = walkList(event);
                if (next) {
                  event.preventDefault();
                  next.focus();
                  selectElement(next);
                  return;
                }
                if (event.key === 'Enter' || event.key === ' ') {
                  const active = document.activeElement as HTMLElement | null;
                  if (active?.classList.contains('mc-item')) {
                    event.preventDefault();
                    selectElement(active, true);
                  }
                }
              }}
            >
              <For each={panel.memoryRows()}>
                {(row, index) => (
                  <MemoryRow
                    row={row}
                    selected={panel.selectedMemoryId() === row.id}
                    now={panel.nowTick()}
                    tabIndex={panel.selectedMemoryId() === row.id || (panel.selectedMemoryId() === null && index() === 0) ? 0 : -1}
                    onSelect={(next) => panel.selectMemory(next.id, true)}
                  />
                )}
              </For>
            </div>
            <div class="mc-list-foot">
              <Show when={!panel.filtering() && panel.memoryRows().length < panel.memoryTotal()}>
                <button class="oc-sdk-btn mc-loadmore" data-variant="ghost" data-size="sm" type="button" onClick={() => panel.loadMore()}>
                  {t('memories.loadMore')}
                </button>
              </Show>
              <span class="mc-list-count">
                <Show
                  when={!panel.filtering()}
                  fallback={t('memories.countMatching', { n: panel.listCount().matching ?? 0 })}
                >
                  {`${t('memories.countPage', {
                    shown: panel.listCount().shown ?? 0,
                    total: panel.listCount().total ?? 0,
                  })} · ${t('memories.countActive', { n: panel.listCount().active ?? 0 })}`}
                </Show>
              </span>
            </div>
          </div>
        </Show>

        <Show when={panel.bodyState() === 'loading'}>
          <div class="mc-state mc-skeleton" style={{ padding: '4px 12px' }}>
            <For each={[0, 1, 2, 3, 4]}>
              {() => (
                <div class="mc-skeleton-row">
                  <span class="mc-skel" data-h="8" style={{ width: '38%' }} />
                  <span class="mc-skel" data-h="8" style={{ width: '96%' }} />
                  <span class="mc-skel" data-h="8" style={{ width: '64%' }} />
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={panel.bodyState() === 'no-project'}>
          <KitEmpty title={t('memories.noProject.title')} body={t('memories.noProject.body')} />
        </Show>

        <Show when={panel.bodyState() === 'no-usage'}>
          <KitEmpty title={t('memories.empty.title')} body={t('memories.empty.body')} />
        </Show>

        <Show when={panel.bodyState() === 'no-match'}>
          <KitEmpty
            title={t('memories.noMatch.title')}
            body={t('memories.noMatch.body')}
            action={{ label: t('memories.noMatch.action'), onClick: () => panel.clearFilters() }}
          />
        </Show>

        <Show when={panel.bodyState() === 'error'}>
          <KitEmpty
            tone="alert"
            title={t('memories.error.title')}
            body={t('memories.error.body')}
            action={{ label: t('state.retry'), onClick: () => panel.retry() }}
          />
        </Show>
      </div>

      <div class="mc-detail-pane">
        <div class="mc-detail-scroll">
          <MemoryDetail row={panel.activeMemory()} now={panel.nowTick()} />
        </div>
      </div>
    </section>
  );
};
