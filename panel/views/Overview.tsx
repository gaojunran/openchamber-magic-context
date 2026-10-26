import { For, Show } from 'solid-js';
import { number, percent, t } from '../i18n';
import type { Panel } from '../state/panel';
import { KitEmpty } from '../components/kit';

const cacheLeftMs = (panel: Panel): number | null => {
  const cache = panel.snapshot()?.cache;
  const observedAt = panel.snapshot()?.live.observedAt ?? panel.snapshot()?.observedAt;
  if (!cache || cache.remainingMs === null || !observedAt) return null;
  const at = Date.parse(observedAt);
  if (Number.isNaN(at)) return null;
  return Math.max(0, cache.remainingMs - Math.max(0, panel.nowTick() - at));
};

const Skeleton = () => (
  <div class="mc-state mc-skeleton">
    <div class="mc-overview-inner">
      <section class="mc-sec">
        <div class="mc-skel" data-h="8" style={{ width: '92px' }} />
        <div class="mc-skeleton-hero">
          <span class="mc-skel" data-h="32" style={{ width: '110px' }} />
          <span class="mc-skel" data-h="8" style={{ flex: 1 }} />
        </div>
        <span class="mc-skel" data-h="8" style={{ width: '58%' }} />
      </section>
      <section class="mc-sec">
        <div class="mc-skel" data-h="8" style={{ width: '104px' }} />
        <div class="mc-skeleton-rows">
          <For each={[0, 1, 2, 3, 4, 5]}>
            {() => <span class="mc-skel" data-h="8" style={{ width: '100%' }} />}
          </For>
        </div>
      </section>
      <section class="mc-sec">
        <div class="mc-skel" data-h="8" style={{ width: '56px' }} />
        <span class="mc-skel" data-h="8" style={{ width: '72%' }} />
      </section>
    </div>
  </div>
);

