import { h, clear } from './dom.js';

let host = null;
let timer = null;

export function toast(message, { kind = 'info', action, duration = 4200 } = {}) {
  if (!host) {
    host = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
    document.body.append(host);
  }
  clear(host);
  const el = h('div', { class: `toast toast-${kind}` },
    h('span', { class: 'toast-text' }, message),
    action ? h('button', { type: 'button', class: 'toast-action', onClick: () => { action.onClick(); clear(host); } }, action.label) : null);
  host.append(el);
  clearTimeout(timer);
  timer = setTimeout(() => clear(host), action ? duration * 2 : duration);
}
