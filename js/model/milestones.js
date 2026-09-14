// Jalons datés (prod test, prod final) : état lisible et raccourcis de dates.
import { dayOffset, addDays } from './roadmap.js';

export function milestoneStatus({ planned, actual }, today) {
  if (actual) {
    if (!planned) return { state: 'done', days: 0, label: 'Fait' };
    const delta = dayOffset(planned, actual);
    if (delta === 0) return { state: 'done', days: 0, label: 'Fait · à l’heure' };
    return { state: 'done', days: delta, label: delta < 0 ? `Fait · ${-delta} j en avance` : `Fait · ${delta} j de retard` };
  }
  if (!planned) return { state: 'none', days: 0, label: 'Pas de date' };
  const days = dayOffset(today, planned);
  if (days === 0) return { state: 'planned', days: 0, label: 'Aujourd’hui' };
  if (days > 0) return { state: 'planned', days, label: `J-${days}` };
  return { state: 'late', days: -days, label: `Retard de ${-days} j` };
}

export function shiftDay(base, { weeks = 0, months = 0 } = {}) {
  let day = addDays(base, weeks * 7);
  if (months) {
    const d = new Date(`${day}T00:00:00Z`);
    const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0));
    const wanted = Math.min(d.getUTCDate(), target.getUTCDate());
    day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, wanted)).toISOString().slice(0, 10);
  }
  return day;
}
