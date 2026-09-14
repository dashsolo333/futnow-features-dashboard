import { h, icon, avatar, relTime } from './dom.js';
import { FAMILIES } from '../model/doc.js';

export const VIEWS = [
  { id: 'board', label: 'Tableau' },
  { id: 'focus', label: 'Avancement' },
  { id: 'list', label: 'Liste' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'releases', label: 'Versions' },
  { id: 'journal', label: 'Journal' },
];

const STATUS_LABEL = {
  loading: 'Chargement…', ready: 'Synchronisé', saving: 'Enregistrement…',
  offline: 'Hors ligne', error: 'Erreur', conflict: 'Conflit',
};

export function renderHeader(ctx) {
  const { state } = ctx.store;
  const st = state.status;
  return h('div', { class: 'topbar-inner', style: { display: 'contents' } },
    h('div', { class: 'brand' },
      h('div', { class: 'brand-mark' }, 'F'),
      h('div', { class: 'brand-name' }, 'Futnow ', h('span', {}, '· Features'))),
    h('nav', { class: 'tabs', role: 'tablist', 'aria-label': 'Vues' },
      VIEWS.map((v) => h('button', {
        type: 'button', class: 'tab', role: 'tab', 'aria-selected': ctx.view === v.id && !ctx.featureId ? 'true' : 'false',
        onClick: () => ctx.setView(v.id),
      }, v.label, v.id === 'board' && ctx.doc ? h('span', { class: 'tab-count' }, ctx.doc.features.length) : null))),
    h('div', { class: 'topbar-right' },
      h('label', { class: 'search' },
        icon('search'),
        h('span', { class: 'sr-only' }, 'Rechercher'),
        h('input', { class: 'input', type: 'search', placeholder: 'Rechercher…', title: 'Raccourci : /', value: ctx.filters.q || '', id: 'search-input',
          onInput: (e) => ctx.setFilter({ q: e.target.value }, { silent: true }) })),
      h('select', { class: 'select select-pill', 'aria-label': 'Famille', onChange: (e) => ctx.setFilter({ family: e.target.value }) },
        h('option', { value: '' }, 'Familles'),
        FAMILIES.map((f) => h('option', { value: f.id, selected: ctx.filters.family === f.id }, f.label))),
      h('button', { type: 'button', class: 'btn btn-cta', onClick: ctx.openCreate, title: 'Nouvelle feature (n)' }, icon('plus'), 'Feature'),
      h('div', { class: 'sync', title: state.error || (state.lastSync ? `Dernière synchro ${relTime(state.lastSync)}` : '') },
        h('span', { class: `pulse is-${st}` }),
        STATUS_LABEL[st] || st,
        (st === 'error' || st === 'conflict' || st === 'offline') ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', title: 'Réessayer', onClick: ctx.retry }, icon('refresh')) : null),
      h('button', { type: 'button', class: 'sync-user', onClick: () => ctx.openSettings(), title: 'Compte & réglages' },
        state.user ? [avatar(state.user, 24), state.user.login] : [icon('gear'), 'Connexion'])));
}

export function renderBanner(ctx) {
  const { state } = ctx.store;
  if (!state.doc || ctx.canWrite()) return null;
  const text = state.user && !state.user.canWrite
    ? `${state.user.login} n’a pas les droits d’écriture sur ce dépôt. Demande à être ajouté comme collaborateur.`
    : 'Mode lecture. Ajoute ton token GitHub pour créer et déplacer des features.';
  return h('div', { class: 'readonly-bar' }, icon('warn'), h('span', {}, text),
    h('button', { type: 'button', onClick: () => ctx.openSettings() }, state.user ? 'Changer de compte' : 'Se connecter'));
}
