import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createFeature, featureById, addChecklistItem, toggleChecklistItem, setChecklistStatus, updateChecklistItem } from '../js/model/features.js';
import { checklistStats, groupItems, STATUSES } from '../js/model/checklist.js';

const who = { login: 'nadir', avatar: '' };
const now = '2026-09-14T12:00:00.000Z';
const base = () => createFeature(emptyDoc(), { id: 'f1', title: 'Pronos', by: who, at: now });

test('a new item is todo; status changes are journaled and keep done in sync', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'i1', text: 'Spec', group: 'spec', by: who, at: now });
  assert.equal(featureById(d, 'f1').items[0].status, 'todo');
  d = setChecklistStatus(d, 'f1', 'i1', 'doing', { by: who, at: now });
  assert.equal(featureById(d, 'f1').items[0].status, 'doing');
  assert.match(d.activity.at(-1).text, /en cours/i);
  d = setChecklistStatus(d, 'f1', 'i1', 'done', { by: who, at: '2026-09-15T00:00:00Z' });
  const it = featureById(d, 'f1').items[0];
  assert.equal(it.done, true);
  assert.equal(it.doneBy.login, 'nadir');
  d = toggleChecklistItem(d, 'f1', 'i1', { by: who, at: now });
  assert.equal(featureById(d, 'f1').items[0].status, 'todo');
  assert.equal(featureById(d, 'f1').items[0].done, false);
  assert.throws(() => setChecklistStatus(d, 'f1', 'i1', 'later', { by: who, at: now }), /statut/i);
});

test('blocked status survives an unrelated edit and a note can be attached', () => {
  let d = addChecklistItem(base(), 'f1', { id: 'i1', text: 'RPC', group: 'dev', by: who, at: now });
  d = setChecklistStatus(d, 'f1', 'i1', 'blocked', { by: who, at: now });
  d = updateChecklistItem(d, 'f1', 'i1', { note: 'Attend la migration RLS' }, { by: who, at: now });
  const it = featureById(d, 'f1').items[0];
  assert.equal(it.status, 'blocked');
  assert.equal(it.note, 'Attend la migration RLS');
});

test('checklistStats counts by status, late items and the next due date', () => {
  let d = base();
  const add = (id, group, patch) => { d = addChecklistItem(d, 'f1', { id, text: id, group, by: who, at: now, ...patch }); };
  add('a', 'spec', { due: '2026-09-10' }); // late
  add('b', 'spec', { due: '2026-09-20' });
  add('c', 'dev', {});
  add('d', 'dev', { due: '2026-09-16' });
  d = setChecklistStatus(d, 'f1', 'c', 'doing', { by: who, at: now });
  d = setChecklistStatus(d, 'f1', 'b', 'blocked', { by: who, at: now });
  d = setChecklistStatus(d, 'f1', 'd', 'done', { by: who, at: now });
  const s = checklistStats(featureById(d, 'f1'), '2026-09-14');
  assert.deepEqual({ total: s.total, done: s.done, doing: s.doing, blocked: s.blocked, todo: s.todo, late: s.late, pct: s.pct }, { total: 4, done: 1, doing: 1, blocked: 1, todo: 1, late: 1, pct: 25 });
  assert.equal(s.nextDue.id, 'b'); // first upcoming, not done, not past
  assert.equal(s.lastDone.id, 'd');
  const groups = groupItems(d, featureById(d, 'f1'));
  assert.deepEqual(groups.map((g) => [g.id, g.done, g.doing, g.blocked, g.pct]), [['spec', 0, 0, 1, 0], ['dev', 1, 1, 0, 50]]);
  assert.equal(STATUSES.length, 4);
});