export const Overview = (props: { panel: Panel; onBrowse: () => void }) => {
  const panel = props.panel;
  const state = () => panel.bodyState();

  return (
    <section class="mc-view" data-view="overview" data-active={panel.view() === 'overview' ? 'true' : 'false'}>
      <Show when={state() === 'loading'}><Skeleton /></Show>

      <Show when={state() === 'no-project'}>
        <KitEmpty title={t('overview.noProject.title')} body={t('overview.noProject.body')} />
      </Show>

      <Show when={state() === 'no-usage'}>
        <KitEmpty
          title={t('overview.nousage.title')}
          body={t('overview.nousage.body')}
          action={{ label: t('overview.nousage.action'), onClick: props.onBrowse }}
        />
      </Show>

      <Show when={state() === 'error'}>
        <KitEmpty
          tone="alert"
          title={t('overview.error.title')}
          body={t('overview.error.body')}
          action={{ label: t('state.retry'), onClick: () => panel.retry() }}
        />
      </Show>

      <Show when={state() === 'content'}>
        <div class="mc-scroll mc-overview">
          <div class="mc-overview-inner">
            <section class="mc-sec mc-sec--hero" data-area="hero">
              <div class="mc-sec-head">
                <h2 class="mc-label">{t('overview.context')}</h2>
                <span class="mc-sec-note mc-mono">
                  {t('overview.windowNote', {
                    used: number(panel.usage()?.tokens),
                    limit: number(panel.usage()?.limit),
                  })}
                </span>
              </div>
              <div class="mc-hero">
                <span class="mc-hero-num">
                  {percent(panel.usage()?.percent)}
                  <span class="mc-hero-unit">%</span>
                </span>
                <div
                  class="mc-meter"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={Math.round(panel.usage()?.percent ?? 0)}
                  aria-label={t('overview.meterLabel', { percent: percent(panel.usage()?.percent) })}
                  title={panel.thresholds()
                    ? t('overview.meterTitle', {
                      soft: number(panel.thresholds()?.soft),
                      hard: number(panel.thresholds()?.hard),
                    })
                    : undefined}
                >
                  <span class="mc-meter-fill" style={{ width: `${Math.min(100, Math.max(0, panel.usage()?.percent ?? 0))}%` }} />
                  <Show when={panel.thresholds()}>
                    <span
                      class="mc-meter-tick"
                      style={{ 'inset-inline-start': `${Math.min(100, Math.max(0, panel.thresholds()!.percent ?? 0))}%` }}
                      aria-hidden="true"
                    />
                  </Show>
                </div>
              </div>
              <div class="mc-hero-cap">
                <Show when={panel.thresholds()}>
                  <p class="mc-hint">
                    {t('overview.threshold', {
                      percent: percent(panel.thresholds()!.percent),
                      tokens: number(panel.thresholds()!.tokens),
                    })}
                  </p>
                </Show>
                <Show when={panel.usage()?.native !== null && panel.usage()?.native !== undefined}>
                  <span class="mc-raw">{t('overview.raw', { percent: percent(panel.usage()?.native) })}</span>
                </Show>
              </div>
            </section>

            <section class="mc-sec" data-area="bd">
              <div class="mc-sec-head">
                <h2 class="mc-label">{t('overview.composition')}</h2>
                <Show when={panel.composition()}>
                  {(view) => (
                    <span class="mc-sec-note mc-context-share">
                      {t('overview.contextShare', {
                        tokens: number(view().magicContextTokens),
                        share: `${view().magicContextShare.toFixed(1)}%`,
                      })}
                    </span>
                  )}
                </Show>
              </div>

              <Show
                when={panel.composition()}
                fallback={<p class="mc-inline-note">{t('overview.compositionOffline')}</p>}
              >
                {(view) => (
                  <div class="mc-comp">
                    <div
                      class="mc-band"
                      role="img"
                      aria-label={t('overview.bandLabel', {
                        conversation: number(view().rows.find((row) => row.key === 'conversation')?.tokens),
                        system: number(view().rows.find((row) => row.key === 'system')?.tokens),
                        context: number(view().magicContextTokens),
                      })}
                    >
                      <span class="mc-band-seg" data-band="system" style={{ width: `${view().bands.system}%` }} />
                      <span class="mc-band-seg" data-band="conversation" style={{ width: `${view().bands.conversation}%` }} />
                      <span class="mc-band-seg" data-band="context" style={{ width: `${view().bands.context}%` }} />
                    </div>

                    <ul class="mc-bd">
                      <For each={view().rows}>
                        {(row) => (
                          <Show
                            when={row.key === 'conversation'}
                            fallback={
                              <li class="mc-bd-row" data-zero={row.tokens === 0}>
                                <span class="mc-bd-chip" data-band={row.band} aria-hidden="true" />
                                <span class="mc-bd-name">
                                  {t(row.label === 'profile' ? 'overview.profileDocs' : `overview.${row.label}` as 'overview.system')}
                                </span>
                                <Show when={row.count !== null && row.count !== undefined}>
                                  <span class="mc-bd-count">
                                    {row.key === 'memories'
                                      ? t('overview.blocks', { n: number(row.count) })
                                      : number(row.count)}
                                  </span>
                                </Show>
                                <span class="mc-bd-fill" />
                                <span class="mc-bd-tok">{number(row.tokens)}</span>
                                <span class="mc-bd-share">{row.share.toFixed(1)}%</span>
                              </li>
                            }
                          >
                            <li class="mc-bd-row mc-bd-group">
                              <button
                                class="mc-bd-toggle"
                                type="button"
                                aria-expanded={panel.compositionOpen() ? 'true' : 'false'}
                                aria-controls="bd-conv"
                                onClick={() => void panel.setCompositionOpen(!panel.compositionOpen())}
                              >
                                <span class="mc-bd-chip" data-band={row.band} aria-hidden="true" />
                                <span class="mc-bd-name">{t('overview.conversationTools')}</span>
                                <span class="mc-bd-caret" aria-hidden="true">
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9.5 5.5L16 12l-6.5 6.5z" />
                                  </svg>
                                </span>
                                <span class="mc-bd-fill" />
                                <span class="mc-bd-tok">{number(row.tokens)}</span>
                                <span class="mc-bd-share">{row.share.toFixed(1)}%</span>
                              </button>
                              <ul class="mc-bd-sub" id="bd-conv" hidden={!panel.compositionOpen()}>
                                <For each={view().subRows}>
                                  {(sub) => (
                                    <li>
                                      <span class="mc-bd-subname">
                                        {t(sub.key === 'toolCalls'
                                          ? 'overview.toolCalls'
                                          : sub.key === 'toolDefinitions' ? 'overview.toolDefinitions' : 'overview.conversation')}
                                      </span>
                                      <span class="mc-bd-tok">{number(sub.tokens)}</span>
                                      <span class="mc-bd-share">{sub.share.toFixed(1)}%</span>
                                    </li>
                                  )}
                                </For>
                              </ul>
                            </li>
                          </Show>
                        )}
                      </For>

                      <li class="mc-bd-row mc-bd-total">
                        <span class="mc-bd-chip" aria-hidden="true" />
                        <span class="mc-bd-name">{t('overview.inputTokens')}</span>
                        <span class="mc-bd-fill" />
                        <span class="mc-bd-tok">{number(view().total)}</span>
                        <span class="mc-bd-share" aria-hidden="true" />
                      </li>
                    </ul>
                  </div>
                )}
              </Show>
            </section>

            <Show when={panel.snapshot()?.live.source === 'rpc' && !panel.isStale() && panel.snapshot()?.cache}>
              <section class="mc-sec" data-area="cache">
                <div class="mc-sec-head">
                  <h2 class="mc-label">{t('overview.cache')}</h2>
                  <span class="mc-sec-note">{t('overview.cacheTtl', { ttl: panel.snapshot()?.cache?.ttl ?? '—' })}</span>
                </div>
                <div class="mc-cache-line">
                  <span class="mc-cache-left mc-mono">
                    <Show
                      when={(cacheLeftMs(panel) ?? 0) > 0}
                      fallback={t('overview.cacheExpired')}
                    >
                      {(() => {
                        const left = Math.floor((cacheLeftMs(panel) ?? 0) / 1000);
                        return t('overview.cacheLeft', {
                          m: Math.floor(left / 60),
                          s: String(left % 60).padStart(2, '0'),
                        });
                      })()}
                    </Show>
                  </span>
                  <span
                    class="mc-meter mc-meter--thin"
                    role="progressbar"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow={Math.round(((cacheLeftMs(panel) ?? 0) / (panel.snapshot()?.cache?.ttlMs || 1)) * 100)}
                    aria-label={t('overview.cacheMeterLabel')}
                  >
                    <span
                      class="mc-meter-fill"
                      style={{ width: `${Math.min(100, Math.max(0, ((cacheLeftMs(panel) ?? 0) / (panel.snapshot()?.cache?.ttlMs || 1)) * 100))}%` }}
                    />
                  </span>
                </div>
              </section>
            </Show>

            <section class="mc-sec" data-area="session">
              <h2 class="mc-label">{t('overview.sessionCounts')}</h2>
              <ul class="mc-stats">
                <li>
                  <span>{t('overview.compartmentsCount')}</span>
                  <b data-missing={panel.counts()?.compartments === null}>{number(panel.counts()?.compartments)}</b>
                </li>
                <li>
                  <span>{t('overview.memoryBlocks')}</span>
                  <b data-missing={panel.counts()?.memoryBlocks === null}>{number(panel.counts()?.memoryBlocks)}</b>
                </li>
                <li><span>{t('overview.sessionNotes')}</span><b>{number(panel.counts()?.sessionNotes)}</b></li>
              </ul>
            </section>

            <section class="mc-sec" data-area="project">
              <h2 class="mc-label">{t('overview.projectCounts')}</h2>
              <ul class="mc-stats">
                <li>
                  <span>{t('view.memories')}</span>
                  <b>{number(panel.counts()?.memoriesActive)}</b><i class="mc-stat-dim">{t('overview.statActive')}</i>
                  <Show when={(panel.counts()?.memoriesArchived ?? 0) > 0}>
                    <span class="mc-stat-sep" aria-hidden="true">·</span>
                    <b>{number(panel.counts()?.memoriesArchived)}</b><i class="mc-stat-dim">{t('overview.statArchived')}</i>
                  </Show>
                </li>
                <li>
                  <span>{t('notes.smartGroup')}</span>
                  <Show
                    when={panel.snapshot()?.live.source === 'rpc'}
                    fallback={<b data-missing="true">—</b>}
                  >
                    <b>{number(panel.counts()?.readySmartNotes)}</b>
                  </Show>
                </li>
                <li>
                  <span>{t('overview.memoryIndex')}</span>
                  <Show
                    when={panel.snapshot()?.live.source === 'rpc' && panel.counts()?.embedding}
                    fallback={<b data-missing="true">—</b>}
                  >
                    <b>{`${number(panel.counts()?.embedding?.indexed)} / ${number(panel.counts()?.embedding?.total)}`}</b>
                  </Show>
                </li>
              </ul>
            </section>

            <footer class="mc-foot">
              <span class="mc-mono" title={panel.snapshot()?.project?.id ?? ''}>
                {panel.snapshot()?.project?.id?.slice(0, 11) ?? '—'}
              </span>
              <span class="mc-foot-sep">·</span>
              <span class="mc-mono" title={panel.target().sessionId ?? ''}>
                {panel.target().sessionId?.slice(0, 16) ?? '—'}
              </span>
              <span class="mc-foot-sep">·</span>
              <span class="mc-mono">
                {panel.snapshot()?.live.source === 'rpc'
                  ? t('overview.footSource', {
                    source: t('source.rpc'),
                    plugin: panel.snapshot()?.live.pluginVersion ?? '—',
                  })
                  : t('overview.footDatabase')}
              </span>
              <span class="mc-foot-sep">·</span>
              <span class="mc-mono">{t('overview.footSchema', { version: number(panel.snapshot()?.schema.dbVersion) })}</span>
            </footer>
          </div>
        </div>
      </Show>
    </section>
  );
};
