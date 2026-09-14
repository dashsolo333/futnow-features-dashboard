import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createFeature, featureById, addChecklistItem, toggleChecklistItem, updateChecklistItem } from '../js/model/features.js';
import { DEFAULT_TEMPLATE, applyTemplate, groupItems } from '../js/model/checklist.js';

const who = { login: 'nadir', avatar: '' };
const now = '2026-09-14T12:00:00.000Z';
const base = () => createFeature(emptyDoc(), { id: 'f1', title: 'Pronos', by: who, at: now });

test('items carry a group and an optional due date; toggling records who and when', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'i1', text: 'Maquette validée', group: 'design', due: '2026-09-20', by: who, at: now });
  const it = featureById(d, 'f1').items[0];
  assert.equal(it.group, 'design');
  assert.equal(it.due, '2026-09-20');
  d = toggleChecklistItem(d, 'f1', 'i1', { by: who, at: '2026-09-15T08:00:00Z' });
  const done = featureById(d, 'f1').items[0];
  assert.equal(done.done, true);
  assert.equal(done.doneAt, '2026-09-15T08:00:00Z');
  assert.equal(done.doneBy.login, 'nadir');
});

test('updateChecklistItem edits text, group or due without touching done state', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'i1', text: 'Spec', group: 'spec', by: who, at: now });
  d = updateChecklistItem(d, 'f1', 'i1', { text: 'Spec écrite', due: '2026-09-18' }, { by: who, at: now });
  const it = featureById(d, 'f1').items[0];
  assert.equal(it.text, 'Spec écrite');
  assert.equal(it.due, '2026-09-18');
  assert.equal(it.done, false);
  assert.throws(() => updateChecklistItem(d, 'f1', 'i1', { text: ' ' }, { by: who, at: now }), /texte/i);
});

test('applyTemplate adds the default items once, skipping ones already present', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'x', text: DEFAULT_TEMPLATE[0].text, group: DEFAULT_TEMPLATE[0].group, by: who, at: now });
  d = applyTemplate(d, 'f1', { by: who, at: now });
  assert.equal(featureById(d, 'f1').items.length, DEFAULT_TEMPLATE.length);
  const again = applyTemplate(d, 'f1', { by: who, at: now });
  assert.equal(featureById(again, 'f1').items.length, DEFAULT_TEMPLATE.length);
});

test('groupItems orders groups like the pipeline and keeps ungrouped items last', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'a', text: 'A', group: 'dev', by: who, at: now });
  d = addChecklistItem(d, 'f1', { id: 'b', text: 'B', group: '', by: who, at: now });
  d = addChecklistItem(d, 'f1', { id: 'c', text: 'C', group: 'spec', by: who, at: now });
  const groups = groupItems(d, featureById(d, 'f1'));
  assert.deepEqual(groups.map((g) => g.id), ['spec', 'dev', '']);
  assert.equal(groups[0].label, 'Spec');
  assert.equal(groups[2].label, 'Autre');
});
