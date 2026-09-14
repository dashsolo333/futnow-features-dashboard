import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import { createFeature, updateFeature, featureById } from '../js/model/features.js';
import { replayOps } from '../js/model/merge.js';

const who = { login: 'a' };
const now = '2026-09-14T00:00:00Z';

test('replayOps reapplies pending operations on a fresher remote document', () => {
  const local0 = createFeature(emptyDoc(), { id: 'mine', title: 'Mine', by: who, at: now });
  const remote = createFeature(emptyDoc(), { id: 'theirs', title: 'Theirs', by: { login: 'b' }, at: now });
  const ops = [
    (d) => createFeature(d, { id: 'mine', title: 'Mine', by: who, at: now }),
    (d) => updateFeature(d, 'mine', { description: 'x' }, { by: who, at: now }),
  ];
  const merged = replayOps(remote, ops);
  assert.ok(featureById(merged, 'theirs'));
  assert.equal(featureById(merged, 'mine').description, 'x');
  assert.equal(featureById(local0, 'mine').description, '');
});

test('replayOps skips an op that throws (feature deleted remotely) and reports it', () => {
  const remote = emptyDoc();
  const ops = [(d) => updateFeature(d, 'ghost', { title: 'Boo' }, { by: who, at: now })];
  const merged = replayOps(remote, ops);
  assert.equal(merged.features.length, 0);
  assert.equal(merged.__skipped, 1);
});
