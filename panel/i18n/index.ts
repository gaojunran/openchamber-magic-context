import { createSignal } from 'solid-js';
import { en } from './en';
import { zhCN } from './zh-CN';

export type Locale = 'en' | 'zh-CN';
export type MessageKey = keyof typeof en;

const catalogs: Record<Locale, Record<MessageKey, string>> = { en, 'zh-CN': zhCN };

if (import.meta.env.DEV) {
  const enKeys = Object.keys(en).sort().join('\n');
  const zhKeys = Object.keys(zhCN).sort().join('\n');
  if (enKeys !== zhKeys) throw new Error('i18n catalogs have different key sets');
}

const [locale, setLocaleSignal] = createSignal<Locale>('en');

export const currentLocale = locale;

export const setLocale = (tag: string | null | undefined): void => {
  setLocaleSignal(tag?.startsWith('zh') ? 'zh-CN' : 'en');
};

export const t = (key: MessageKey, args?: Record<string, string | number>): string => {
  const text = catalogs[locale()][key] ?? catalogs.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (args && name in args ? String(args[name]) : whole));
};

export const number = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toLocaleString(locale());

export const percent = (value: number | null | undefined, digits = 1): string =>
  value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);

/** Rounds like the design fixture: <1m just now, then m / h / d. */
export const age = (iso: string | null | undefined, format: 'short' | 'long' = 'short', now = Date.now()): string => {
  if (!iso) return '';
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return '';
  const minutes = Math.round(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return t('time.justNow');
  const [value, unit] = minutes < 60
    ? [minutes, 'm']
    : minutes < 60 * 24
      ? [Math.round(minutes / 60), 'h']
      : [Math.round(minutes / 1440), 'd'];
  return format === 'short'
    ? t(`time.${unit}` as MessageKey, { n: value })
    : t(`time.${unit}Ago` as MessageKey, { n: value });
};
