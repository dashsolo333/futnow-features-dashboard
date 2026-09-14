// Store : état + file d'opérations optimistes synchronisée avec GitHub.
// Une opération est une fonction pure (doc) => doc ; on l'applique tout de
// suite localement, puis on pousse. En cas de conflit de sha on recharge et
// on rejoue les opérations en attente sur la version distante.
import { CONFIG } from './config.js';
import { loadDoc, saveDoc, isConflict, whoAmI } from './github.js';
import { normalizeDoc } from './model/doc.js';
import { replayOps, stripMeta } from './model/merge.js';

const MAX_RETRIES = 3;

export function createStore() {
  const listeners = new Set();
  const state = {
    doc: null, sha: '', etag: '',
    token: readLocal(CONFIG.tokenKey, ''),
    user: readJson(CONFIG.userKey, null),
    status: 'loading', // loading | ready | saving | offline | error | conflict
    error: '',
    pending: [], // { op, label }
    lastSync: '',
  };
  let saveTimer = null;
  let pollTimer = null;

  const emit = () => listeners.forEach((l) => l(state));
  const set = (patch) => { Object.assign(state, patch); emit(); };

  async function boot() {
    try {
      const r = await loadDoc({ token: state.token });
      set({ doc: normalizeDoc(r.doc), sha: r.sha, etag: r.etag, status: 'ready', lastSync: new Date().toISOString() });
    } catch (e) {
      set({ status: 'error', error: `Chargement impossible : ${e.message}` });
    }
    if (state.token && !state.user) refreshUser().catch(() => {});
    schedulePoll();
  }

  async function refreshUser() {
    const user = await whoAmI(state.token);
    writeJson(CONFIG.userKey, user);
    set({ user });
    return user;
  }

  async function setToken(token) {
    const clean = String(token || '').trim();
    if (!clean) {
      localStorage.removeItem(CONFIG.tokenKey);
      localStorage.removeItem(CONFIG.userKey);
      set({ token: '', user: null });
      return null;
    }
    localStorage.setItem(CONFIG.tokenKey, clean);
    state.token = clean;
    return refreshUser();
  }

  function canWrite() {
    return Boolean(state.token && state.user?.canWrite);
  }

  /** Applique une opération localement et planifie la sauvegarde. */
  function apply(op, label) {
    if (!state.doc) throw new Error('Document pas encore chargé');
    if (!canWrite()) throw new Error('Lecture seule : ajoute ton token GitHub (⚙︎) pour modifier.');
    const next = op(state.doc); // lève si invalide → rien n'est appliqué
    state.pending = [...state.pending, { op, label }];
    set({ doc: next, status: 'saving' });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, CONFIG.saveDebounceMs);
  }

  async function flush(attempt = 0) {
    if (!state.pending.length) return;
    const batch = state.pending;
    const message = commitMessage(batch, state.user);
    try {
      const { sha } = await saveDoc({ token: state.token, doc: stripMeta(state.doc), sha: state.sha, message });
      state.pending = state.pending.slice(batch.length);
      set({ sha, status: state.pending.length ? 'saving' : 'ready', error: '', lastSync: new Date().toISOString() });
      if (state.pending.length) flush();
    } catch (e) {
      if (isConflict(e) && attempt < MAX_RETRIES) {
        await rebaseOnRemote();
        return flush(attempt + 1);
      }
      set({ status: isConflict(e) ? 'conflict' : 'error', error: e.message });
    }
  }

  async function rebaseOnRemote() {
    const r = await loadDoc({ token: state.token });
    const merged = replayOps(normalizeDoc(r.doc), state.pending.map((p) => p.op));
    set({ doc: merged, sha: r.sha, etag: r.etag });
  }

  async function poll() {
    if (state.pending.length || document.hidden || !state.doc) return schedulePoll();
    try {
      const r = await loadDoc({ token: state.token, etag: state.etag });
      if (!r.unchanged) set({ doc: normalizeDoc(r.doc), sha: r.sha, etag: r.etag, lastSync: new Date().toISOString(), status: 'ready', error: '' });
    } catch (e) {
      if (e.status === 403) set({ status: 'offline', error: 'Quota GitHub atteint, réessai plus tard.' });
    }
    schedulePoll();
  }

  function schedulePoll() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, CONFIG.pollMs);
  }

  function retry() {
    if (state.pending.length) flush();
    else boot();
  }

  return {
    get state() { return state; },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    boot, apply, setToken, refreshUser, canWrite, retry, reload: poll,
  };
}

function commitMessage(batch, user) {
  const first = batch[0]?.label || 'mise à jour';
  const more = batch.length > 1 ? ` (+${batch.length - 1})` : '';
  return `${user?.login || 'équipe'}: ${first}${more}`;
}

function readLocal(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
}
