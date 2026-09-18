// Constructeur d'éléments sans innerHTML : tout texte utilisateur passe par
// textContent, donc pas d'injection HTML possible.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') applyStyle(el, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k in el && typeof v !== 'string' && k !== 'value') el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
    if (k === 'value') el.value = v;
  }
  append(el, children);
  return el;
}

function applyStyle(el, style) {
  for (const [prop, val] of Object.entries(style)) {
    if (val === null || val === undefined) continue;
    if (prop.startsWith('--')) el.style.setProperty(prop, String(val));
    else el.style[prop] = val;
  }
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  el.replaceChildren();
  return el;
}

export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  append(el, children);
  return el;
}

const FR_DATE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const FR_DATE_FULL = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const FR_TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function fmtDay(day) {
  if (!day) return '—';
  return FR_DATE.format(new Date(`${day.slice(0, 10)}T12:00:00`));
}
export function fmtDayFull(day) {
  if (!day) return '—';
  return FR_DATE_FULL.format(new Date(`${day.slice(0, 10)}T12:00:00`));
}
export function fmtTime(iso) {
  return iso ? FR_TIME.format(new Date(iso)) : '';
}

export function relTime(iso, now = Date.now()) {
  if (!iso) return '';
  const diff = Math.round((now - new Date(iso).getTime()) / 1000);
  if (diff < 45) return 'à l’instant';
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)} h`;
  const days = Math.round(diff / 86400);
  if (days < 30) return `il y a ${days} j`;
  return fmtDay(iso);
}

export function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function avatar(user, size = 22) {
  if (!user) return h('span', { class: 'avatar avatar-empty', style: { width: `${size}px`, height: `${size}px` } });
  if (user.avatar) {
    return h('img', { class: 'avatar', src: user.avatar, alt: user.login, title: user.login, width: size, height: size, loading: 'lazy' });
  }
  return h('span', { class: 'avatar avatar-initial', title: user.login, style: { width: `${size}px`, height: `${size}px` } }, (user.login || '?')[0].toUpperCase());
}

export function icon(name) {
  const paths = {
    plus: 'M12 5v14M5 12h14',
    close: 'M6 6l12 12M18 6L6 18',
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
    check: 'M5 12l5 5L20 7',
    warn: 'M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
    link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
    refresh: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
    up: 'M12 19V5M5 12l7-7 7 7',
    down: 'M12 5v14M19 12l-7 7-7-7',
    flag: 'M4 22V4M4 4h12l-2 4 2 4H4',
    bug: 'M9 7a3 3 0 0 1 6 0M8 9h8v6a4 4 0 0 1-8 0zM12 13v6M8 12H4M20 12h-4M8 16l-3 2M16 16l3 2M8 9L5 7M16 9l3-2',
    expand: 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5',
    left: 'M15 18l-6-6 6-6',
    note: 'M4 4h16v12l-4 4H4zM8 9h8M8 13h5',
    right: 'M9 6l6 6-6 6',
    grip: 'M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01',
  };
  return svg('svg', { class: `ico ico-${name}`, viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' },
    svg('path', { d: paths[name] || '' }));
}
