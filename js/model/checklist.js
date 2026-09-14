// Checklist : groupes alignés sur le pipeline, checklist type.
import { addChecklistItem } from './features.js';

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
    return { id, label: stage?.label || 'Autre', color: stage?.color || '#8b97ad', items, done: items.filter((i) => i.done).length };
  });
}
