import { h, fmtDay, today } from './dom.js';
import { isLate } from '../model/features.js';

export function renderKpis(ctx) {
  const doc = ctx.doc;
  if (!doc) return null;
  const t = today();
  const { testStageId, finalStageId } = doc.gates;
  const midStages = doc.stages.filter((s) => s.id !== finalStageId && s.id !== testStageId && s.id !== doc.stages[0].id).map((s) => s.id);
  const feats = doc.features;
  const count = (fn) => feats.filter(fn).length;
  const late = count((f) => { const l = isLate(f, t); return l.prodTest || l.prodFinal; });
  const next = nextRelease(doc, t);
  const nextCount = next ? count((f) => f.releaseId === next.id) : 0;

  const tile = (key, label, value, sub, color, filter) => h('button', {
    type: 'button', class: `kpi glass kpi-${key}`, 'aria-pressed': ctx.filters.kpi === key ? 'true' : 'false',
    style: { '--kpi': color }, onClick: () => ctx.toggleKpi(key, filter),
  },
  h('span', { class: 'kpi-accent' }),
  h('div', { class: 'kpi-label' }, label),
  h('div', { class: 'kpi-value' }, value),
  sub ? h('div', { class: 'kpi-sub' }, sub) : null);

  return [
    tile('all', 'Features', feats.length, `${count((f) => f.stageId === doc.stages[0].id)} au stade idée`, '#8b97ad', {}),
    tile('wip', 'En cours', count((f) => midStages.includes(f.stageId)), 'spec → review', '#4f8cff', { stageSet: midStages }),
    tile('test', 'En prod test', count((f) => f.stageId === testStageId), 'à valider', '#f59e0b', { stage: testStageId }),
    tile('prod', 'En prod', count((f) => f.stageId === finalStageId), 'livré', '#b5f03a', { stage: finalStageId }),
    tile('late', 'En retard', late, late ? 'date cible dépassée' : 'tout est à l’heure', '#f87171', { late: true }),
    next
      ? tile('release', 'Prochaine version', next.version, `${fmtDay(next.plannedAt)} · ${nextCount} feature${nextCount > 1 ? 's' : ''}`, '#22d3ee', { release: next.id })
      : tile('release', 'Prochaine version', '—', 'aucune planifiée', '#22d3ee', {}),
  ];
}

export function nextRelease(doc, t) {
  return [...doc.releases].filter((r) => !r.releasedAt && r.plannedAt >= t).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt))[0]
    || [...doc.releases].filter((r) => !r.releasedAt).sort((a, b) => a.plannedAt.localeCompare(b.plannedAt))[0]
    || null;
}
