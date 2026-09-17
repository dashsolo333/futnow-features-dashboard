// Document racine stocké dans data/features.json. Tout est immuable :
// chaque opération renvoie un nouveau document.
import { DEFAULT_STAGES, DEFAULT_GATES } from './stages.js';

export const DOC_VERSION = 1;
export const ACTIVITY_CAP = 500;

export const PLATFORMS = [
  { id: 'ios', label: 'iOS' },
  { id: 'android', label: 'Android' },
  { id: 'web', label: 'Web' },
];

export const PRIORITIES = [
  { id: 'p0', label: 'Critique' },
  { id: 'p1', label: 'Haute' },
  { id: 'p2', label: 'Normale' },
  { id: 'p3', label: 'Basse' },
];

export const FAMILIES = [
  { id: 'league', label: 'Ligue' },
  { id: 'flows', label: 'Flux match' },
  { id: 'activity', label: 'Activité' },
  { id: 'reward', label: 'Reward' },
  { id: 'labs', label: 'Labs' },
  { id: 'brochure', label: 'Brochure' },
  { id: 'prod', label: 'Prod' },
  { id: 'other', label: 'Autre' },
];

export function emptyDoc() {
  return {
    version: DOC_VERSION,
    updatedAt: '',
    stages: DEFAULT_STAGES,
    gates: DEFAULT_GATES,
    releases: [],
    features: [],
    activity: [],
  };
}

/** Normalise un document lu depuis GitHub (anciens champs, valeurs manquantes). */
export function normalizeDoc(raw) {
  const base = emptyDoc();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    stages: Array.isArray(raw.stages) && raw.stages.length ? raw.stages : base.stages,
    gates: { ...base.gates, ...(raw.gates || {}) },
    releases: Array.isArray(raw.releases) ? raw.releases : [],
    features: Array.isArray(raw.features) ? raw.features.map(normalizeFeature) : [],
    activity: Array.isArray(raw.activity) ? raw.activity : [],
  };
}

export function normalizeFeature(f) {
  return {
    id: String(f.id),
    title: f.title || 'Sans titre',
    description: f.description || '',
    icon: f.icon || '',
    family: f.family || 'other',
    familyLabel: f.familyLabel || '',
    priority: f.priority || 'p2',
    platforms: Array.isArray(f.platforms) ? f.platforms : ['ios', 'android'],
    stageId: f.stageId || 'idea',
    stepProgress: Number.isFinite(f.stepProgress) ? f.stepProgress : 0,
    status: typeof f.status === 'string' ? f.status : '',
    statusAt: f.statusAt || '',
    statusBy: f.statusBy || null,
    rank: Number.isFinite(f.rank) ? f.rank : null, // ordre manuel de la liste (null = jamais classée)
    releaseId: f.releaseId || '',
    devhubId: f.devhubId || '',
    links: Array.isArray(f.links) ? f.links : [],
    dates: {
      prodTestPlanned: '', prodTestActual: '', prodFinalPlanned: '', prodFinalActual: '',
      ...(f.dates || {}),
    },
    tests: Array.isArray(f.tests) ? f.tests : [],
    items: Array.isArray(f.items) ? f.items.map(normalizeItem) : [],
    createdAt: f.createdAt || '',
    createdBy: f.createdBy || null,
    updatedAt: f.updatedAt || f.createdAt || '',
    updatedBy: f.updatedBy || f.createdBy || null,
  };
}

function normalizeItem(i) {
  const status = ['todo', 'doing', 'blocked', 'done'].includes(i.status) ? i.status : (i.done ? 'done' : 'todo');
  return { group: '', due: '', note: '', doneAt: '', doneBy: null, ...i, status, done: status === 'done' };
}

export function pushActivity(doc, entry) {
  const activity = [...doc.activity, entry];
  const trimmed = activity.length > ACTIVITY_CAP ? activity.slice(activity.length - ACTIVITY_CAP) : activity;
  return { ...doc, activity: trimmed, updatedAt: entry.at || doc.updatedAt };
}

export function isoDay(iso) {
  return String(iso || '').slice(0, 10);
}

export function newId(prefix = 'f') {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rnd}`;
}
