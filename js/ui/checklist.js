// Checklist centrale d'une feature : groupes par étape, échéances, checklist type.
import { h, icon, avatar, fmtDay, today } from './dom.js';
import { newId } from '../model/doc.js';
import { addChecklistItem, toggleChecklistItem, removeChecklistItem, updateChecklistItem, checklistProgress } from '../model/features.js';
import { applyTemplate, groupItems } from '../model/checklist.js';
import { datePicker } from './featureParts.js';

export function renderChecklist(ctx, feature, ro) {
  const doc = ctx.doc;
  const { done, total } = checklistProgress(feature);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const groups = groupItems(doc, feature);
  const t = today();
  let input; let groupSel;
  const add = () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    if (ctx.act(`a ajouté une tâche à « ${feature.title} »`, (d) => addChecklistItem(d, feature.id, { id: newId('i'), text, group: groupSel.value, ...ctx.meta() }))) { input.value = ''; input.focus(); }
  };
  const groupOptions = [{ id: '', label: 'Sans étape' }, ...doc.stages.map((s) => ({ id: s.id, label: s.label }))];

  return h('section', { class: 'panel glass checklist-panel' },
    h('div', { class: 'checklist-head' },
      h('div', {},
        h('h2', { class: 'checklist-title' }, 'Checklist'),
        h('p', { class: 'hint' }, total ? `${done} fait${done > 1 ? 's' : ''} sur ${total} · ${pct} %` : 'Ce qu’il reste à faire pour livrer, étape par étape.')),
      h('div', { class: 'checklist-progress' },
        h('span', { class: 'checklist-pct' }, `${pct}`, h('span', {}, '%')),
        h('div', { class: 'bar' , style: { '--bar': pct === 100 && total ? '#b5f03a' : '#4f8cff' } }, h('i', { style: { width: `${pct}%` } })))),

    groups.length ? h('div', { class: 'check-groups' }, groups.map((g) => h('section', { class: 'check-group', style: { '--gc': g.color } },
      h('header', { class: 'check-group-head' },
        h('span', { class: 'check-group-dot' }),
        h('h3', {}, g.label),
        h('span', { class: 'check-group-count' }, `${g.done}/${g.items.length}`)),
      h('ul', { class: 'checklist' }, g.items.map((it) => renderItem(ctx, feature, it, { ro, t, groupOptions })))))) : null,

    ro ? null : h('div', { class: 'check-add' },
      h('span', { class: 'check-box is-ghost', 'aria-hidden': 'true' }),
      input = h('input', { class: 'input check-add-input', placeholder: 'Nouvelle tâche… puis Entrée', 'aria-label': 'Nouvelle tâche', onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } } }),
      groupSel = h('select', { class: 'select select-pill-sm', 'aria-label': 'Étape de la tâche' }, groupOptions.map((o) => h('option', { value: o.id, selected: o.id === feature.stageId }, o.label))),
      h('button', { type: 'button', class: 'btn btn-cta btn-sm', onClick: add }, icon('plus'), 'Ajouter')),
    ro || total >= 13 ? null : h('div', { style: { marginTop: '10px' } },
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => ctx.act(`a ajouté la checklist type à « ${feature.title} »`, (d) => applyTemplate(d, feature.id, ctx.meta())) }, icon('check'), 'Insérer la checklist type (spec → stores)')));
}

function renderItem(ctx, feature, it, { ro, t, groupOptions }) {
  const meta = () => ctx.meta();
  const late = it.due && !it.done && it.due < t;
  let textEl;
  const save = () => {
    const v = textEl.value.trim();
    if (v && v !== it.text) ctx.act(`a modifié une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { text: v }, meta()));
    else textEl.value = it.text;
  };
  return h('li', { class: `check-item${it.done ? ' is-done' : ''}${late ? ' is-late' : ''}` },
    h('button', { type: 'button', class: 'check-box', role: 'checkbox', 'aria-checked': it.done ? 'true' : 'false', disabled: ro, 'aria-label': it.text,
      onClick: () => ctx.act(`a coché une tâche de « ${feature.title} »`, (d) => toggleChecklistItem(d, feature.id, it.id, meta())) }, it.done ? icon('check') : null),
    textEl = h('input', { class: 'check-text', value: it.text, disabled: ro, 'aria-label': 'Texte de la tâche', onChange: save, onKeydown: (e) => { if (e.key === 'Enter') e.currentTarget.blur(); } }),
    h('div', { class: 'check-meta' },
      it.done
        ? h('span', { class: 'check-done' }, avatar(it.doneBy, 18), `${it.doneBy?.login || ''} · ${fmtDay(it.doneAt)}`)
        : h('span', { class: `check-due${late ? ' is-late' : ''}` },
          ro ? (it.due ? `échéance ${fmtDay(it.due)}` : null)
            : datePicker(it.due, (v) => ctx.act(`a daté une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { due: v }, meta())), { placeholder: 'échéance' }),
          late ? h('span', { class: 'badge badge-late' }, 'dépassée') : null),
      ro ? null : h('select', { class: 'select select-pill-sm check-group-sel', 'aria-label': 'Étape', onChange: (e) => ctx.act(`a déplacé une tâche de « ${feature.title} »`, (d) => updateChecklistItem(d, feature.id, it.id, { group: e.target.value }, meta())) },
        groupOptions.map((o) => h('option', { value: o.id, selected: o.id === (it.group || '') }, o.label))),
      ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => ctx.act(`a retiré une tâche de « ${feature.title} »`, (d) => removeChecklistItem(d, feature.id, it.id, meta())) }, icon('close'))));
}
