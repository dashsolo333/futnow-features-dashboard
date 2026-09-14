import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startOfWeek, weekRange, featureSpan, dayOffset } from '../js/model/roadmap.js';

test('startOfWeek returns the Monday (ISO) as YYYY-MM-DD', () => {
  assert.equal(startOfWeek('2026-09-14'), '2026-09-14'); // Monday
  assert.equal(startOfWeek('2026-09-20'), '2026-09-14'); // Sunday
  assert.equal(startOfWeek('2026-09-16'), '2026-09-14');
});

test('weekRange builds consecutive Mondays around today', () => {
  const weeks = weekRange('2026-09-14', { before: 1, after: 2 });
  assert.deepEqual(weeks.map((w) => w.start), ['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
  assert.equal(weeks[1].isCurrent, true);
  assert.equal(weeks[0].isCurrent, false);
});

test('dayOffset counts days between ISO dates', () => {
  assert.equal(dayOffset('2026-09-07', '2026-09-14'), 7);
  assert.equal(dayOffset('2026-09-14', '2026-09-07'), -7);
});

test('featureSpan uses creation as start and the furthest known date as end', () => {
  const f = {
    createdAt: '2026-09-01T10:00:00Z',
    dates: { prodTestPlanned: '2026-09-20', prodFinalPlanned: '2026-10-05', prodTestActual: '', prodFinalActual: '' },
  };
  assert.deepEqual(featureSpan(f, '2026-09-14'), { start: '2026-09-01', end: '2026-10-05', open: false });
});

test('featureSpan without any planned date is open-ended to today', () => {
  const f = { createdAt: '2026-09-01T10:00:00Z', dates: {} };
  assert.deepEqual(featureSpan(f, '2026-09-14'), { start: '2026-09-01', end: '2026-09-14', open: true });
});
