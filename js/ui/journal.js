import { h, avatar, fmtDayFull, fmtTime, today } from './dom.js';

const TYPES = [
  { id: '', label: 'Tout' }, { id: 'move', label: 'Déplacements' }, { id: 'test', label: 'Tests' },
  { id: 'create', label: 'Créations' }, { id: 'update', label: 'Modifications' }, { id: 'status', label: 'Statuts' }, { id: 'delete', label: 'Suppressions' },
];

export function renderJournal(ctx, { featureId = null, limit = 300, compact = false } = {}) {
  const doc = ctx.doc;
  const type = compact ? '' : (ctx.journalType || '');
  let entries = [...doc.activity].reverse();
  if (featureId) entries = entries.filter((a) => a.featureId === featureId);
  if (type) entries = entries.filter((a) => a.type === type);
  entries = entries.slice(0, limit);
  const groups = new Map();
  for (const a of entries) {
    const day = a.at.slice(0, 10);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(a);
  }
  const t = today();
  return h('div', { class: 'journal' },
    compact ? null : h('div', { class: 'journal-filters' }, TYPES.map((x) => h('button', {
      type: 'button', class: 'toggle', 'aria-pressed': type === x.id ? 'true' : 'false', onClick: () => ctx.setJournalType(x.id),
    }, x.label))),
    entries.length ? [...groups.entries()].map(([day, list]) => [
      h('div', { class: 'act-day' }, day === t ? 'Aujourd’hui' : fmtDayFull(day)),
      h('div', { class: 'activity' }, list.map((a) => renderEntry(ctx, a, { featureId }))),
    ]) : h('div', { class: 'empty' }, h('b', {}, 'Journal vide'), 'Les actions de l’équipe apparaîtront ici.'));
}

function renderEntry(ctx, a, { featureId }) {
  const f = ctx.doc.features.find((x) => x.id === a.featureId);
  return h('div', { class: 'act' },
    avatar(a.by, 22),
    h('div', { class: 'act-text' },
      h('b', {}, a.by?.login || 'quelqu’un'), ' ', a.text,
      f && !featureId ? [' · ', h('button', { type: 'button', onClick: () => ctx.openFeature(f.id) }, 'ouvrir')] : null),
    h('span', { class: 'act-when' }, fmtTime(a.at)));
}
