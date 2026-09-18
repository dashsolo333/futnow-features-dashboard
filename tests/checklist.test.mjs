import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createFeature, featureById, addChecklistItem, toggleChecklistItem, removeChecklistItem, checklistProgress } from '../js/model/features.js';
import { featureTimeline } from '../js/model/timeline.js';

const who = { login: 'nadir' };
const now = '2026-09-14T12:00:00.000Z';
const base = () => createFeature(emptyDoc(), { id: 'f1', title: 'Pronos', by: who, at: now });

test('checklist items can be added, toggled and removed immutably', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'i1', text: 'Maquette validée', by: who, at: now });
  d = addChecklistItem(d, 'f1', { id: 'i2', text: 'RPC prête', by: who, at: now });
  assert.equal(featureById(d, 'f1').items.length, 2);
  assert.deepEqual(checklistProgress(featureById(d, 'f1')), { done: 0, total: 2, bugs: 0 });
  const d2 = toggleChecklistItem(d, 'f1', 'i1', { by: who, at: now });
  assert.equal(featureById(d2, 'f1').items[0].done, true);
  assert.equal(featureById(d, 'f1').items[0].done, false);
  assert.deepEqual(checklistProgress(featureById(d2, 'f1')), { done: 1, total: 2, bugs: 0 });
  const d3 = removeChecklistItem(d2, 'f1', 'i2', { by: who, at: now });
  assert.equal(featureById(d3, 'f1').items.length, 1);
  assert.equal(d2.activity.at(-1).type, 'update');
});

test('empty checklist text is refused', () => {
  assert.throws(() => addChecklistItem(base(), 'f1', { id: 'x', text: '  ', by: who, at: now }), /texte/i);
});

test('featureTimeline merges past activity and future planned dates in order', () => {
  let d = base();
  d = { ...d, features: d.features.map((f) => ({ ...f, dates: { ...f.dates, prodTestPlanned: '2026-09-20', prodFinalPlanned: '2026-10-05' } })) };
  const tl = featureTimeline(d, featureById(d, 'f1'), '2026-09-14');
  assert.equal(tl[0].kind, 'create');
  assert.deepEqual(tl.slice(1).map((e) => [e.kind, e.day, e.future]), [
    ['prodTest', '2026-09-20', true],
    ['prodFinal', '2026-10-05', true],
  ]);
});

test('featureTimeline marks a passed planned date without actual as late', () => {
  let d = base();
  d = { ...d, features: d.features.map((f) => ({ ...f, dates: { ...f.dates, prodTestPlanned: '2026-09-01' } })) };
  const tl = featureTimeline(d, featureById(d, 'f1'), '2026-09-14');
  const pt = tl.find((e) => e.kind === 'prodTest');
  assert.equal(pt.late, true);
  assert.equal(pt.future, false);
});
