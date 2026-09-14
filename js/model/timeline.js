// Frise d'une feature : le passé vient du journal (création, déplacements,
// tests), le futur des dates cibles pas encore atteintes.
import { isoDay } from './doc.js';

export function featureTimeline(doc, feature, today) {
  const past = doc.activity
    .filter((a) => a.featureId === feature.id && ['create', 'move', 'test'].includes(a.type))
    .map((a) => ({ kind: a.type, day: isoDay(a.at), at: a.at, text: a.text, by: a.by, future: false, late: false }));
  if (!past.some((e) => e.kind === 'create') && feature.createdAt) {
    past.unshift({ kind: 'create', day: isoDay(feature.createdAt), at: feature.createdAt, text: 'a créé la fiche', by: feature.createdBy, future: false, late: false });
  }
  const d = feature.dates || {};
  const planned = [
    ['prodTest', d.prodTestPlanned, d.prodTestActual, 'Prod test'],
    ['prodFinal', d.prodFinalPlanned, d.prodFinalActual, 'Prod final'],
  ].filter(([, plannedDay, actual]) => plannedDay && !actual)
    .map(([kind, day, , label]) => ({ kind, day, at: `${day}T00:00:00Z`, text: `${label} prévu`, by: null, future: day >= today, late: day < today }));
  return [...past, ...planned].sort((a, b) => a.at.localeCompare(b.at));
}
