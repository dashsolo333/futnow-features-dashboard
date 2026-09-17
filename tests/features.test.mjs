import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyDoc } from '../js/model/doc.js';
import {
  createFeature, updateFeature, moveFeature, addTestSession, deleteFeature,
  lastVerdict, isLate, featureById, setStatus, setOrder, byRank,
} from '../js/model/features.js';

const who = { login: 'nadir', avatar: 'https://x/y.png' };
const now = '2026-09-14T12:00:00.000Z';

const withOne = () => createFeature(emptyDoc(), {
  id: 'f1', title: 'Pronos', family: 'labs', by: who, at: now,
});

test('createFeature adds a feature at the first stage with defaults and journals it', () => {
  const d = withOne();
  const f = featureById(d, 'f1');
  assert.equal(f.stageId, 'idea');
  assert.equal(f.stepProgress, 0);
  assert.deepEqual(f.tests, []);
  assert.equal(f.createdBy.login, 'nadir');
  assert.equal(d.activity.length, 1);
  assert.equal(d.activity[0].type, 'create');
  assert.equal(d.activity[0].featureId, 'f1');
});

test('createFeature does not mutate the source doc', () => {
  const src = emptyDoc();
  createFeature(src, { id: 'x', title: 'X', by: who, at: now });
  assert.equal(src.features.length, 0);
});

test('createFeature requires a title', () => {
  assert.throws(() => createFeature(emptyDoc(), { id: 'x', title: '  ', by: who, at: now }), /titre/i);
});

test('updateFeature merges a patch and stamps updatedAt/updatedBy', () => {
  const d = updateFeature(withOne(), 'f1', { description: 'Ticket gratuit' }, { by: who, at: '2026-09-15T00:00:00Z' });
  const f = featureById(d, 'f1');
  assert.equal(f.description, 'Ticket gratuit');
  assert.equal(f.updatedAt, '2026-09-15T00:00:00Z');
  assert.equal(featureById(withOne(), 'f1').description, '');
});

test('moveFeature into the test stage stamps the actual prod-test date once', () => {
  let d = moveFeature(withOne(), 'f1', 'prodtest', { by: who, at: '2026-09-20T00:00:00Z' });
  let f = featureById(d, 'f1');
  assert.equal(f.stageId, 'prodtest');
  assert.equal(f.dates.prodTestActual, '2026-09-20');
  assert.equal(f.stepProgress, 0);
  d = moveFeature(d, 'f1', 'dev', { by: who, at: '2026-09-21T00:00:00Z' });
  d = moveFeature(d, 'f1', 'prodtest', { by: who, at: '2026-09-22T00:00:00Z' });
  assert.equal(featureById(d, 'f1').dates.prodTestActual, '2026-09-20');
  assert.equal(d.activity.at(-1).type, 'move');
});

test('moveFeature to final is refused without OK test unless forced, and stamps prodFinalActual', () => {
  const d = moveFeature(withOne(), 'f1', 'prodtest', { by: who, at: now });
  assert.throws(() => moveFeature(d, 'f1', 'prod', { by: who, at: now }), /test/i);
  const d2 = addTestSession(d, 'f1', { id: 't1', platform: 'ios', verdict: 'ok', notes: 'RAS', by: who, at: now });
  const d3 = moveFeature(d2, 'f1', 'prod', { by: who, at: '2026-10-01T09:00:00Z' });
  assert.equal(featureById(d3, 'f1').dates.prodFinalActual, '2026-10-01');
  const forced = moveFeature(d, 'f1', 'prod', { by: who, at: now, force: true });
  assert.equal(featureById(forced, 'f1').stageId, 'prod');
  assert.match(forced.activity.at(-1).text, /forc/i);
});

test('addTestSession appends and lastVerdict picks the most recent', () => {
  let d = addTestSession(withOne(), 'f1', { id: 't1', platform: 'ios', verdict: 'ko', notes: 'crash', by: who, at: '2026-09-01T00:00:00Z' });
  d = addTestSession(d, 'f1', { id: 't2', platform: 'android', verdict: 'ok', notes: '', by: who, at: '2026-09-03T00:00:00Z' });
  const f = featureById(d, 'f1');
  assert.equal(f.tests.length, 2);
  assert.equal(lastVerdict(f).verdict, 'ok');
  assert.equal(d.activity.at(-1).type, 'test');
});

test('addTestSession validates verdict and platform', () => {
  assert.throws(() => addTestSession(withOne(), 'f1', { id: 't', platform: 'ios', verdict: 'meh', by: who, at: now }), /verdict/i);
  assert.throws(() => addTestSession(withOne(), 'f1', { id: 't', platform: 'ps5', verdict: 'ok', by: who, at: now }), /plateforme/i);
});

