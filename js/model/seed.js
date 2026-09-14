// Seed depuis le catalogue DevHub de la refonte (app/src/dev/devhub.catalogue.json).
import { emptyDoc, isoDay, FAMILIES } from './doc.js';

export const STATUS_TO_STAGE = { mock: 'design', prod: 'prod', static: 'spec', labo: 'design' };
export const CATEGORY_LABEL = Object.fromEntries(FAMILIES.map((f) => [f.id, f.label]));

const SEED_USER = { login: 'devhub', avatar: '' };

export function seedFromCatalogue(catalogue, updated, { at }) {
  const doc = emptyDoc();
  const features = (catalogue.entries || []).map((e) => {
    const meta = updated?.entries?.[e.id] || {};
    const stageId = STATUS_TO_STAGE[e.status] || 'idea';
    const isProd = stageId === 'prod';
    const description = [e.hint, e.tag ? `Tag DevHub : ${e.tag}` : ''].filter(Boolean).join('\n\n');
    return {
      id: `dh_${e.id}`,
      devhubId: e.id,
      icon: e.icon || '',
      title: e.label,
      description,
      family: CATEGORY_LABEL[e.category] ? e.category : 'other',
      familyLabel: CATEGORY_LABEL[e.category] || 'Autre',
      priority: 'p2',
      platforms: ['ios', 'android'],
      stageId,
      stepProgress: 0,
      releaseId: '',
      links: (e.sources || []).map((s) => ({ label: s, url: `https://github.com/serstyle/futnow-app/tree/design/refonte-ui/${s}` })),
      dates: { prodTestPlanned: '', prodTestActual: isProd ? isoDay(meta.updated || at) : '', prodFinalPlanned: '', prodFinalActual: isProd ? isoDay(meta.updated || at) : '' },
      tests: [],
      createdAt: meta.updated || at,
      createdBy: SEED_USER,
      updatedAt: meta.updated || at,
      updatedBy: SEED_USER,
    };
  });
  return { ...doc, features, updatedAt: at };
}
