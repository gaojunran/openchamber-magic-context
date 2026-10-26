import { For, Show } from 'solid-js';
import { age, number, t, type MessageKey } from '../i18n';
import type { MemoryRow as MemoryRecord, NoteRow as NoteRecord } from '../state/service';
import { categoryKey } from './Content';

const CATEGORY_VALUES = ['all', 'rules', 'architecture', 'constraints', 'config', 'naming'] as const;
const CATEGORY_LABELS: Record<(typeof CATEGORY_VALUES)[number], MessageKey> = {
  all: 'memories.all',
  rules: 'memories.cat.rules',
  architecture: 'memories.cat.architecture',
  constraints: 'memories.cat.constraints',
  config: 'memories.cat.config',
  naming: 'memories.cat.naming',
};

const STATUS_VALUES = ['all', 'active', 'archived'] as const;

export const FilterPanel = (props: {
  open: boolean;
  status: string;
  category: string;
  counts: { total: number; active: number; archived: number };
  onOpen: (open: boolean) => void;
  onStatus: (value: string) => void;
  onCategory: (value: string) => void;
  onClear: () => void;
}) => {
  const active = () => props.status !== 'all' || props.category !== 'all';
  const label = () => {
    const parts: string[] = [];
    if (props.status !== 'all') parts.push(t(`memories.status.${props.status}` as MessageKey));
    if (props.category !== 'all') parts.push(t(CATEGORY_LABELS[props.category as keyof typeof CATEGORY_LABELS] ?? 'memories.all'));
    return parts.length > 0 ? parts.join(' · ') : t('memories.filters');
  };
  let popup: HTMLDivElement | undefined;

  return (
    <>
      <button
        class="oc-sdk-trigger mc-filter-btn"
        type="button"
        aria-expanded={props.open ? 'true' : 'false'}
        aria-haspopup="dialog"
        data-active={active() ? 'true' : 'false'}
        aria-label={active() ? `${t('memories.filters')}: ${label()}` : t('memories.filters')}
        title={active() ? `${t('memories.filters')}: ${label()}` : t('memories.filters')}
        onClick={() => props.onOpen(!props.open)}
      >
        <svg class="mc-filter-icon" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" />
        </svg>
        <span class="oc-sdk-trigger-value" data-empty={!active() ? 'true' : 'false'}>{label()}</span>
        <svg class="oc-sdk-trigger-chevron" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
          <path d="M12 13.172l4.95-4.95 1.414 1.414L12 16 5.636 9.636 7.05 8.222z" />
        </svg>
      </button>

      <div
        class="oc-sdk-popup mc-popup mc-filter-panel"
        role="dialog"
        aria-label={t('memories.filters')}
        ref={(element) => { popup = element; }}
        hidden={!props.open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            props.onOpen(false);
            (popup?.previousElementSibling as HTMLElement | null)?.focus();
          }
        }}
      >
        <div class="mc-chip-group" role="group" aria-labelledby="flt-status">
          <span class="mc-label" id="flt-status">{t('memories.filterStatus')}</span>
          <div class="mc-chips">
            <For each={STATUS_VALUES}>
              {(value) => (
                <button
                  class="oc-sdk-btn"
                  data-variant={props.status === value ? 'default' : 'outline'}
                  data-size="xs"
                  type="button"
                  aria-pressed={props.status === value ? 'true' : 'false'}
                  onClick={() => props.onStatus(value)}
                >
                  <span>{t(value === 'all' ? 'memories.all' : `memories.status.${value}` as MessageKey)}</span>
                  <span class="mc-chip-count">
                    {value === 'all' ? props.counts.total : value === 'active' ? props.counts.active : props.counts.archived}
                  </span>
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="mc-chip-group" role="group" aria-labelledby="flt-category">
          <span class="mc-label" id="flt-category">{t('memories.filterCategory')}</span>
          <div class="mc-chips">
            <For each={CATEGORY_VALUES}>
              {(value) => (
                <button
                  class="oc-sdk-btn"
                  data-variant={props.category === value ? 'default' : 'outline'}
                  data-size="xs"
                  type="button"
                  aria-pressed={props.category === value ? 'true' : 'false'}
                  onClick={() => props.onCategory(value)}
                >
                  {t(CATEGORY_LABELS[value])}
                </button>
              )}
            </For>
          </div>
        </div>

        <div class="mc-filter-foot" hidden={!active()}>
          <button class="oc-sdk-btn" data-variant="ghost" data-size="xs" type="button" onClick={() => props.onClear()}>
            {t('memories.noMatch.action')}
          </button>
        </div>
      </div>
    </>
  );
};

const preview = (text: string): string => text
  .replace(/^#{1,6}\s+/gm, '')
  .replace(/\*\*|__/g, '')
  .replace(/`/g, '')
  .replace(/\s+/g, ' ')
  .trim();

export const MemoryRow = (props: {
  row: MemoryRecord;
  selected: boolean;
  now: number;
  onSelect: (row: MemoryRecord) => void;
  tabIndex: number;
}) => (
  <div
    class="mc-item"
    role="option"
    aria-selected={props.selected ? 'true' : 'false'}
    tabindex={props.tabIndex}
    data-id={props.row.id}
    onClick={() => props.onSelect(props.row)}
  >
    <div class="mc-meta">
      <span class="mc-cat">{t(categoryKey(props.row.category))}</span>
      <Show when={props.row.status === 'archived'}>
        <span class="oc-sdk-badge mc-badge" data-tone="neutral">{t('memories.status.archived')}</span>
      </Show>
      <span class="mc-dotsep" />
      <span class="mc-age">{age(props.row.updatedAt, 'short', props.now)}</span>
      <span class="mc-imp">{number(props.row.importance)}</span>
    </div>
    <div class="mc-text">{preview(props.row.content)}</div>
  </div>
);

const noteTone = (status: string): 'success' | 'warning' | 'neutral' =>
  status === 'ready' ? 'success' : status === 'pending' ? 'warning' : 'neutral';

export const NoteRow = (props: {
  row: NoteRecord;
  selected: boolean;
  now: number;
  onSelect: (row: NoteRecord) => void;
  tabIndex: number;
}) => (
  <div
    class="mc-item"
    role="option"
    aria-selected={props.selected ? 'true' : 'false'}
    tabindex={props.tabIndex}
    data-id={props.row.id}
    data-kind={props.row.type}
    onClick={() => props.onSelect(props.row)}
  >
    <div class="mc-meta">
      <Show when={props.row.status !== 'active' || props.row.type === 'smart'}>
        <span class="oc-sdk-badge mc-badge" data-tone={noteTone(props.row.status)}>
          {t(`notes.status.${props.row.status}` as MessageKey)}
        </span>
      </Show>
      <span class="mc-age">{age(props.row.updatedAt, 'long', props.now)}</span>
    </div>
    <div class="mc-text">{preview(props.row.content)}</div>
  </div>
);

export const walkList = (event: KeyboardEvent): HTMLElement | null => {
  const list = event.currentTarget as HTMLElement;
  const rows = [...list.querySelectorAll<HTMLElement>('.mc-item')];
  if (rows.length === 0) return null;
  const current = rows.indexOf(document.activeElement as HTMLElement);
  if (event.key === 'ArrowDown') return rows[Math.min(rows.length - 1, current + 1)];
  if (event.key === 'ArrowUp') return rows[Math.max(0, current - 1)];
  if (event.key === 'Home') return rows[0];
  if (event.key === 'End') return rows[rows.length - 1];
  return null;
};

