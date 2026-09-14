// Checklist centrale d'une feature : synthèse, groupes par étape, statut et note par tâche.
import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { newId } from '../model/doc.js';
import { addChecklistItem, removeChecklistItem, updateChecklistItem, setChecklistStatus } from '../model/features.js';
import { applyTemplate, groupItems, checklistStats, STATUSES } from '../model/checklist.js';
import { milestoneStatus } from '../model/milestones.js';
import { datePicker } from './featureParts.js';

const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

export function renderChecklist(ctx, feature, ro) {
  const doc = ctx.doc;
  const t = today();
  const st = checklistStats(feature, t);
  const groups = groupItems(doc, feature);
  let input; let groupSel;
  const add = () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    input.value = ''; delete input.dataset.dirty;
    if (!ctx.act(`a ajouté une tâche à « ${feature.title} »`, (d) => addChecklistItem(d, feature.id, { id: newId('i'), text, group: groupSel.value, ...ctx.meta() }))) input.value = text;
    input.focus();
  };
  const groupOptions = [{ id: '', label: 'Sans étape' }, ...doc.stages.map((s) => ({ id: s.id, label: s.label }))];

  return h('section', { class: 'panel glass checklist-panel' },
    h('div', { class: 'checklist-head' },
      h('div', {},
        h('h2', { class: 'checklist-title' }, 'Checklist'),
        h('p', { class: 'checklist-sub' }, st.total ? `${st.done} faite${st.done > 1 ? 's' : ''} sur ${st.total}${st.total - st.done ? ` · ${st.total - st.done} restante${st.total - st.done > 1 ? 's' : ''}` : ' · tout est fait'}` : 'Ce qu’il reste à faire pour livrer, étape par étape.')),
      h('div', { class: 'checklist-progress' },
        h('span', { class: 'checklist-pct' }, `${st.pct}`, h('span', {}, '%')),
        h('div', { class: 'bar bar-stacked' },
          h('i', { class: 'seg seg-done', style: { width: `${st.total ? (st.done / st.total) * 100 : 0}%` }, title: `${st.done} faites` }),
          h('i', { class: 'seg seg-doing', style: { width: `${st.total ? (st.doing / st.total) * 100 : 0}%` }, title: `${st.doing} en cours` }),
          h('i', { class: 'seg seg-blocked', style: { width: `${st.total ? (st.blocked / st.total) * 100 : 0}%` }, title: `${st.blocked} bloquées` })))),

    st.total ? h('div', { class: 'check-stats' },
      stat('Faites', st.done, '#b5f03a'),
      stat('En cours', st.doing, '#4f8cff'),
      stat('Bloquées', st.blocked, '#f87171', st.blocked > 0),
      stat('À faire', st.todo, '#8b97ad'),
      stat('En retard', st.late, '#f87171', st.late > 0),
      h('div', { class: 'check-stat check-stat-wide' },
        h('span', { class: 'check-stat-label' }, 'Prochaine échéance'),
        st.nextDue ? h('b', {}, `${fmtDay(st.nextDue.due)} · ${milestoneStatus({ planned: st.nextDue.due, actual: '' }, t).label}`, h('span', { class: 'muted' }, ` — ${st.nextDue.text}`)) : h('b', { class: 'dim' }, 'aucune')),
      h('div', { class: 'check-stat check-stat-wide' },
        h('span', { class: 'check-stat-label' }, 'Dernière tâche faite'),
        st.lastDone ? h('b', {}, avatar(st.lastDone.doneBy, 18), ` ${st.lastDone.doneBy?.login || ''} · ${relTime(st.lastDone.doneAt)}`, h('span', { class: 'muted' }, ` — ${st.lastDone.text}`)) : h('b', { class: 'dim' }, 'aucune'))) : null,

    groups.length ? h('div', { class: 'check-groups' }, groups.map((g) => h('section', { class: 'check-group', style: { '--gc': g.color } },
      h('header', { class: 'check-group-head' },
        h('span', { class: 'check-group-dot' }),
        h('h3', {}, g.label),
        h('span', { class: 'check-group-meta' },
          g.doing ? h('span', { class: 'badge badge-doing' }, `${g.doing} en cours`) : null,
          g.blocked ? h('span', { class: 'badge badge-ko' }, `${g.blocked} bloquée${g.blocked > 1 ? 's' : ''}`) : null,
          h('span', { class: 'check-group-count' }, `${g.done}/${g.items.length}`)),
        h('div', { class: 'bar check-group-bar' }, h('i', { style: { width: `${g.pct}%`, background: g.color } }))),
      h('ul', { class: 'checklist' }, g.items.map((it) => renderItem(ctx, feature, it, { ro, t, groupOptions })))))) : null,

    ro ? null : h('div', { class: 'check-add' },
      h('span', { class: 'check-box is-ghost', 'aria-hidden': 'true' }),
      input = h('input', { class: 'input check-add-input', placeholder: 'Nouvelle tâche… puis Entrée', 'aria-label': 'Nouvelle tâche', dataset: { key: `add:${feature.id}` }, onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } } }),
      groupSel = h('select', { class: 'select select-pill-sm', 'aria-label': 'Étape de la tâche' }, groupOptions.map((o) => h('option', { value: o.id, selected: o.id === feature.stageId }, o.label))),
      h('button', { type: 'button', class: 'btn btn-cta btn-sm', onClick: add }, icon('plus'), 'Ajouter')),
    ro || st.total >= 13 ? null : h('div', { style: { marginTop: '10px' } },
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => ctx.act(`a ajouté la checklist type à « ${feature.title} »`, (d) => applyTemplate(d, feature.id, ctx.meta())) }, icon('check'), 'Insérer la checklist type (spec → stores)')));
}

