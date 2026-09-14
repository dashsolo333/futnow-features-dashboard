import { pushActivity, isoDay, normalizeFeature, PLATFORMS } from './doc.js';
import { canMoveTo, stageById, latestTest } from './stages.js';

const VERDICTS = ['ok', 'ko'];

export function featureById(doc, id) {
  return doc.features.find((f) => f.id === id) || null;
}

function requireFeature(doc, id) {
  const f = featureById(doc, id);
  if (!f) throw new Error(`Feature introuvable : ${id}`);
  return f;
}

function journal(doc, { type, featureId, text, by, at }) {
  return pushActivity(doc, { id: `a_${at}_${featureId}_${type}`, at, by, featureId, type, text });
}

function replaceFeature(doc, next) {
  return { ...doc, features: doc.features.map((f) => (f.id === next.id ? next : f)) };
}

export function createFeature(doc, { id, title, by, at, ...rest }) {
  const clean = String(title || '').trim();
  if (!clean) throw new Error('Le titre est obligatoire.');
  const feature = normalizeFeature({
    ...rest, id, title: clean, stageId: rest.stageId || doc.stages[0].id,
    createdAt: at, createdBy: by, updatedAt: at, updatedBy: by,
  });
  const next = { ...doc, features: [...doc.features, feature] };
  return journal(next, { type: 'create', featureId: id, text: `a créé « ${clean} »`, by, at });
}

export function updateFeature(doc, id, patch, { by, at }) {
  const f = requireFeature(doc, id);
  const next = normalizeFeature({ ...f, ...patch, dates: { ...f.dates, ...(patch.dates || {}) }, updatedAt: at, updatedBy: by });
  if (patch.title !== undefined && !String(patch.title).trim()) throw new Error('Le titre est obligatoire.');
  const changed = Object.keys(patch).filter((k) => JSON.stringify(f[k]) !== JSON.stringify(next[k]));
  const out = replaceFeature(doc, next);
  if (!changed.length) return out;
  return journal(out, { type: 'update', featureId: id, text: `a modifié ${changed.join(', ')} de « ${f.title} »`, by, at });
}

export function moveFeature(doc, id, stageId, { by, at, force = false }) {
  const f = requireFeature(doc, id);
  const target = stageById(doc, stageId);
  if (!target) throw new Error('Étape inconnue');
  if (f.stageId === stageId) return doc;
  const gate = canMoveTo(doc, f, stageId, { force });
  if (!gate.ok) throw new Error(gate.reason);
  const day = isoDay(at);
  const dates = { ...f.dates };
  if (stageId === doc.gates.testStageId && !dates.prodTestActual) dates.prodTestActual = day;
  if (stageId === doc.gates.finalStageId && !dates.prodFinalActual) dates.prodFinalActual = day;
  const next = { ...f, stageId, stepProgress: 0, dates, updatedAt: at, updatedBy: by };
  const forced = force && stageId === doc.gates.finalStageId && !canMoveTo(doc, f, stageId).ok;
  const text = `a passé « ${f.title} » en ${target.label}${forced ? ' (forcé, sans test OK)' : ''}`;
  return journal(replaceFeature(doc, next), { type: 'move', featureId: id, text, by, at });
}

export function addTestSession(doc, id, { id: testId, platform, verdict, notes = '', by, at, build = '' }) {
  const f = requireFeature(doc, id);
  if (!VERDICTS.includes(verdict)) throw new Error('Verdict invalide (ok / ko).');
  if (!PLATFORMS.some((p) => p.id === platform)) throw new Error('Plateforme invalide.');
  const session = { id: testId, at, by, platform, verdict, notes: String(notes || ''), build };
  const next = { ...f, tests: [...f.tests, session], updatedAt: at, updatedBy: by };
  const text = `a testé « ${f.title} » sur ${platform} : ${verdict.toUpperCase()}${notes ? ` — ${notes}` : ''}`;
  return journal(replaceFeature(doc, next), { type: 'test', featureId: id, text, by, at });
}

export function removeTestSession(doc, id, testId, { by, at }) {
  const f = requireFeature(doc, id);
  const next = { ...f, tests: f.tests.filter((t) => t.id !== testId), updatedAt: at, updatedBy: by };
  return replaceFeature(doc, next);
}

export function deleteFeature(doc, id, { by, at }) {
  const f = requireFeature(doc, id);
  const next = { ...doc, features: doc.features.filter((x) => x.id !== id) };
  return journal(next, { type: 'delete', featureId: id, text: `a supprimé « ${f.title} »`, by, at });
}

export const lastVerdict = latestTest;

/** Retard : date prévue dépassée sans date réelle. */
export function isLate(feature, today) {
  const d = feature.dates || {};
  const late = (planned, actual) => Boolean(planned) && !actual && planned < today;
  return {
    prodTest: late(d.prodTestPlanned, d.prodTestActual),
    prodFinal: late(d.prodFinalPlanned, d.prodFinalActual),
  };
}

/* ---------- checklist de tâches ---------- */

export function addChecklistItem(doc, id, { id: itemId, text, by, at }) {
  const f = requireFeature(doc, id);
  const clean = String(text || '').trim();
  if (!clean) throw new Error('Le texte de la tâche est obligatoire.');
  const next = { ...f, items: [...f.items, { id: itemId, text: clean, done: false }], updatedAt: at, updatedBy: by };
  return journal(replaceFeature(doc, next), { type: 'update', featureId: id, text: `a ajouté la tâche « ${clean} » à « ${f.title} »`, by, at });
}

export function toggleChecklistItem(doc, id, itemId, { by, at }) {
  const f = requireFeature(doc, id);
  const item = f.items.find((i) => i.id === itemId);
  if (!item) return doc;
  const items = f.items.map((i) => (i.id === itemId ? { ...i, done: !i.done, doneAt: i.done ? '' : at } : i));
  const next = { ...f, items, updatedAt: at, updatedBy: by };
  const text = `a ${item.done ? 'rouvert' : 'coché'} « ${item.text} » sur « ${f.title} »`;
  return journal(replaceFeature(doc, next), { type: 'update', featureId: id, text, by, at });
}

export function removeChecklistItem(doc, id, itemId, { by, at }) {
  const f = requireFeature(doc, id);
  const next = { ...f, items: f.items.filter((i) => i.id !== itemId), updatedAt: at, updatedBy: by };
  return replaceFeature(doc, next);
}

export function checklistProgress(feature) {
  const items = feature.items || [];
  return { done: items.filter((i) => i.done).length, total: items.length };
}