test('deleteFeature removes it and journals', () => {
  const d = deleteFeature(withOne(), 'f1', { by: who, at: now });
  assert.equal(d.features.length, 0);
  assert.equal(d.activity.at(-1).type, 'delete');
});

test('isLate flags a planned date in the past without actual date', () => {
  const base = withOne();
  const f = { ...featureById(base, 'f1'), dates: { prodTestPlanned: '2026-09-01', prodTestActual: '', prodFinalPlanned: '2026-10-01', prodFinalActual: '' } };
  assert.deepEqual(isLate(f, '2026-09-14'), { prodTest: true, prodFinal: false });
  const done = { ...f, dates: { ...f.dates, prodTestActual: '2026-09-02' } };
  assert.deepEqual(isLate(done, '2026-09-14'), { prodTest: false, prodFinal: false });
});

test('activity journal is capped', () => {
  let d = emptyDoc();
  for (let i = 0; i < 620; i += 1) {
    d = createFeature(d, { id: `f${i}`, title: `F${i}`, by: who, at: now });
  }
  assert.ok(d.activity.length <= 500);
  assert.equal(d.activity.at(-1).featureId, 'f619');
});

test('setStatus stores the free-text status with its own timestamp and journals it', () => {
  const d = setStatus(withOne(), 'f1', '  En attente du retour d’Ilyas ', { by: who, at: '2026-09-15T09:00:00Z' });
  const f = featureById(d, 'f1');
  assert.equal(f.status, 'En attente du retour d’Ilyas');
  assert.equal(f.statusAt, '2026-09-15T09:00:00Z');
  assert.equal(f.statusBy.login, 'nadir');
  assert.equal(f.updatedAt, '2026-09-15T09:00:00Z');
  const last = d.activity.at(-1);
  assert.equal(last.type, 'status');
  assert.match(last.text, /statut de « Pronos » : En attente du retour d’Ilyas/);
});

test('setStatus with an unchanged status returns the doc untouched', () => {
  const d1 = setStatus(withOne(), 'f1', 'Bloqué', { by: who, at: '2026-09-15T09:00:00Z' });
  const d2 = setStatus(d1, 'f1', 'Bloqué', { by: who, at: '2026-09-15T10:00:00Z' });
  assert.equal(d2, d1);
});

test('setStatus with an empty text clears the status and journals it', () => {
  const d1 = setStatus(withOne(), 'f1', 'Bloqué', { by: who, at: '2026-09-15T09:00:00Z' });
  const d2 = setStatus(d1, 'f1', '   ', { by: who, at: '2026-09-15T10:00:00Z' });
  const f = featureById(d2, 'f1');
  assert.equal(f.status, '');
  assert.equal(f.statusAt, '2026-09-15T10:00:00Z');
  assert.match(d2.activity.at(-1).text, /a effacé le statut de « Pronos »/);
});

test('normalizeFeature defaults status fields for legacy features', () => {
  const f = featureById(withOne(), 'f1');
  assert.equal(f.status, '');
  assert.equal(f.statusAt, '');
  assert.equal(f.statusBy, null);
});

test('setOrder assigns manual ranks in the given order and journals once', () => {
  let d = withOne();
  d = createFeature(d, { id: 'f2', title: 'Deux', by: who, at: '2026-09-14T13:00:00.000Z' });
  d = createFeature(d, { id: 'f3', title: 'Trois', by: who, at: '2026-09-14T14:00:00.000Z' });
  const before = d.activity.length;
  d = setOrder(d, ['f3', 'f1', 'ghost'], { by: who, at: now });
  assert.equal(featureById(d, 'f3').rank, 10);
  assert.equal(featureById(d, 'f1').rank, 20);
  assert.equal(featureById(d, 'f2').rank, null);
  assert.equal(d.activity.length, before + 1);
  assert.match(d.activity.at(-1).text, /réordonné/);
  assert.deepEqual([...d.features].sort(byRank).map((f) => f.id), ['f3', 'f1', 'f2']);
  // Idempotent : même ordre → même document, pas de nouvelle entrée
  assert.equal(setOrder(d, ['f3', 'f1'], { by: who, at: now }), d);
});

test('setOrder ignores unknown ids and leaves the doc untouched when nothing matches', () => {
  const d = withOne();
  assert.equal(setOrder(d, ['ghost'], { by: who, at: now }), d);
  assert.equal(featureById(d, 'f1').rank, null);
});

test('byRank puts ranked features first, then the others by creation date', () => {
  const mk = (id, rank, createdAt) => ({ id, rank, createdAt });
  const list = [mk('a', null, '2026-09-03'), mk('b', 30, ''), mk('c', null, '2026-09-01'), mk('d', 10, '')];
  assert.deepEqual([...list].sort(byRank).map((f) => f.id), ['d', 'b', 'c', 'a']);
});
