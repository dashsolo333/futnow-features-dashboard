import { h, icon, fmtDay, today } from './dom.js';
import { gaugeOf, stageById } from '../model/stages.js';
import { ringGauge } from './gauge.js';
import { visibleFeatures } from './filters.js';

export function renderReleases(ctx) {
  const doc = ctx.doc;
  const feats = visibleFeatures(doc, ctx.filters);
  const t = today();
  const releases = [...doc.releases].sort((a, b) => (a.plannedAt || '9999').localeCompare(b.plannedAt || '9999'));
  const orphan = feats.filter((f) => !f.releaseId || !doc.releases.some((r) => r.id === f.releaseId));
  return h('div', { class: 'releases' },
    releases.map((r) => renderRelease(ctx, r, feats.filter((f) => f.releaseId === r.id), t)),
    h('button', { type: 'button', class: 'release-add', onClick: () => ctx.openSettings('releases') }, h('span', {}, icon('plus'), ' Nouvelle version')),
    orphan.length ? h('section', { class: 'release glass', style: { borderStyle: 'dashed' } },
      h('div', { class: 'release-head' }, h('div', {}, h('div', { class: 'release-version', style: { fontSize: '18px' } }, 'Sans version'), h('div', { class: 'release-name' }, `${orphan.length} feature${orphan.length > 1 ? 's' : ''} à rattacher`))),
      h('div', { class: 'release-list' }, orphan.map((f) => item(ctx, f)))) : null);
}

function renderRelease(ctx, r, feats, t) {
  const doc = ctx.doc;
  const avg = feats.length ? Math.round(feats.reduce((s, f) => s + gaugeOf(doc, f), 0) / feats.length) : 0;
  const shipped = feats.filter((f) => f.stageId === doc.gates.finalStageId).length;
  const late = !r.releasedAt && r.plannedAt && r.plannedAt < t;
  return h('section', { class: 'release glass' },
    h('div', { class: 'release-head' },
      h('div', {}, h('div', { class: 'release-version' }, r.version), r.name ? h('div', { class: 'release-name' }, r.name) : null),
      h('div', { class: 'release-date' },
        r.releasedAt ? [h('span', { class: 'badge badge-ok' }, 'Sortie'), h('b', {}, fmtDay(r.releasedAt))]
          : [late ? h('span', { class: 'badge badge-late' }, 'En retard') : 'prévue', h('b', {}, fmtDay(r.plannedAt))])),
    h('div', { class: 'release-progress' },
      h('div', { class: 'bar', style: { '--bar': r.releasedAt ? '#b5f03a' : '#4f8cff' } }, h('i', { style: { width: `${avg}%` } })),
      h('span', {}, `${shipped}/${feats.length} en prod · ${avg} %`)),
    h('div', { class: 'release-list' },
      feats.length ? feats.map((f) => item(ctx, f)) : h('div', { class: 'dim', style: { padding: '6px 10px' } }, 'Aucune feature rattachée. Ouvre une fiche et choisis cette version.')));
}

function item(ctx, f) {
  const stage = stageById(ctx.doc, f.stageId);
  return h('div', { class: 'release-item', onClick: () => ctx.openFeature(f.id), role: 'button', tabindex: 0 },
    ringGauge(ctx.doc, f, 26), h('span', { class: 'name' }, `${f.icon ? `${f.icon} ` : ''}${f.title}`),
    h('span', { class: 'chip chip-stage', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label));
}
