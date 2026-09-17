import { h, icon } from './dom.js';
import { emojiPicker } from './emoji.js';
import { FAMILIES, PRIORITIES, newId } from '../model/doc.js';
import { createFeature } from '../model/features.js';

/** Fiche vierge : une feature créée à la main, au stade idée. */
export function renderCreate(ctx) {
  let title; let family; let priority; let iconValue = ''; let desc; let stage;
  const submit = (e) => {
    e.preventDefault();
    const id = newId('f');
    const fam = FAMILIES.find((f) => f.id === family.value);
    const ok = ctx.act(`a créé « ${title.value.trim()} »`, (d) => createFeature(d, {
      id, title: title.value, description: desc.value.trim(), icon: iconValue, family: fam.id, familyLabel: fam.label,
      priority: priority.value, stageId: stage.value, ...ctx.meta(),
    }));
    if (ok) { ctx.closeModal(); ctx.openFeature(id); }
  };
  return h('div', { class: 'overlay', onClick: (e) => { if (e.target === e.currentTarget) ctx.closeModal(); } },
    h('form', { class: 'modal glass', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'create-title', onSubmit: submit },
      h('div', { class: 'modal-head' }, h('h2', { id: 'create-title' }, 'Nouvelle feature'), h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fermer', onClick: ctx.closeModal }, icon('close'))),
      h('p', { class: 'hint', style: { marginBottom: '16px' } }, 'Une fiche vierge, au stade idée par défaut. Tu pourras tout compléter ensuite : dates, version, liens, tests.'),
      h('div', { style: { display: 'grid', gridTemplateColumns: '64px 1fr', gap: '12px' } },
        h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Icône'), emojiPicker({ value: iconValue, size: 'md', onPick: (v) => { iconValue = v; } })),
        h('div', { class: 'field' }, h('label', { for: 'c-title' }, 'Titre'), title = h('input', { id: 'c-title', class: 'input', required: true, placeholder: 'Ex. Mode Sonar, Pronos, Maillot NOLT…', autofocus: true }))),
      h('div', { class: 'modal-grid', style: { marginTop: '12px' } },
        h('div', { class: 'field' }, h('label', { for: 'c-family' }, 'Famille'), family = h('select', { id: 'c-family', class: 'select' }, FAMILIES.map((f) => h('option', { value: f.id, selected: f.id === 'other' }, f.label)))),
        h('div', { class: 'field' }, h('label', { for: 'c-priority' }, 'Priorité'), priority = h('select', { id: 'c-priority', class: 'select' }, PRIORITIES.map((p) => h('option', { value: p.id, selected: p.id === 'p2' }, p.label)))),
        h('div', { class: 'field' }, h('label', { for: 'c-stage' }, 'Étape de départ'), stage = h('select', { id: 'c-stage', class: 'select' }, ctx.doc.stages.filter((s) => s.id !== ctx.doc.gates.finalStageId).map((s) => h('option', { value: s.id }, s.label))))),
      h('div', { class: 'field', style: { marginTop: '12px' } }, h('label', { for: 'c-desc' }, 'Description'), desc = h('textarea', { id: 'c-desc', class: 'textarea', placeholder: 'Une phrase suffit pour commencer.' })),
      h('div', { class: 'modal-actions' },
        h('button', { type: 'button', class: 'btn', onClick: ctx.closeModal }, 'Annuler'),
        h('button', { type: 'submit', class: 'btn btn-cta' }, icon('plus'), 'Créer la fiche'))));
}
