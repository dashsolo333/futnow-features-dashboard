import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seedFromCatalogue, STATUS_TO_STAGE, CATEGORY_LABEL } from '../js/model/seed.js';

const catalogue = { entries: [
  { id: 'pronos', icon: '🎰', label: 'Pronos', tag: 'ticket gratuit', hint: 'Tout pariable', category: 'labs', status: 'mock', sources: ['app/x'] },
  { id: 'home-prod', icon: '🏠', label: 'Home', tag: 'shell prod', hint: '', category: 'prod', status: 'prod', sources: [] },
  { id: 'replay-feed', icon: '🎞', label: 'Feed replay', tag: '', hint: '', category: 'brochure', status: 'static', sources: [] },
] };
const updated = { entries: { pronos: { updated: '2026-09-11T09:17:33Z', files: 3 } } };

test('seedFromCatalogue maps every entry to a feature with stage by status', () => {
  const doc = seedFromCatalogue(catalogue, updated, { at: '2026-09-14T00:00:00Z' });
  assert.equal(doc.features.length, 3);
  const pronos = doc.features.find((f) => f.devhubId === 'pronos');
  assert.equal(pronos.stageId, STATUS_TO_STAGE.mock);
  assert.equal(pronos.familyLabel, CATEGORY_LABEL.labs);
  assert.equal(pronos.icon, '🎰');
  assert.equal(pronos.updatedAt, '2026-09-11T09:17:33Z');
  assert.match(pronos.description, /Tout pariable/);
  assert.equal(doc.features.find((f) => f.devhubId === 'home-prod').stageId, 'prod');
  assert.equal(doc.features.find((f) => f.devhubId === 'replay-feed').stageId, STATUS_TO_STAGE.static);
});

test('seeded prod features get an actual prod-final date so they are not late', () => {
  const doc = seedFromCatalogue(catalogue, updated, { at: '2026-09-14T00:00:00Z' });
  const home = doc.features.find((f) => f.devhubId === 'home-prod');
  assert.equal(home.dates.prodFinalActual, '2026-09-14');
});
