import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STAGES, DEFAULT_GATES, stageIndex, gaugeOf, canMoveTo,
  renameStage, addStage, removeStage, moveStage,
} from '../js/model/stages.js';

const doc = { stages: DEFAULT_STAGES, gates: DEFAULT_GATES };

test('gauge is 0 at first stage with no step progress', () => {
  const f = { stageId: 'idea', stepProgress: 0 };
  assert.equal(gaugeOf(doc, f), 0);
});

test('gauge is 100 at final stage regardless of step progress', () => {
  const f = { stageId: 'prod', stepProgress: 0 };
  assert.equal(gaugeOf(doc, f), 100);
});

test('gauge blends stage index and in-stage progress', () => {
  // 7 stages, dev is index 3, half done → (3 + .5) / 7
  const f = { stageId: 'dev', stepProgress: 50 };
  assert.equal(gaugeOf(doc, f), Math.round(((3 + 0.5) / 7) * 100));
});

test('unknown stage falls back to 0', () => {
  assert.equal(gaugeOf(doc, { stageId: 'nope' }), 0);
  assert.equal(stageIndex(doc, 'nope'), -1);
});

test('moving to final stage is blocked without an OK test verdict', () => {
  const f = { stageId: 'prodtest', tests: [] };
  const r = canMoveTo(doc, f, 'prod');
  assert.equal(r.ok, false);
  assert.match(r.reason, /test/i);
});

test('moving to final stage is blocked when last verdict is KO', () => {
  const f = { stageId: 'prodtest', tests: [
    { at: '2026-09-01T10:00:00Z', verdict: 'ok' },
    { at: '2026-09-02T10:00:00Z', verdict: 'ko' },
  ] };
  assert.equal(canMoveTo(doc, f, 'prod').ok, false);
});

test('moving to final stage is allowed when latest verdict is OK (order independent)', () => {
  const f = { stageId: 'prodtest', tests: [
    { at: '2026-09-02T10:00:00Z', verdict: 'ok' },
    { at: '2026-09-01T10:00:00Z', verdict: 'ko' },
  ] };
  assert.equal(canMoveTo(doc, f, 'prod').ok, true);
});

test('force flag bypasses the final gate', () => {
  const f = { stageId: 'dev', tests: [] };
  assert.equal(canMoveTo(doc, f, 'prod', { force: true }).ok, true);
});

test('moving to any non-final stage is always allowed', () => {
  const f = { stageId: 'idea', tests: [] };
  assert.equal(canMoveTo(doc, f, 'prodtest').ok, true);
});

test('stage editing is immutable and preserves gates', () => {
  const d1 = renameStage(doc, 'dev', 'Développement');
  assert.equal(doc.stages.find((s) => s.id === 'dev').label, 'Dev');
  assert.equal(d1.stages.find((s) => s.id === 'dev').label, 'Développement');

  const d2 = addStage(d1, { label: 'QA' }, 4);
  assert.equal(d2.stages.length, 8);
  assert.equal(d2.stages[4].label, 'QA');
  assert.ok(d2.stages[4].id);

  const d3 = moveStage(d2, d2.stages[4].id, 1);
  assert.equal(d3.stages[1].label, 'QA');

  const d4 = removeStage(d3, d3.stages[1].id);
  assert.equal(d4.stages.length, 7);
  assert.deepEqual(d4.gates, DEFAULT_GATES);
});

test('removing a gate stage is refused', () => {
  assert.throws(() => removeStage(doc, 'prod'), /gate|garde/i);
});
