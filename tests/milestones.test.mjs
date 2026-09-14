import { test } from 'node:test';
import assert from 'node:assert/strict';
import { milestoneStatus, shiftDay } from '../js/model/milestones.js';

test('milestoneStatus: no dates', () => {
  assert.deepEqual(milestoneStatus({ planned: '', actual: '' }, '2026-09-14'), { state: 'none', days: 0, label: 'Pas de date' });
});
test('milestoneStatus: planned in the future counts down', () => {
  assert.deepEqual(milestoneStatus({ planned: '2026-09-25', actual: '' }, '2026-09-14'), { state: 'planned', days: 11, label: 'J-11' });
});
test('milestoneStatus: planned today', () => {
  assert.equal(milestoneStatus({ planned: '2026-09-14', actual: '' }, '2026-09-14').label, 'Aujourd’hui');
});
test('milestoneStatus: late', () => {
  assert.deepEqual(milestoneStatus({ planned: '2026-09-09', actual: '' }, '2026-09-14'), { state: 'late', days: 5, label: 'Retard de 5 j' });
});
test('milestoneStatus: done, early or late vs target', () => {
  assert.deepEqual(milestoneStatus({ planned: '2026-09-20', actual: '2026-09-18' }, '2026-09-30'), { state: 'done', days: -2, label: 'Fait · 2 j en avance' });
  assert.equal(milestoneStatus({ planned: '2026-09-10', actual: '2026-09-18' }, '2026-09-30').label, 'Fait · 8 j de retard');
  assert.equal(milestoneStatus({ planned: '', actual: '2026-09-18' }, '2026-09-30').label, 'Fait');
});
test('shiftDay adds weeks/months from a base or today', () => {
  assert.equal(shiftDay('2026-09-14', { weeks: 1 }), '2026-09-21');
  assert.equal(shiftDay('2026-09-14', { months: 1 }), '2026-10-14');
  assert.equal(shiftDay('2026-01-31', { months: 1 }), '2026-02-28');
});
