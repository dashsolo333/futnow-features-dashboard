// Checklist : groupes alignés sur le pipeline, checklist type.
import { addChecklistItem, isOpenBug } from './features.js';

export const DEFAULT_TEMPLATE = [
  { group: 'spec', text: 'Intention et périmètre écrits' },
  { group: 'spec', text: 'Arbitrages tranchés avec l’équipe' },
  { group: 'design', text: 'Maquette validée' },
  { group: 'design', text: 'États vides / erreur / chargement dessinés' },
  { group: 'dev', text: 'Implémentation terminée' },
  { group: 'dev', text: 'Tests unitaires verts' },
  { group: 'review', text: 'Review de code OK' },
  { group: 'review', text: 'Migration / RLS vérifiées si besoin' },
  { group: 'prodtest', text: 'Build de test distribué (TestFlight / interne)' },
  { group: 'prodtest', text: 'Testé sur iOS' },
  { group: 'prodtest', text: 'Testé sur Android' },
  { group: 'prod', text: 'Notes de version rédigées' },
  { group: 'prod', text: 'Publié sur les stores' },
];

export function applyTemplate(doc, featureId, { by, at }) {
  const feature = doc.features.find((f) => f.id === featureId);
  if (!feature) throw new Error('Feature introuvable');
  const existing = new Set(feature.items.map((i) => i.text.trim().toLowerCase()));
  let next = doc;
  let n = 0;
  for (const tpl of DEFAULT_TEMPLATE) {
    if (existing.has(tpl.text.toLowerCase())) continue;
    n += 1;
    next = addChecklistItem(next, featureId, { id: `i_${at}_${n}`, text: tpl.text, group: tpl.group, by, at, silent: true });
  }
  if (!n) return doc;
  const f2 = next.features.find((f) => f.id === featureId);
  return { ...next, activity: [...next.activity, { id: `a_${at}_${featureId}_template`, at, by, featureId, type: 'update', text: `a ajouté la checklist type (${n} tâches) à « ${f2.title} »` }] };
}

export const STATUSES = [
  { id: 'todo', label: 'À faire', color: '#8b97ad' },
  { id: 'doing', label: 'En cours', color: '#4f8cff' },
  { id: 'blocked', label: 'Bloquée', color: '#f87171' },
  { id: 'done', label: 'Faite', color: '#b5f03a' },
];

/** Synthèse d'avancement de la checklist. */
export function checklistStats(feature, today) {
  const items = feature.items || [];
  const count = (st) => items.filter((i) => i.status === st).length;
  const open = items.filter((i) => i.status !== 'done');
  const late = open.filter((i) => i.due && i.due < today);
  const upcoming = open.filter((i) => i.due && i.due >= today).sort((a, b) => a.due.localeCompare(b.due));
  const doneItems = items.filter((i) => i.status === 'done' && i.doneAt).sort((a, b) => String(b.doneAt).localeCompare(String(a.doneAt)));
  const done = count('done');
  return {
    total: items.length, done, doing: count('doing'), blocked: count('blocked'), todo: count('todo'), bugs: items.filter(isOpenBug).length,
    late: late.length, lateItems: late, pct: items.length ? Math.round((done / items.length) * 100) : 0,
    nextDue: upcoming[0] || null, lastDone: doneItems[0] || null,
  };
}

/** Regroupe les tâches par étape du pipeline, dans l'ordre du pipeline. */
export function groupItems(doc, feature) {
  const order = doc.stages.map((s) => s.id);
  const byGroup = new Map();
  for (const it of feature.items || []) {
    const g = order.includes(it.group) ? it.group : '';
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(it);
  }
  const groups = [...byGroup.entries()].sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : order.indexOf(a) - order.indexOf(b)));
  return groups.map(([id, items]) => {
    const stage = doc.stages.find((s) => s.id === id);
    const done = items.filter((i) => i.status === 'done').length;
    return {
      id, label: stage?.label || 'Autre', color: stage?.color || '#8b97ad', items, done,
      doing: items.filter((i) => i.status === 'doing').length,
      blocked: items.filter((i) => i.status === 'blocked').length,
      bugs: items.filter(isOpenBug).length,
      pct: items.length ? Math.round((done / items.length) * 100) : 0,
    };
  });
}
