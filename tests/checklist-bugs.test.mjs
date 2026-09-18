import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc, normalizeFeature } from '../js/model/doc.js';
import { createFeature, featureById, addChecklistItem, setChecklistStatus, setChecklistBug, checklistProgress } from '../js/model/features.js';
import { checklistStats, groupItems } from '../js/model/checklist.js';

const who = { login: 'nadir', avatar: '' };
const now = '2026-09-18T12:00:00.000Z';
const meta = { by: who, at: now };
const base = () => {
  let d = createFeature(emptyDoc(), { id: 'f1', title: 'Pronos', ...meta });
  d = addChecklistItem(d, 'f1', { id: 'i1', text: 'Ticket vide', group: 'dev', ...meta });
  d = addChecklistItem(d, 'f1', { id: 'i2', text: 'Cotes', group: 'dev', ...meta });
  return addChecklistItem(d, 'f1', { id: 'i3', text: 'Maquette', group: 'design', ...meta });
};

test('a new item is not a bug; flagging it is journaled and keeps its status', () => {
  let d = setChecklistStatus(base(), 'f1', 'i1', 'doing', meta);
  assert.equal(featureById(d, 'f1').items[0].bug, false);
  d = setChecklistBug(d, 'f1', 'i1', true, meta);
  const it = featureById(d, 'f1').items[0];
  assert.equal(it.bug, true);
  assert.equal(it.status, 'doing');
  assert.match(d.activity.at(-1).text, /bug/i);
});

test('removing the flag is journaled; setting the same value changes nothing', () => {
  const flagged = setChecklistBug(base(), 'f1', 'i1', true, meta);
  assert.equal(setChecklistBug(flagged, 'f1', 'i1', true, meta), flagged);
  const cleared = setChecklistBug(flagged, 'f1', 'i1', false, meta);
  assert.equal(featureById(cleared, 'f1').items[0].bug, false);
  assert.match(cleared.activity.at(-1).text, /retiré/i);
  assert.equal(setChecklistBug(flagged, 'f1', 'nope', true, meta), flagged);
});

test('checklistProgress counts open bugs only: a done bug is a fixed bug', () => {
  let d = setChecklistBug(base(), 'f1', 'i1', true, meta);
  d = setChecklistBug(d, 'f1', 'i2', true, meta);
  assert.deepEqual(checklistProgress(featureById(d, 'f1')), { done: 0, total: 3, bugs: 2 });
  d = setChecklistStatus(d, 'f1', 'i2', 'done', meta);
  assert.deepEqual(checklistProgress(featureById(d, 'f1')), { done: 1, total: 3, bugs: 1 });
  assert.equal(featureById(d, 'f1').items[1].bug, true);
});

test('checklistStats and groupItems expose open bugs', () => {
  let d = setChecklistBug(base(), 'f1', 'i1', true, meta);
  d = setChecklistBug(d, 'f1', 'i3', true, meta);
  d = setChecklistStatus(d, 'f1', 'i3', 'done', meta);
  const f = featureById(d, 'f1');
  assert.equal(checklistStats(f, '2026-09-18').bugs, 1);
  const groups = groupItems(d, f);
  assert.equal(groups.find((g) => g.id === 'dev').bugs, 1);
  assert.equal(groups.find((g) => g.id === 'design').bugs, 0);
});

test('items saved before the flag existed are normalized to bug: false', () => {
  const f = normalizeFeature({ id: 'f', title: 'Old', items: [{ id: 'i', text: 'x', done: false }, { id: 'j', text: 'y', bug: 1 }] });
  assert.equal(f.items[0].bug, false);
  assert.equal(f.items[1].bug, true);
  assert.equal(checklistProgress({}).bugs, 0);
});
