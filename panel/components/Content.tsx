import { For, Show } from 'solid-js';
import { age, number, t, type MessageKey } from '../i18n';
import type { MemoryRow, NoteRow } from '../state/service';

type Segment = { kind: 'text' | 'code' | 'bold'; text: string };
type Line = { heading: boolean; segments: Segment[] };

const inline = (text: string): Segment[] => {
  const segments: Segment[] = [];
  for (const part of text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      segments.push({ kind: 'code', text: part.slice(1, -1) });
    } else if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      segments.push({ kind: 'bold', text: part.slice(2, -2) });
    } else {
      segments.push({ kind: 'text', text: part });
    }
  }
  return segments;
};

const parse = (text: string): Line[] => text.split('\n').map((line) => {
  const heading = /^#{1,6}\s+(.*)$/.exec(line);
  return { heading: heading !== null, segments: inline(heading ? heading[1] : line) };
});

export const RichText = (props: { text: string }) => {
  const lines = () => parse(props.text ?? '');
  return (
    <For each={lines()}>
      {(line, index) => (
        <>
          {index() > 0 ? '\n' : ''}
          <Show when={line.heading} fallback={<Segments segments={line.segments} />}>
            <span class="mc-h"><Segments segments={line.segments} /></span>
          </Show>
        </>
      )}
    </For>
  );
};

const Segments = (props: { segments: Segment[] }) => (
  <For each={props.segments}>
    {(segment) => (
      <Show when={segment.kind === 'code'} fallback={
        <Show when={segment.kind === 'bold'} fallback={<>{segment.text}</>}>
          <strong>{segment.text}</strong>
        </Show>
      }>
        <code>{segment.text}</code>
      </Show>
    )}
  </For>
);

export const categoryKey = (category: string): MessageKey => {
  switch (category) {
    case 'PROJECT_RULES': return 'memories.cat.rules';
    case 'CONSTRAINTS': return 'memories.cat.constraints';
    case 'CONFIG_VALUES': return 'memories.cat.config';
    case 'NAMING': return 'memories.cat.naming';
    default: return 'memories.cat.architecture';
  }
};

type ProvPair = { term: string; value: string; mono?: boolean; id?: boolean; iso?: string };

const Provenance = (props: { pairs: ProvPair[]; now: number }) => (
  <dl class="mc-prov">
    <For each={props.pairs.filter((pair) => pair.value !== '')}>
      {(pair) => (
        <>
          <dt title={pair.iso ?? undefined}>{pair.term}</dt>
          <dd class={pair.mono || pair.id ? (pair.id ? 'mc-mono mc-id' : 'mc-mono') : undefined} title={pair.id || pair.iso ? pair.value : undefined}>
            {pair.iso ? age(pair.iso, 'long', props.now) : pair.value}
          </dd>
        </>
      )}
    </For>
  </dl>
);

export const MemoryDetail = (props: { row: MemoryRow | null; now: number }) => (
  <Show when={props.row} fallback={<div class="mc-detail-empty" />}>
    {(row) => (
      <>
        <div class="mc-detail-head">
          <span class="mc-label">{t(categoryKey(row().category))}</span>
          <span class="oc-sdk-badge mc-badge" data-tone={row().status === 'archived' ? 'neutral' : undefined}>
            {t(row().status === 'archived' ? 'memories.status.archived' : 'memories.status.active')}
          </span>
          <span class="mc-detail-id mc-mono">#{row().id}</span>
        </div>
        <div class="mc-detail-inner">
          <div class="mc-content"><RichText text={row().content} /></div>
          <div class="oc-sdk-separator" data-labeled="false" />
          <Provenance now={props.now} pairs={[
            { term: t('memories.detail.importance'), value: row().classifiedAt ? number(row().importance) : `${number(row().importance)} · ${t('memories.detail.unclassified')}`, mono: true },
            { term: t('memories.detail.seen'), value: number(row().seenCount), mono: true },
            { term: t('memories.detail.retrieved'), value: number(row().retrievalCount), mono: true },
            { term: t('memories.detail.first'), value: row().firstSeenAt ?? '', iso: row().firstSeenAt ?? undefined },
            { term: t('memories.detail.updated'), value: row().updatedAt ?? '', iso: row().updatedAt ?? undefined },
            { term: t('memories.detail.category'), value: row().category, mono: true },
          ]} />
        </div>
      </>
    )}
  </Show>
);

export const NoteDetail = (props: { row: NoteRow | null; now: number }) => (
  <Show when={props.row} fallback={<div class="mc-detail-empty" />}>
    {(row) => (
      <>
        <div class="mc-detail-head">
          <span class="mc-label">{t(row().type === 'smart' ? 'notes.kind.smart' : 'notes.kind.session')}</span>
          <Show when={row().status !== 'active'}>
            <span class="oc-sdk-badge mc-badge" data-tone={row().status === 'ready' ? 'success' : 'neutral'}>
              {t(`notes.status.${row().status}` as MessageKey)}
            </span>
          </Show>
          <span class="mc-detail-id mc-mono">#{row().id}</span>
        </div>
        <div class="mc-detail-inner">
          <Show when={row().type === 'smart' && row().surfaceCondition}>
            <div class="mc-condition">
              <span class="mc-condition-label">
                {t(row().status === 'ready' ? 'notes.conditionReady' : 'notes.condition')}
              </span>
              <span class="mc-condition-body">{row().surfaceCondition}</span>
            </div>
          </Show>
          <div class="mc-content"><RichText text={row().content} /></div>
          <div class="oc-sdk-separator" data-labeled="false" />
          <Provenance now={props.now} pairs={[
            { term: t('notes.detail.created'), value: row().createdAt ?? '', iso: row().createdAt ?? undefined },
            { term: t('notes.detail.updated'), value: row().updatedAt ?? '', iso: row().updatedAt ?? undefined },
            { term: t('notes.detail.session'), value: row().sessionId ?? '', id: true },
            { term: t('notes.detail.project'), value: row().projectId ?? '', id: true },
          ]} />
        </div>
      </>
    )}
  </Show>
);
