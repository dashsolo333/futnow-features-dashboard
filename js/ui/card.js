import { h, icon, avatar, fmtDay, today } from './dom.js';
import { progressRow } from './gauge.js';
import { isLate, lastVerdict } from '../model/features.js';

export function datePill(label, planned, actual, late) {
  if (!planned && !actual) return null;
  const cls = `date-pill${actual ? ' is-done' : ''}${late ? ' is-late' : ''}`;
  return h('span', { class: cls, title: `${label} : ${actual ? `fait le ${fmtDay(actual)}` : `prévu le ${fmtDay(planned)}`}` },
    icon(actual ? 'check' : 'flag'), `${label} ${fmtDay(actual || planned)}`);
}

export function verdictBadge(feature) {
  const last = lastVerdict(feature);
  if (!last) return null;
  return h('span', { class: `badge badge-${last.verdict}`, title: last.notes || '' }, `Test ${last.verdict.toUpperCase()}`);
}

export function releaseChip(doc, feature) {
  const r = doc.releases.find((x) => x.id === feature.releaseId);
  return r ? h('span', { class: 'chip' }, r.version) : null;
}

export function renderCard(ctx, feature) {
  const doc = ctx.doc;
  const late = isLate(feature, today());
  const el = h('article', {
    class: 'card glass', tabindex: 0, role: 'button', draggable: ctx.canWrite() ? 'true' : null,
    dataset: { id: feature.id },
    onClick: () => ctx.openFeature(feature.id),
    onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ctx.openFeature(feature.id); } },
    onDragstart: (e) => { e.dataTransfer.setData('text/plain', feature.id); e.dataTransfer.effectAllowed = 'move'; el.classList.add('is-dragging'); },
    onDragend: () => el.classList.remove('is-dragging'),
  },
  h('div', { class: 'card-top' },
    h('span', { class: 'card-icon' }, feature.icon || '•'),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', { class: 'card-title' }, feature.title),
      h('div', { class: 'card-sub' }, feature.familyLabel || feature.family, feature.priority === 'p0' || feature.priority === 'p1' ? h('span', { class: 'badge badge-soon' }, feature.priority === 'p0' ? 'Critique' : 'Haute') : null))),
  progressRow(doc, feature),
  h('div', { class: 'card-foot' },
    datePill('Test', feature.dates.prodTestPlanned, feature.dates.prodTestActual, late.prodTest),
    datePill('Prod', feature.dates.prodFinalPlanned, feature.dates.prodFinalActual, late.prodFinal),
    verdictBadge(feature),
    releaseChip(doc, feature),
    avatar(feature.updatedBy, 20)));
  return el;
}
