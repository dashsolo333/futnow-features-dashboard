import { h, avatar, fmtDay, relTime, today } from './dom.js';
import { gaugeOf, stageById } from '../model/stages.js';
import { isLate } from '../model/features.js';
import { verdictBadge } from './card.js';
import { visibleFeatures } from './filters.js';

const COLS = [
  { id: 'title', label: 'Feature', get: (f) => f.title.toLowerCase() },
  { id: 'family', label: 'Famille', get: (f) => f.familyLabel },
  { id: 'stage', label: 'Étape', get: (f, doc) => doc.stages.findIndex((s) => s.id === f.stageId) },
  { id: 'gauge', label: 'Avancement', get: (f, doc) => gaugeOf(doc, f) },
  { id: 'test', label: 'Prod test', get: (f) => f.dates.prodTestActual || f.dates.prodTestPlanned || '9999' },
  { id: 'prod', label: 'Prod final', get: (f) => f.dates.prodFinalActual || f.dates.prodFinalPlanned || '9999' },
  { id: 'verdict', label: 'Dernier test', get: (f) => (f.tests.at(-1)?.verdict || 'zz') },
  { id: 'release', label: 'Version', get: (f, doc) => doc.releases.find((r) => r.id === f.releaseId)?.version || 'zz' },
  { id: 'updated', label: 'Mis à jour', get: (f) => f.updatedAt },
];

export function renderList(ctx) {
  const doc = ctx.doc;
  const sort = ctx.sort || { col: 'stage', dir: -1 };
  const col = COLS.find((c) => c.id === sort.col) || COLS[2];
  const feats = [...visibleFeatures(doc, ctx.filters)].sort((a, b) => {
    const va = col.get(a, doc); const vb = col.get(b, doc);
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
  });
  const t = today();
  return h('div', { class: 'table-wrap glass' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, COLS.map((c) => h('th', {
        scope: 'col', 'aria-sort': sort.col === c.id ? (sort.dir > 0 ? 'ascending' : 'descending') : null,
        onClick: () => ctx.setSort({ col: c.id, dir: sort.col === c.id ? -sort.dir : 1 }),
      }, c.label, sort.col === c.id ? (sort.dir > 0 ? ' ↑' : ' ↓') : '')))),
      h('tbody', {}, feats.map((f) => {
        const stage = stageById(doc, f.stageId);
        const g = gaugeOf(doc, f);
        const late = isLate(f, t);
        return h('tr', { onClick: () => ctx.openFeature(f.id), tabindex: 0, onKeydown: (e) => { if (e.key === 'Enter') ctx.openFeature(f.id); } },
          h('td', {}, h('div', { class: 'cell-title' }, h('span', {}, f.icon || '•'), f.title)),
          h('td', { class: 'muted' }, f.familyLabel || f.family),
          h('td', {}, h('span', { class: 'chip chip-stage', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label)),
          h('td', {}, h('div', { class: 'cell-gauge' }, h('div', { class: 'bar', style: { '--bar': stage?.color } }, h('i', { style: { width: `${g}%` } })), h('b', {}, `${g} %`))),
          h('td', {}, dateCell(f.dates.prodTestPlanned, f.dates.prodTestActual, late.prodTest)),
          h('td', {}, dateCell(f.dates.prodFinalPlanned, f.dates.prodFinalActual, late.prodFinal)),
          h('td', {}, verdictBadge(f) || h('span', { class: 'dim' }, '—')),
          h('td', { class: 'muted' }, doc.releases.find((r) => r.id === f.releaseId)?.version || '—'),
          h('td', {}, h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, avatar(f.updatedBy, 20), h('span', { class: 'muted' }, relTime(f.updatedAt)))));
      })),
    ),
    !feats.length ? h('div', { class: 'empty' }, h('b', {}, 'Aucune feature'), 'Change les filtres ou crée une feature.') : null);
}

function dateCell(planned, actual, late) {
  if (!planned && !actual) return h('span', { class: 'dim' }, '—');
  return h('div', { class: 'cell-dates' },
    actual ? h('span', { style: { color: '#6fe3a0' } }, `✓ ${fmtDay(actual)}`) : null,
    planned ? h('span', { class: late ? 'badge badge-late' : 'muted' }, `${actual ? 'cible ' : ''}${fmtDay(planned)}${late ? ' · retard' : ''}`) : null);
}
