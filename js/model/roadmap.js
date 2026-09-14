import { isoDay } from './doc.js';

const DAY = 86_400_000;

function toDate(day) {
  return new Date(`${day}T00:00:00Z`);
}

function fromDate(d) {
  return d.toISOString().slice(0, 10);
}

export function startOfWeek(day) {
  const d = toDate(day);
  const dow = (d.getUTCDay() + 6) % 7; // lundi = 0
  return fromDate(new Date(d.getTime() - dow * DAY));
}

export function addDays(day, n) {
  return fromDate(new Date(toDate(day).getTime() + n * DAY));
}

export function dayOffset(from, to) {
  return Math.round((toDate(to) - toDate(from)) / DAY);
}

export function weekRange(today, { before = 2, after = 8 } = {}) {
  const current = startOfWeek(today);
  const weeks = [];
  for (let i = -before; i <= after; i += 1) {
    const start = addDays(current, i * 7);
    weeks.push({ start, end: addDays(start, 6), isCurrent: i === 0 });
  }
  return weeks;
}

/** Empan d'une feature : création → date la plus lointaine connue (ou aujourd'hui). */
export function featureSpan(feature, today) {
  const start = isoDay(feature.createdAt) || today;
  const d = feature.dates || {};
  const candidates = [d.prodTestPlanned, d.prodFinalPlanned, d.prodTestActual, d.prodFinalActual].filter(Boolean);
  if (!candidates.length) return { start, end: today > start ? today : start, open: true };
  const end = candidates.sort().at(-1);
  return { start, end: end > start ? end : start, open: false };
}

export function weekLabel(start) {
  const d = toDate(start);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
