import { h, fmtDay, today } from './dom.js';
import { weekRange, featureSpan, dayOffset, weekLabel } from '../model/roadmap.js';
import { stageById } from '../model/stages.js';
import { isLate } from '../model/features.js';
import { ringGauge } from './gauge.js';
import { visibleFeatures } from './filters.js';

export function renderRoadmap(ctx) {
  const doc = ctx.doc;
  const t = today();
  const weeks = weekRange(t, { before: 2, after: 9 });
  const first = weeks[0].start;
  const totalDays = weeks.length * 7;
  const pct = (day) => `${(Math.max(0, Math.min(totalDays, dayOffset(first, day))) / totalDays) * 100}%`;
  const feats = [...visibleFeatures(doc, ctx.filters)]
    .filter((f) => f.stageId !== doc.gates.finalStageId || f.dates.prodFinalActual >= first)
    .sort((a, b) => (a.dates.prodFinalPlanned || a.dates.prodTestPlanned || '9999').localeCompare(b.dates.prodFinalPlanned || b.dates.prodTestPlanned || '9999'));
  const cols = `repeat(${weeks.length}, 1fr)`;

  return h('div', {},
    h('div', { class: 'roadmap glass' },
      h('div', { class: 'gantt' },
        h('div', { class: 'gantt-side' },
          h('div', { class: 'gantt-head' }, `${feats.length} feature${feats.length > 1 ? 's' : ''}`),
          feats.map((f) => h('div', { class: 'gantt-row', onClick: () => ctx.openFeature(f.id) },
            ringGauge(doc, f, 28), h('span', { class: 'name' }, `${f.icon ? `${f.icon} ` : ''}${f.title}`)))),
        h('div', { class: 'gantt-body' },
          h('div', { class: 'weeks', style: { gridTemplateColumns: cols } },
            weeks.map((w) => h('div', { class: `week${w.isCurrent ? ' is-current' : ''}` }, h('b', {}, weekLabel(w.start)), `sem. ${isoWeek(w.start)}`))),
          h('div', { class: 'lanes' },
            feats.map((f) => renderLane(ctx, f, { weeks, cols, pct, t })),
            h('div', { class: 'today-line', style: { left: pct(t) } })))),
      ),
    h('div', { class: 'legend' },
      h('span', {}, h('i', { style: { '--mk': '#f59e0b' } }), 'prod test prévu'),
      h('span', {}, h('i', { class: 'is-done', style: { '--mk': '#f59e0b' } }), 'prod test fait'),
      h('span', {}, h('i', { style: { '--mk': '#b5f03a' } }), 'prod final prévu'),
      h('span', {}, h('i', { class: 'is-done', style: { '--mk': '#b5f03a' } }), 'livré'),
      h('span', {}, 'barre hachurée = aucune date cible')),
    !feats.length ? h('div', { class: 'empty' }, h('b', {}, 'Rien à planifier'), 'Ajoute des dates cibles dans les fiches.') : null);
}

function renderLane(ctx, f, { weeks, cols, pct, t }) {
  const doc = ctx.doc;
  const span = featureSpan(f, t);
  const stage = stageById(doc, f.stageId);
  const late = isLate(f, t);
  const left = pct(span.start);
  const right = pct(span.end);
  const d = f.dates;
  const marker = (day, color, done, isLateFlag, label) => day ? h('button', {
    type: 'button', class: `marker${done ? ' is-done' : ''}${isLateFlag ? ' is-late' : ''}`, style: { left: pct(day), '--mk': color },
    title: `${label} · ${fmtDay(day)}`, 'aria-label': `${label} ${fmtDay(day)}`, onClick: () => ctx.openFeature(f.id),
  }) : null;
  return h('div', { class: 'lane' },
    h('div', { class: 'lane-grid', style: { gridTemplateColumns: cols } }, weeks.map((w) => h('span', { class: w.isCurrent ? 'is-current' : '' }))),
    h('div', { class: `gbar${span.open ? ' is-open' : ''}`, style: { left, width: `calc(${right} - ${left})`, '--gbar': stage?.color }, title: `${f.title} · ${stage?.label}`, onClick: () => ctx.openFeature(f.id) },
      !span.open ? h('i', { style: { width: `${gaugeWidth(doc, f)}%` } }) : null),
    marker(d.prodTestActual || d.prodTestPlanned, '#f59e0b', Boolean(d.prodTestActual), late.prodTest, 'Prod test'),
    marker(d.prodFinalActual || d.prodFinalPlanned, '#b5f03a', Boolean(d.prodFinalActual), late.prodFinal, 'Prod final'));
}

function gaugeWidth(doc, f) {
  const idx = doc.stages.findIndex((s) => s.id === f.stageId);
  return Math.round(((idx + (f.stepProgress || 0) / 100) / doc.stages.length) * 100);
}

function isoWeek(day) {
  const d = new Date(`${day}T00:00:00Z`);
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
