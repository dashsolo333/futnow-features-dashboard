import { createStore } from './store.js';
import { CONFIG, DEV_MODE } from './config.js';
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
import { bulkMove, bulkUpdate, bulkDelete } from './model/bulk.js';
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
  selection: new Set(),
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
  get selection() { return ui.selection; },
  toggleSelect(id, on = !ui.selection.has(id)) { const s = new Set(ui.selection); if (on) s.add(id); else s.delete(id); ui.selection = s; renderMain(); },
  setSelection(ids) { ui.selection = new Set(ids); renderMain(); },
  clearSelection() { if (ui.selection.size) { ui.selection = new Set(); renderMain(); } },
  /** Déplace la sélection ; les features bloquées par la garde sont listées, avec option Forcer. */
  bulkMove(ids, stageId, force = false) {
    const stage = stageById(store.state.doc, stageId);
    let result = null;
    const ok = ctx.act(`a passé ${ids.length} features en ${stage.label}${force ? ' (forcé)' : ''}`, (d) => { result = bulkMove(d, ids, stageId, { ...ctx.meta(), force }); return result.doc; });
    if (!ok || !result) return;
    const n = result.moved.length; const b = result.blocked.length;
    if (b) {
      toast(`${n} déplacée${n > 1 ? 's' : ''} · ${b} bloquée${b > 1 ? 's' : ''} : ${result.blocked[0].reason}`, { kind: 'error', action: { label: `Forcer les ${b}`, onClick: () => ctx.bulkMove(result.blocked.map((x) => x.id), stageId, true) } });
    } else toast(`${n} feature${n > 1 ? 's' : ''} passée${n > 1 ? 's' : ''} en ${stage.label}`, { kind: 'ok' });
    ctx.clearSelection();
  },
  bulkUpdate(ids, patch, label) {
    if (ctx.act(`a modifié ${label} de ${ids.length} features`, (d) => bulkUpdate(d, ids, patch, ctx.meta()).doc)) { toast(`${ids.length} feature${ids.length > 1 ? 's' : ''} mise${ids.length > 1 ? 's' : ''} à jour`, { kind: 'ok' }); ctx.clearSelection(); }
  },
  bulkDelete(ids) {
    if (!confirm(`Supprimer ${ids.length} feature${ids.length > 1 ? 's' : ''} ? Les suppressions sont journalisées.`)) return;
    if (ctx.act(`a supprimé ${ids.length} features`, (d) => bulkDelete(d, ids, ctx.meta()).doc)) { toast(`${ids.length} feature${ids.length > 1 ? 's' : ''} supprimée${ids.length > 1 ? 's' : ''}`, { kind: 'ok' }); ctx.clearSelection(); }
  },
  canWrite: () => store.canWrite(),
  meta: () => ({ by: store.state.user ? { login: store.state.user.login, avatar: store.state.user.avatar } : { login: 'anonyme', avatar: '' }, at: new Date().toISOString() }),
  toast,
  rerender: () => render(),
  retry: () => store.retry(),
  setView(v) { ui.view = v; ui.featureId = null; ui.selection = new Set(); localStorage.setItem(CONFIG.viewKey, v); writeHash(); render(); },
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

function renderMainNow() {
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

// ---------- Rendu stable ----------
// La vue est reconstruite à chaque changement de données. Pour que ça reste
// invisible pour la personne qui tape :
//  1. un champ texte en cours de saisie (focus + modifié) garde son texte, son
//     curseur et son focus à travers le rendu, grâce à son data-key ;
//  2. aucun rendu pendant un clic (entre pointerdown et pointerup), sinon le
//     clic tombe sur un nœud remplacé et se perd ;
//  3. un rendu demandé pendant un rendu est rejoué après ;
//  4. la position de défilement est conservée.
const TEXT_TYPES = new Set(['text', 'search', 'url', 'email', 'number', 'date', 'password']);
const isTextField = (el) => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TEXT_TYPES.has(el.type)));
let pointerDown = false;
let rendering = false;
let queued = null;

document.addEventListener('input', (e) => { if (isTextField(e.target)) e.target.dataset.dirty = '1'; }, true);
document.addEventListener('pointerdown', () => { pointerDown = true; }, true);
document.addEventListener('pointerup', () => { pointerDown = false; if (queued) setTimeout(flushQueued, 0); }, true);
document.addEventListener('pointercancel', () => { pointerDown = false; if (queued) setTimeout(flushQueued, 0); }, true);

function flushQueued() { if (!queued || rendering || pointerDown) return; const next = queued; queued = null; next(); }

function snapshotFocus() {
  const el = document.activeElement;
  if (!isTextField(el) || !el.dataset.key) return null;
  return { key: el.dataset.key, dirty: el.dataset.dirty === '1', value: el.value, start: el.selectionStart, end: el.selectionEnd };
}
function restoreFocus(snap) {
  if (!snap) return;
  const el = document.querySelector(`[data-key="${snap.key.replace(/"/g, '\\"')}"]`);
  if (!el) return;
  if (snap.dirty) { el.value = snap.value; el.dataset.dirty = '1'; }
  el.focus({ preventScroll: true });
  try { if (snap.start !== null && snap.start !== undefined && el.setSelectionRange) el.setSelectionRange(snap.start, snap.end); } catch { /* type date */ }
}

function guarded(fn, weight) {
  const run = () => {
    if (rendering || pointerDown) { queued = queued && queued.weight > weight ? queued : Object.assign(() => run(), { weight }); return; }
    rendering = true;
    const snap = snapshotFocus();
    const y = window.scrollY;
    try { fn(); } finally {
      rendering = false;
      restoreFocus(snap);
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo({ top: y });
      if (queued) setTimeout(flushQueued, 0);
    }
  };
  return run;
}

const renderChrome = guarded(renderChromeNow, 1);
const renderMain = guarded(renderMainNow, 2);
const render = guarded(renderAll, 3);

function renderChromeNow() {
  const top = clear($('topbar'));
  top.append(renderHeader(ctx));
  const banner = clear($('banner'));
  const b = renderBanner(ctx);
  if (b) banner.append(b);
  measureChrome();
}

function renderAll() {
  renderChromeNow();
  renderMainNow();
  renderLayer();
  measureChrome();
}

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (e.key === 'Escape') { if (ui.modal) ctx.closeModal(); else if (ui.featureId && !typing) ctx.closeFeature(); else if (ui.selection.size) ctx.clearSelection(); return; }
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
store.subscribe((s, kind) => {
  if (s.status === 'error' && lastStatus !== 'error' && s.error) toast(s.error, { kind: 'error' });
  if (s.status === 'conflict' && lastStatus !== 'conflict') toast('Conflit avec une modification distante. Recharge pour voir la version à jour.', { kind: 'error', action: { label: 'Recharger', onClick: () => location.reload() } });
  lastStatus = s.status;
  if (kind === 'doc') render(); else renderChrome();
});
render();
new ResizeObserver(() => measureChrome()).observe($('topbar'));
if (DEV_MODE) window.__store = store;
store.boot();