function stat(label, value, color, alert = false) {
  return h('div', { class: `check-stat${alert ? ' is-alert' : ''}`, style: { '--sc': color } },
    h('span', { class: 'check-stat-label' }, h('i', { class: 'check-stat-dot' }), label),
    h('b', { class: 'check-stat-value' }, value));
}

function renderItem(ctx, feature, it, { ro, t, groupOptions }) {
  const meta = () => ctx.meta();
  const late = it.due && it.status !== 'done' && it.due < t;
  const status = statusOf(it.status);
  let textEl; let noteEl; let noteOpen = Boolean(it.note);
  const saveText = () => {
    const v = textEl.value.trim();
    if (v && v !== it.text) ctx.act(`a modifié une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { text: v }, meta()));
    else textEl.value = it.text;
  };
  const setStatus = (s) => ctx.act(`a mis à jour une tâche de « ${feature.title} »`, (d) => setChecklistStatus(d, feature.id, it.id, s, meta()));
  const noteBox = h('div', { class: 'check-note', hidden: !noteOpen },
    noteEl = h('textarea', { class: 'textarea check-note-input', placeholder: 'Note : contexte, blocage, lien…', disabled: ro, rows: 2, dataset: { key: `note:${it.id}` },
      onChange: (e) => ctx.act(`a annoté une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { note: e.target.value.trim() }, meta())) }, it.note || ''));

  return h('li', { class: `check-item is-${it.status}${late ? ' is-late' : ''}` },
    h('button', { type: 'button', class: 'check-box', role: 'checkbox', 'aria-checked': it.status === 'done' ? 'true' : 'false', disabled: ro, 'aria-label': it.text,
      onClick: () => setStatus(it.status === 'done' ? 'todo' : 'done') }, it.status === 'done' ? icon('check') : null),
    h('div', { class: 'check-main' },
      textEl = h('input', { class: 'check-text', value: it.text, disabled: ro, 'aria-label': 'Texte de la tâche', dataset: { key: `text:${it.id}` }, onChange: saveText, onKeydown: (e) => { if (e.key === 'Enter') e.currentTarget.blur(); } }),
      h('div', { class: 'check-sub' },
        it.status === 'done'
          ? h('span', { class: 'check-done' }, icon('check'), 'faite ', fmtDay(it.doneAt), it.doneBy ? [' par ', avatar(it.doneBy, 16), ` ${it.doneBy.login}`] : null)
          : [
            it.due ? h('span', { class: `check-due-label${late ? ' is-late' : ''}` }, icon('flag'), `${fmtDay(it.due)} · ${milestoneStatus({ planned: it.due, actual: '' }, t).label}`) : null,
            it.status === 'blocked' ? h('span', { class: 'check-blocked' }, icon('warn'), 'bloquée', it.note ? '' : ' — ajoute une note pour dire pourquoi') : null,
          ],
        it.createdBy && it.status !== 'done' ? h('span', { class: 'dim' }, `ajoutée ${relTime(it.createdAt)} par ${it.createdBy.login}`) : null),
      noteBox),
    h('div', { class: 'check-meta' },
      ro ? h('span', { class: 'chip chip-status', style: { '--dot': status.color } }, h('i', { class: 'chip-dot' }), status.label)
        : h('select', { class: 'select select-pill-sm check-status', style: { '--dot': status.color }, 'aria-label': 'Statut', onChange: (e) => setStatus(e.target.value) },
          STATUSES.map((s) => h('option', { value: s.id, selected: s.id === it.status }, s.label))),
      it.status !== 'done' && !ro ? datePicker(it.due, (v) => ctx.act(`a daté une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { due: v }, meta())), { placeholder: 'échéance' }) : null,
      ro ? null : h('select', { class: 'select select-pill-sm check-group-sel', 'aria-label': 'Étape', onChange: (e) => ctx.act(`a déplacé une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { group: e.target.value }, meta())) },
        groupOptions.map((o) => h('option', { value: o.id, selected: o.id === (it.group || '') }, o.label))),
      ro ? null : h('button', { type: 'button', class: `btn btn-ghost btn-sm btn-icon${it.note ? ' has-note' : ''}`, title: it.note ? 'Modifier la note' : 'Ajouter une note', 'aria-label': 'Note', onClick: () => { noteOpen = !noteOpen; noteBox.hidden = !noteOpen; if (noteOpen) noteEl.focus(); } }, icon('note')),
      ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => { if (confirm(`Retirer la tâche « ${it.text} » ?`)) ctx.act(`a retiré une tâche de « ${feature.title} »`, (d) => removeChecklistItem(d, feature.id, it.id, meta())); } }, icon('close'))));
}
