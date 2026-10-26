import { createEffect, onCleanup } from 'solid-js';
import { mountBanner, mountEmpty, mountSearchField, mountTabs, type BannerTone } from '@openchamber/sdk/ui';

export const KitTabs = (props: {
  items: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  label: string;
}) => {
  let host: HTMLDivElement | undefined;
  let handle: ReturnType<typeof mountTabs> | null = null;
  let lastItems = '';

  createEffect(
    () => ({ items: props.items, active: props.active, label: props.label }),
    (propsNow) => {
      if (!host) return;
      if (!handle) {
        handle = mountTabs(host, {
          items: propsNow.items,
          activeId: propsNow.active,
          onChange: (id) => props.onChange(id),
        });
        host.querySelector('[role="tablist"]')?.setAttribute('aria-label', propsNow.label);
        lastItems = JSON.stringify(propsNow.items);
        return;
      }
      host.querySelector('[role="tablist"]')?.setAttribute('aria-label', propsNow.label);
      const key = JSON.stringify(propsNow.items);
      if (key !== lastItems) {
        handle.update({ items: propsNow.items });
        lastItems = key;
      }
      handle.update({ activeId: propsNow.active });
    },
  );

  onCleanup(() => {
    handle?.dispose();
    handle = null;
  });

  return <div class="mc-tabs" ref={(element) => { host = element; }} />;
};

export const KitSearch = (props: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  onKeyDown?: (event: KeyboardEvent) => void;
}) => {
  let host: HTMLDivElement | undefined;
  let input: HTMLInputElement | null = null;
  let handle: ReturnType<typeof mountSearchField> | null = null;

  createEffect(
    () => ({ value: props.value, placeholder: props.placeholder, label: props.label }),
    (propsNow) => {
      if (!host) return;
      if (!handle) {
        handle = mountSearchField(host, {
          value: propsNow.value,
          onChange: (value) => props.onChange(value),
          placeholder: propsNow.placeholder,
          label: propsNow.label,
        });
        input = host.querySelector('input');
        input?.addEventListener('keydown', (event) => props.onKeyDown?.(event));
        input?.setAttribute('autocomplete', 'off');
        input?.setAttribute('spellcheck', 'false');
        return;
      }
      handle.update({
        value: propsNow.value,
        placeholder: propsNow.placeholder,
        label: propsNow.label,
      });
    },
  );

  onCleanup(() => {
    handle?.dispose();
    handle = null;
  });

  return <div class="mc-search-host" ref={(element) => { host = element; }} />;
};

export const KitBanner = (props: {
  tone: BannerTone;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}) => {
  let host: HTMLDivElement | undefined;
  let handle: ReturnType<typeof mountBanner> | null = null;

  createEffect(
    () => ({ tone: props.tone, title: props.title, body: props.body, action: props.action }),
    (propsNow) => {
      if (!host) return;
      if (!handle) {
        handle = mountBanner(host, propsNow);
        return;
      }
      handle.update(propsNow);
    },
  );

  onCleanup(() => {
    handle?.dispose();
    handle = null;
  });

  return <div ref={(element) => { host = element; }} />;
};

export const KitEmpty = (props: {
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  tone?: 'status' | 'alert';
}) => {
  let host: HTMLDivElement | undefined;
  let handle: ReturnType<typeof mountEmpty> | null = null;

  createEffect(
    () => ({ title: props.title, body: props.body, action: props.action }),
    (propsNow) => {
      if (!host) return;
      if (!handle) {
        handle = mountEmpty(host, propsNow);
        return;
      }
      handle.update(propsNow);
    },
  );

  onCleanup(() => {
    handle?.dispose();
    handle = null;
  });

  return (
    <div
      class="mc-state mc-state--center"
      role={props.tone === 'alert' ? 'alert' : 'status'}
      ref={(element) => { host = element; }}
    />
  );
};
