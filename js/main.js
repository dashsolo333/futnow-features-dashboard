import { createStore } from './store.js';
import { CONFIG } from './config.js';
import { h, clear } from './ui/dom.js';
import { toast } from './ui/toast.js';
import { renderHeader, renderBanner, VIEWS } from './ui/header.js';
import { renderKpis } from './ui/kpis.js';
import { renderBoard } from './ui/board.js';
import { renderList } from './ui/list.js';
import { renderRoadmap } from './ui/roadmap.js';
import { renderReleases } from './ui/releases.js';
import { renderJournal } from './ui/journal.js';
import { renderFeaturePage } from './ui/featurePage.js';
import { renderFocus, focusList, toggleFullscreen } from './ui/focus.js';
import { renderCreate } from './ui/create.js';
import { renderSettings } from './ui/settings.js';
import { moveFeature, featureById } from './model/features.js';
import { stageById } from './model/stages.js';

const store = createStore();
const $ = (id) => document.getElementById(id);

const ui = {
  view: readHash().view || localStorage.getItem(CONFIG.viewKey) || 'board',
  filters: {},
  sort: null,
  journalType: '',
  featureId: readHash().feature || null,
  focusId: readHash().focus || null,
  backView: 'board',
  modal: null, // 'create' | 'settings'
  settingsTab: 'account',
};

const ctx = {
  store,
  get doc() { return store.state.doc; },
  get view() { return ui.view; },
  get featureId() { return ui.featureId; },
  get focusId() { return ui.focusId; },
  setFocus(id) { ui.focusId = id; writeHash(); renderMain(); },
  get filters() { return ui.filters; },
  get sort() { return ui.sort; },
  get journalType() { return ui.journalType; },
  get settingsTab() { return ui.settingsTab; },
  canWrite: () => store.canWrite(),
  meta: () => ({ by: store.state.user ? { login: store.state.user.login, avatar: store.state.user.avatar } : { login: 'anonyme', avatar: '' }, at: new Date().toISOString() }),
  toast,
  rerender: () => render(),
  retry: () => store.retry(),
  setView(v) { ui.view = v; ui.featureId = null; localStorage.setItem(CONFIG.viewKey, v); writeHash(); render(); },
  setFilter(patch, { silent = false } = {}) { ui.filters = { ...ui.filters, ...patch }; if (silent) renderMain(); else render(); },
  toggleKpi(key, filter) {
    ui.filters = ui.filters.kpi === key ? {} : { q: ui.filters.q, family: ui.filters.family, kpi: key, ...filter };
    render();
  },
  setSort(s) { ui.sort = s; renderMain(); },
  setJournalType(t) { ui.journalType = t; renderMain(); },
  openFeature(id) { ui.featureId = id; writeHash(); render(); window.scrollTo({ top: 0 }); },
  closeFeature() { ui.featureId = null; writeHash(); render(); },
  openCreate() { if (!guardWrite()) return; ui.modal = 'create'; renderLayer(); },
  openSettings(tab = 'account') { ui.modal = 'settings'; ui.settingsTab = tab; renderLayer(); },
  closeModal() { ui.modal = null; renderLayer(); },
  /** Applique une opération ; renvoie true si acceptée. */
  act(label, op) {
    try { store.apply(op, label); return true; }
    catch (e) { toast(e.message, { kind: 'error' }); return false; }
  },
  move(id, stageId, force = false) {
    const f = featureById(store.state.doc, id);
    if (!f || f.stageId === stageId) return;
    const stage = stageById(store.state.doc, stageId);
    try {
      store.apply((d) => moveFeature(d, id, stageId, { ...ctx.meta(), force }), `a passé « ${f.title} » en ${stage.label}${force ? ' (forcé)' : ''}`);
    } catch (e) {
      if (!ctx.canWrite()) return toast(e.message, { kind: 'error' });
      toast(e.message, { kind: 'error', action: { label: 'Forcer quand même', onClick: () => ctx.move(id, stageId, true) } });
    }
  },
};

function guardWrite() {
  if (ctx.canWrite()) return true;
  toast('Lecture seule : connecte ton token GitHub pour modifier.', { kind: 'error', action: { label: 'Se connecter', onClick: () => ctx.openSettings() } });
  return false;
}

