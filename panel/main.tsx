import { render } from '@solidjs/web';
import { connectHost, type HostReadyContext } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { App } from './App';
import { setLocale } from './i18n';
import { createPanel } from './state/panel';
import panelCss from './styles/panel.css?inline';
import appCss from './styles/app.css?inline';

const host = connectHost();
const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('missing #root');

const style = document.createElement('style');
style.textContent = `${panelCss}\n${appCss}`;
document.head.append(style);

const panel = createPanel((request) => host.serviceRequest(request));

render(() => <App panel={panel} />, root);

host.onReady((ctx: HostReadyContext) => {
  applyHostReady(ctx, document.documentElement);
  setLocale(ctx.locale);
  panel.start({
    directory: ctx.directory,
    sessionId: ctx.session?.id ?? null,
  });
});

host.onSession((session) => {
  panel.setTarget({ sessionId: session?.id ?? null });
});

host.onDirectory((directory) => {
  panel.setTarget({ directory });
});

window.addEventListener('beforeunload', () => {
  panel.dispose();
  host.dispose();
});
