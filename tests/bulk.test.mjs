import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createFeature, featureById, addTestSession } from '../js/model/features.js';
import { bulkMove, bulkUpdate, bulkDelete } from '../js/model/bulk.js';

const who = { login: 'nadir' };
const now = '2026-09-14T12:00:00.000Z';
const three = () => ['a', 'b', 'c'].reduce((d, id) => createFeature(d, { id, title: id.toUpperCase(), by: who, at: now }), emptyDoc());

test('bulkMove moves allowed features and reports the blocked ones', () => {
  let d = three();
  d = addTestSession(d, 'a', { id: 't', platform: 'ios', verdict: 'ok', by: who, at: now });
  const r = bulkMove(d, ['a', 'b', 'c'], 'prod', { by: who, at: now });
  assert.deepEqual(r.moved, ['a']);
  assert.deepEqual(r.blocked.map((b) => b.id), ['b', 'c']);
  assert.equal(featureById(r.doc, 'a').stageId, 'prod');
  assert.equal(featureById(r.doc, 'b').stageId, 'idea');
  assert.match(r.blocked[0].reason, /test/i);
});

test('bulkMove with force moves everything and journals each move', () => {
  const r = bulkMove(three(), ['a', 'b'], 'prod', { by: who, at: now, force: true });
  assert.deepEqual(r.moved, ['a', 'b']);
  assert.equal(r.doc.activity.filter((x) => x.type === 'move').length, 2);
});

test('bulkUpdate patches every selected feature', () => {
  const r = bulkUpdate(three(), ['a', 'c'], { priority: 'p0' }, { by: who, at: now });
  assert.equal(featureById(r.doc, 'a').priority, 'p0');
  assert.equal(featureById(r.doc, 'b').priority, 'p2');
  assert.equal(featureById(r.doc, 'c').priority, 'p0');
  assert.equal(r.updated, 2);
});

test('bulkDelete removes the selection and ignores unknown ids', () => {
  const r = bulkDelete(three(), ['a', 'zz'], { by: who, at: now });
  assert.deepEqual(r.doc.features.map((f) => f.id), ['b', 'c']);
  assert.equal(r.deleted, 1);
});
