// Pipeline modulable : les étapes sont éditables, deux d'entre elles portent
// une "garde" (prod test / prod final) référencée par id dans `gates`.

export const DEFAULT_STAGES = [
  { id: 'idea', label: 'Idée', color: '#8b97ad' },
  { id: 'spec', label: 'Spec', color: '#a78bfa' },
  { id: 'design', label: 'Design', color: '#f472b6' },
  { id: 'dev', label: 'Dev', color: '#4f8cff' },
  { id: 'review', label: 'Review', color: '#22d3ee' },
  { id: 'prodtest', label: 'Prod test', color: '#f59e0b' },
  { id: 'prod', label: 'Prod final', color: '#b5f03a' },
];

export const DEFAULT_GATES = { testStageId: 'prodtest', finalStageId: 'prod' };

export function stageIndex(doc, stageId) {
  return doc.stages.findIndex((s) => s.id === stageId);
}

export function stageById(doc, stageId) {
  return doc.stages.find((s) => s.id === stageId) || null;
}

/** Jauge 0..100 : position dans le pipeline + avancement dans l'étape. */
export function gaugeOf(doc, feature) {
  const idx = stageIndex(doc, feature.stageId);
  if (idx < 0) return 0;
  const n = doc.stages.length;
  if (idx === n - 1) return 100;
  const step = Math.min(100, Math.max(0, Number(feature.stepProgress) || 0)) / 100;
  return Math.round(((idx + step) / n) * 100);
}

export function latestTest(feature) {
  const tests = feature.tests || [];
  if (!tests.length) return null;
  return [...tests].sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1);
}

/** Garde : entrer en prod final exige un dernier verdict de test OK. */
export function canMoveTo(doc, feature, stageId, { force = false } = {}) {
  if (stageId !== doc.gates.finalStageId || force) return { ok: true, reason: '' };
  const last = latestTest(feature);
  if (!last) return { ok: false, reason: 'Aucune session de test enregistrée. Ajoute un test OK ou force le passage.' };
  if (last.verdict !== 'ok') return { ok: false, reason: 'Le dernier test est KO. Enregistre un test OK ou force le passage.' };
  return { ok: true, reason: '' };
}

export function renameStage(doc, stageId, label) {
  return { ...doc, stages: doc.stages.map((s) => (s.id === stageId ? { ...s, label } : s)) };
}

export function recolorStage(doc, stageId, color) {
  return { ...doc, stages: doc.stages.map((s) => (s.id === stageId ? { ...s, color } : s)) };
}

export function addStage(doc, { label, color = '#8b97ad' }, at = doc.stages.length) {
  const id = `s_${Math.random().toString(36).slice(2, 8)}`;
  const stages = [...doc.stages];
  stages.splice(at, 0, { id, label, color });
  return { ...doc, stages };
}

export function moveStage(doc, stageId, to) {
  const from = stageIndex(doc, stageId);
  if (from < 0) return doc;
  const stages = [...doc.stages];
  const [s] = stages.splice(from, 1);
  stages.splice(Math.max(0, Math.min(stages.length, to)), 0, s);
  return { ...doc, stages };
}

export function removeStage(doc, stageId) {
  if (stageId === doc.gates.finalStageId || stageId === doc.gates.testStageId) {
    throw new Error('Cette étape porte une garde (prod test / prod final) : change la garde avant de la supprimer.');
  }
  const idx = stageIndex(doc, stageId);
  if (idx < 0) return doc;
  const fallback = doc.stages[Math.max(0, idx - 1)].id;
  return {
    ...doc,
    stages: doc.stages.filter((s) => s.id !== stageId),
    features: (doc.features || []).map((f) => (f.stageId === stageId ? { ...f, stageId: fallback } : f)),
  };
}

export function setGate(doc, gate, stageId) {
  if (!['testStageId', 'finalStageId'].includes(gate)) throw new Error('Garde inconnue');
  if (stageIndex(doc, stageId) < 0) throw new Error('Étape inconnue');
  return { ...doc, gates: { ...doc.gates, [gate]: stageId } };
}