function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return { view: VIEWS.some((v) => v.id === p.get('v')) ? p.get('v') : null, feature: p.get('f'), focus: p.get('a') };
}
function writeHash() {
  const p = new URLSearchParams();
  if (ui.view !== 'board') p.set('v', ui.view);
  if (ui.featureId) p.set('f', ui.featureId);
  if (ui.view === 'focus' && ui.focusId) p.set('a', ui.focusId);
  const next = p.toString() ? `#${p}` : '';
  if (location.hash !== next) history.replaceState(null, '', `${location.pathname}${next}`);
}

function renderMain() {
  const doc = store.state.doc;
  const view = clear($('view'));
  const kpis = clear($('kpis'));
  if (!doc) {
    const st = store.state.status;
    view.append(h('div', { class: 'empty' }, h('b', {}, st === 'error' ? 'Impossible de charger les données' : 'Chargement…'),
      st === 'error' ? [store.state.error, ' ', h('button', { type: 'button', class: 'btn btn-sm', style: { marginTop: '12px' }, onClick: ctx.retry }, 'Réessayer')] : 'Lecture du JSON depuis GitHub.'));
    return;
  }
  if (ui.featureId) {
    const f = featureById(doc, ui.featureId);
    if (f) { kpis.hidden = true; view.append(renderFeaturePage(ctx, f)); return; }
    ui.featureId = null;
    writeHash();
  }
  kpis.hidden = ui.view === 'focus';
  if (!kpis.hidden) kpis.append(...(renderKpis(ctx) || []));
  const renderers = { board: renderBoard, focus: renderFocus, list: renderList, roadmap: renderRoadmap, releases: renderReleases, journal: renderJournal };
  view.append((renderers[ui.view] || renderBoard)(ctx));
}

function renderLayer() {
  const layer = clear($('layer'));
  const doc = store.state.doc;
  if (ui.modal === 'create' && doc) layer.append(renderCreate(ctx));
  if (ui.modal === 'settings') layer.append(renderSettings(ctx));
  document.body.style.overflow = layer.childElementCount ? 'hidden' : '';
  const focus = layer.querySelector('[autofocus]');
  if (focus && ui.modal === 'create') focus.focus();
}

function measureChrome() {
  const px = $('topbar').offsetHeight + $('banner').offsetHeight;
  document.documentElement.style.setProperty('--chrome', `${px}px`);
}

function render() {
  const top = clear($('topbar'));
  top.append(renderHeader(ctx));
  const banner = clear($('banner'));
  const b = renderBanner(ctx);
  if (b) banner.append(b);
  renderMain();
  renderLayer();
  measureChrome();
}

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape') { if (ui.modal) ctx.closeModal(); else if (ui.featureId && !typing) ctx.closeFeature(); return; }
  if (typing) return;
  if (e.key === '/') { e.preventDefault(); $('search-input')?.focus(); }
  if (e.key === 'n') ctx.openCreate();
  if (/^[1-6]$/.test(e.key)) ctx.setView(VIEWS[Number(e.key) - 1].id);
  if (ui.view === 'focus' && !ui.featureId) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const list = focusList(ctx); if (!list.length) return;
      let i = list.findIndex((f) => f.id === ui.focusId); if (i < 0) i = 0;
      ctx.setFocus(list[(i + (e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length].id);
    }
    if (e.key === 'f') toggleFullscreen();
  }
});
window.addEventListener('hashchange', () => { const hsh = readHash(); if (hsh.view) ui.view = hsh.view; ui.featureId = hsh.feature; if (hsh.focus) ui.focusId = hsh.focus; render(); });
document.addEventListener('fullscreenchange', () => document.body.classList.toggle('is-fullscreen', Boolean(document.fullscreenElement)));
document.addEventListener('visibilitychange', () => { if (!document.hidden) store.reload(); });
window.addEventListener('beforeunload', (e) => { if (store.state.pending.length) { e.preventDefault(); e.returnValue = ''; } });

let lastStatus = '';
store.subscribe((s) => {
  if (s.status === 'error' && lastStatus !== 'error' && s.error) toast(s.error, { kind: 'error' });
  if (s.status === 'conflict' && lastStatus !== 'conflict') toast('Conflit avec une modification distante. Recharge pour voir la version à jour.', { kind: 'error', action: { label: 'Recharger', onClick: () => location.reload() } });
  lastStatus = s.status;
  render();
});
render();
new ResizeObserver(measureChrome).observe($('topbar'));
store.boot();
