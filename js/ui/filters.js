import { isLate } from '../model/features.js';
import { today } from './dom.js';

export function matches(feature, filters, doc) {
  const q = (filters.q || '').trim().toLowerCase();
  if (q) {
    const hay = [feature.title, feature.description, feature.familyLabel, feature.devhubId].join(' ').toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filters.family && feature.family !== filters.family) return false;
  if (filters.stage && feature.stageId !== filters.stage) return false;
  if (filters.release && feature.releaseId !== filters.release) return false;
  if (filters.late) {
    const l = isLate(feature, today());
    if (!l.prodTest && !l.prodFinal) return false;
  }
  if (filters.stageSet && !filters.stageSet.includes(feature.stageId)) return false;
  return true;
}

export function visibleFeatures(doc, filters) {
  return doc.features.filter((f) => matches(f, filters, doc));
}

export function hasActiveFilter(filters) {
  return Boolean(filters.q || filters.family || filters.stage || filters.release || filters.late || filters.stageSet);
}
