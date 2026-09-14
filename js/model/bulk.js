// Actions groupées sur une sélection de features (un seul commit).
import { moveFeature, updateFeature, deleteFeature, featureById } from './features.js';
import { canMoveTo } from './stages.js';

export function bulkMove(doc, ids, stageId, { by, at, force = false }) {
  let next = doc;
  const moved = [];
  const blocked = [];
  for (const id of ids) {
    const f = featureById(next, id);
    if (!f || f.stageId === stageId) continue;
    const gate = canMoveTo(next, f, stageId, { force });
    if (!gate.ok) { blocked.push({ id, title: f.title, reason: gate.reason }); continue; }
    next = moveFeature(next, id, stageId, { by, at, force });
    moved.push(id);
  }
  return { doc: next, moved, blocked };
}

export function bulkUpdate(doc, ids, patch, meta) {
  let next = doc;
  let updated = 0;
  for (const id of ids) {
    if (!featureById(next, id)) continue;
    next = updateFeature(next, id, patch, meta);
    updated += 1;
  }
  return { doc: next, updated };
}

export function bulkDelete(doc, ids, meta) {
  let next = doc;
  let deleted = 0;
  for (const id of ids) {
    if (!featureById(next, id)) continue;
    next = deleteFeature(next, id, meta);
    deleted += 1;
  }
  return { doc: next, deleted };
}
