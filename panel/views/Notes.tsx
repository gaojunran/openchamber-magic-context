import { For, Show, createEffect } from 'solid-js';
import { t } from '../i18n';
import type { Panel } from '../state/panel';
import { KitEmpty } from '../components/kit';
import { NoteRow, walkList } from '../components/Lists';
import { NoteDetail } from '../components/Content';

export const Notes = (props: { panel: Panel }) => {
  const panel = props.panel;

  createEffect(
    () => ({ notes: panel.notes(), selected: panel.selectedNoteId() }),
    ({ notes, selected }) => {
      if (notes === null || selected !== null) return;
      if (matchMedia('(max-width: 599.98px)').matches) return;
      const row = notes.sessionNotes?.[0] ?? notes.smartNotes?.[0];
      if (row) panel.selectNote(row.id);
    },
  );

  const selectElement = (element: HTMLElement, open = false): void => {
    const id = Number(element.dataset.id);
    if (panel.allNotes().some((row) => row.id === id)) panel.selectNote(id, open);
  };

  const keyHandler = (event: KeyboardEvent): void => {
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
  };

  return (
    <section class="mc-view mc-split" data-view="notes" data-active={panel.view() === 'notes' ? 'true' : 'false'}>
      <div class="mc-list-pane">
        <Show when={panel.bodyState() === 'content'}>
          <div class="mc-scroll">
            <div class="mc-group" data-group="session">
              <div class="mc-group-head">
                <h2 class="mc-label">{t('notes.sessionGroup')}</h2>
                <Show when={(panel.notes()?.counts?.session?.active ?? 0) > 0}>
                  <span class="mc-group-count">{panel.notes()?.counts?.session?.active}</span>
                </Show>
              </div>

              <Show when={(panel.notes()?.sessionNotes?.length ?? 0) === 0}>
                <p class="mc-inline-empty">{t('notes.noSessionNotes.body')}</p>
              </Show>

              <Show when={(panel.notes()?.sessionNotes?.length ?? 0) > 0}>
                <div
                  class="mc-list"
                  role="listbox"
                  aria-label={t('notes.sessionListLabel')}
                  onKeyDown={keyHandler}
                >
                  <For each={panel.notes()?.sessionNotes ?? []}>
                    {(row, index) => (
                      <NoteRow
                        row={row}
                        selected={panel.selectedNoteId() === row.id}
                        now={panel.nowTick()}
                        tabIndex={panel.selectedNoteId() === row.id || (panel.selectedNoteId() === null && index() === 0) ? 0 : -1}
                        onSelect={(next) => panel.selectNote(next.id, true)}
                      />
                    )}
                  </For>
                </div>
              </Show>

              <Show when={(panel.notes()?.counts?.session?.dismissed ?? 0) > 0}>
                <button
                  class="mc-reveal"
                  type="button"
                  aria-expanded={panel.dismissedOpen() ? 'true' : 'false'}
                  aria-controls="notes-dismissed"
                  onClick={() => void panel.openDismissed()}
                >
                  {t(panel.dismissedOpen() ? 'notes.hideDismissed' : 'notes.showDismissed', {
                    n: panel.notes()?.counts?.session?.dismissed ?? 0,
                  })}
                </button>
              </Show>

              <Show when={panel.dismissedOpen()}>
                <div
                  class="mc-list mc-list--muted"
                  id="notes-dismissed"
                  role="listbox"
                  aria-label={t('notes.dismissedListLabel')}
                  onKeyDown={keyHandler}
                >
                  <Show when={panel.dismissedLoading()}>
                    <p class="mc-inline-empty">{t('chrome.updating')}</p>
                  </Show>
                  <Show when={panel.dismissedError()}>
                    <p class="mc-inline-empty">{t('notes.error.body')}</p>
                  </Show>
                  <For each={panel.dismissedNotes() ?? []}>
                    {(row) => (
                      <NoteRow
                        row={row}
                        selected={panel.selectedNoteId() === row.id}
                        now={panel.nowTick()}
                        tabIndex={-1}
                        onSelect={(next) => panel.selectNote(next.id, true)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>

            <div class="mc-group" data-group="smart">
              <div class="mc-group-head">
                <h2 class="mc-label">{t('notes.smartGroup')}</h2>
                <Show when={(panel.notes()?.counts?.smart?.active ?? 0) > 0}>
                  <span class="mc-group-count">{panel.notes()?.counts?.smart?.total}</span>
                </Show>
              </div>
              <Show when={(panel.notes()?.smartNotes?.length ?? 0) === 0}>
                <p class="mc-inline-empty">{t('notes.noSmart.body')}</p>
              </Show>
              <Show when={(panel.notes()?.smartNotes?.length ?? 0) > 0}>
                <div
                  class="mc-list"
                  role="listbox"
                  aria-label={t('notes.smartListLabel')}
                  onKeyDown={keyHandler}
                >
                  <For each={panel.notes()?.smartNotes ?? []}>
                    {(row) => (
                      <NoteRow
                        row={row}
                        selected={panel.selectedNoteId() === row.id}
                        now={panel.nowTick()}
                        tabIndex={-1}
                        onSelect={(next) => panel.selectNote(next.id, true)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        <Show when={panel.bodyState() === 'loading'}>
          <div class="mc-state mc-skeleton" style={{ padding: '12px 12px 0' }}>
            <div class="mc-skel" data-h="8" style={{ width: '88px', 'margin-bottom': '10px' }} />
            <div class="mc-skeleton-row">
              <span class="mc-skel" data-h="8" style={{ width: '26%' }} />
              <span class="mc-skel" data-h="8" style={{ width: '94%' }} />
              <span class="mc-skel" data-h="8" style={{ width: '60%' }} />
            </div>
            <div class="mc-skeleton-row" style={{ 'margin-top': '14px' }}>
              <span class="mc-skel" data-h="8" style={{ width: '30%' }} />
              <span class="mc-skel" data-h="8" style={{ width: '86%' }} />
              <span class="mc-skel" data-h="8" style={{ width: '48%' }} />
            </div>
          </div>
        </Show>

        <Show when={panel.bodyState() === 'no-project'}>
          <KitEmpty title={t('notes.noProject.title')} body={t('notes.noProject.body')} />
        </Show>

        <Show when={panel.bodyState() === 'no-usage'}>
          <KitEmpty title={t('notes.empty.title')} body={t('notes.empty.body')} />
        </Show>

        <Show when={panel.bodyState() === 'error'}>
          <KitEmpty
            tone="alert"
            title={t('notes.error.title')}
            body={t('notes.error.body')}
            action={{ label: t('state.retry'), onClick: () => panel.retry() }}
          />
        </Show>
      </div>

      <div class="mc-detail-pane">
        <div class="mc-detail-scroll">
          <NoteDetail row={panel.activeNote()} now={panel.nowTick()} />
        </div>
      </div>
    </section>
  );
};
