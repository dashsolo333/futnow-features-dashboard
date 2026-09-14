import { h, icon, avatar, fmtDay } from './dom.js';
import { CONFIG } from '../config.js';
import { renameStage, recolorStage, addStage, removeStage, moveStage, setGate } from '../model/stages.js';
import { newId } from '../model/doc.js';

const TABS = [{ id: 'account', label: 'Compte' }, { id: 'pipeline', label: 'Pipeline' }, { id: 'releases', label: 'Versions' }];

export function renderSettings(ctx) {
  const tab = ctx.settingsTab || 'account';
  return h('div', { class: 'overlay', onClick: (e) => { if (e.target === e.currentTarget) ctx.closeModal(); } },
    h('div', { class: 'modal modal-wide glass', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'settings-title' },
      h('div', { class: 'modal-head' },
        h('h2', { id: 'settings-title' }, 'Réglages'),
        h('nav', { class: 'tabs' }, TABS.map((t) => h('button', { type: 'button', class: 'tab', 'aria-selected': tab === t.id ? 'true' : 'false', onClick: () => ctx.openSettings(t.id) }, t.label))),
        h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fermer', onClick: ctx.closeModal }, icon('close'))),
      tab === 'account' ? renderAccount(ctx) : tab === 'pipeline' ? renderPipeline(ctx) : renderReleasesSettings(ctx)));
}

function renderAccount(ctx) {
  const { state } = ctx.store;
  let input;
  const tokenUrl = `https://github.com/settings/personal-access-tokens/new`;
  return h('div', { style: { display: 'grid', gap: '16px' } },
    state.user ? h('div', { class: 'user-card' }, avatar(state.user, 40),
      h('div', { style: { flex: 1 } }, h('b', {}, state.user.name), h('div', { class: 'muted' }, `@${state.user.login} · ${state.user.canWrite ? 'peut écrire' : 'lecture seule sur ce dépôt'}`)),
      h('button', { type: 'button', class: 'btn btn-sm', onClick: async () => { await ctx.store.setToken(''); ctx.rerender(); } }, 'Se déconnecter')) : null,
    h('div', { class: 'field' },
      h('label', { for: 'token' }, state.user ? 'Remplacer le token' : 'Token GitHub personnel'),
      h('div', { style: { display: 'flex', gap: '8px' } },
        input = h('input', { id: 'token', class: 'input', type: 'password', placeholder: 'github_pat_…', autocomplete: 'off', spellcheck: false }),
        h('button', { type: 'button', class: 'btn btn-cta', onClick: async () => {
          try { const u = await ctx.store.setToken(input.value); ctx.toast(u.canWrite ? `Connecté : ${u.login}` : `${u.login} connecté, mais sans droit d’écriture`, { kind: u.canWrite ? 'ok' : 'error' }); ctx.rerender(); }
          catch (e) { ctx.toast(`Token refusé : ${e.message}`, { kind: 'error' }); }
        } }, 'Vérifier'))),
    h('div', { class: 'hint' },
      h('p', {}, 'Le token reste dans ce navigateur (localStorage) et sert uniquement à écrire ', h('code', {}, CONFIG.dataPath), ' dans ', h('code', {}, `${CONFIG.owner}/${CONFIG.repo}`), '. Chaque modification devient un commit à ton nom.'),
      h('p', { style: { marginTop: '8px' } }, 'Créer un token fine-grained : ', h('a', { href: tokenUrl, target: '_blank', rel: 'noopener noreferrer' }, 'github.com/settings/personal-access-tokens'),
        ' → Repository access : ', h('code', {}, CONFIG.repo), ' → Permissions → Contents : ', h('b', {}, 'Read and write'), '. Il faut être collaborateur du dépôt.')));
}

function renderPipeline(ctx) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const act = (label, op) => ctx.act(label, op);
  const gateSel = (gate, label) => h('div', { class: 'field' }, h('label', {}, label),
    h('select', { class: 'select', disabled: ro, onChange: (e) => act(`a changé la garde ${label}`, (d) => setGate(d, gate, e.target.value)) },
      doc.stages.map((s) => h('option', { value: s.id, selected: doc.gates[gate] === s.id }, s.label))));
  return h('div', { style: { display: 'grid', gap: '16px' } },
    h('p', { class: 'hint' }, 'Les étapes sont libres : renomme, recolore, réordonne, ajoute. La jauge d’une feature suit sa position dans ce pipeline. Deux étapes portent une garde : l’entrée en « prod test » date le test, l’entrée en « prod final » exige un dernier test OK.'),
    h('div', { class: 'settings-list' }, doc.stages.map((s, i) => h('div', { class: 'settings-row' },
      h('input', { type: 'color', value: s.color, disabled: ro, 'aria-label': 'Couleur', onChange: (e) => act(`a recoloré l’étape ${s.label}`, (d) => recolorStage(d, s.id, e.target.value)) }),
      h('div', {}, h('input', { class: 'input', value: s.label, disabled: ro, 'aria-label': 'Nom de l’étape', onChange: (e) => { if (e.target.value.trim()) act(`a renommé l’étape ${s.label} en ${e.target.value.trim()}`, (d) => renameStage(d, s.id, e.target.value.trim())); } }),
        s.id === doc.gates.testStageId ? h('span', { class: 'gate-tag' }, 'garde · prod test') : s.id === doc.gates.finalStageId ? h('span', { class: 'gate-tag' }, 'garde · prod final') : null),
      h('div', { class: 'row-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro || i === 0, 'aria-label': 'Monter', onClick: () => act(`a réordonné le pipeline`, (d) => moveStage(d, s.id, i - 1)) }, icon('up')),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro || i === doc.stages.length - 1, 'aria-label': 'Descendre', onClick: () => act(`a réordonné le pipeline`, (d) => moveStage(d, s.id, i + 1)) }, icon('down')),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro, 'aria-label': 'Supprimer', onClick: () => { if (confirm(`Supprimer l’étape ${s.label} ? Ses features reculent d’une étape.`)) act(`a supprimé l’étape ${s.label}`, (d) => removeStage(d, s.id)); } }, icon('trash')))))),
    ro ? null : h('button', { type: 'button', class: 'btn', style: { justifySelf: 'start' }, onClick: () => { const label = prompt('Nom de la nouvelle étape'); if (label?.trim()) act(`a ajouté l’étape ${label.trim()}`, (d) => addStage(d, { label: label.trim() }, d.stages.length - 2)); } }, icon('plus'), 'Ajouter une étape'),
    h('div', { class: 'grid-2' }, gateSel('testStageId', 'Étape « prod test »'), gateSel('finalStageId', 'Étape « prod final »')));
}

function renderReleasesSettings(ctx) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const save = (label, releases) => ctx.act(label, (d) => ({ ...d, releases }));
  const update = (id, patch, label) => save(label, doc.releases.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const releases = [...doc.releases].sort((a, b) => (a.plannedAt || '9999').localeCompare(b.plannedAt || '9999'));
  return h('div', { style: { display: 'grid', gap: '16px' } },
    h('p', { class: 'hint' }, 'Une version = un train de release (build TestFlight puis sortie store). Rattache les features depuis leur fiche.'),
    h('div', { class: 'settings-list' }, releases.length ? releases.map((r) => h('div', { class: 'settings-row', style: { gridTemplateColumns: '110px 1fr 150px 150px auto' } },
      h('input', { class: 'input', value: r.version, disabled: ro, 'aria-label': 'Version', onChange: (e) => update(r.id, { version: e.target.value.trim() }, `a renommé la version ${r.version}`) }),
      h('input', { class: 'input', value: r.name || '', placeholder: 'Nom (optionnel)', disabled: ro, 'aria-label': 'Nom', onChange: (e) => update(r.id, { name: e.target.value.trim() }, `a renommé la version ${r.version}`) }),
      h('input', { class: 'input', type: 'date', value: r.plannedAt || '', disabled: ro, 'aria-label': 'Date prévue', title: 'Date prévue', onChange: (e) => update(r.id, { plannedAt: e.target.value }, `a planifié la version ${r.version} au ${fmtDay(e.target.value)}`) }),
      h('input', { class: 'input', type: 'date', value: r.releasedAt || '', disabled: ro, 'aria-label': 'Date de sortie', title: 'Date de sortie réelle', onChange: (e) => update(r.id, { releasedAt: e.target.value }, `a marqué la version ${r.version} sortie`) }),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', disabled: ro, 'aria-label': 'Supprimer', onClick: () => { if (confirm(`Supprimer la version ${r.version} ?`)) save(`a supprimé la version ${r.version}`, doc.releases.filter((x) => x.id !== r.id)); } }, icon('trash'))))
      : h('div', { class: 'dim' }, 'Aucune version. Crée la première (ex. 1.7.0).')),
    ro ? null : h('button', { type: 'button', class: 'btn', style: { justifySelf: 'start' }, onClick: () => {
      const version = prompt('Numéro de version (ex. 1.7.0)');
      if (!version?.trim()) return;
      const plannedAt = prompt('Date de sortie prévue (AAAA-MM-JJ)', '') || '';
      save(`a créé la version ${version.trim()}`, [...doc.releases, { id: newId('r'), version: version.trim(), name: '', plannedAt, releasedAt: '' }]);
    } }, icon('plus'), 'Nouvelle version'));
}
