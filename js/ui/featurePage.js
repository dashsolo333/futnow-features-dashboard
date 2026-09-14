// Page pleine largeur d'une feature.
import { h, icon, avatar, fmtDay, fmtDayFull, relTime, today } from './dom.js';
import { bigGauge, stageStepper } from './gauge.js';
import { FAMILIES, PRIORITIES, PLATFORMS, newId } from '../model/doc.js';
import { updateFeature, deleteFeature, isLate, lastVerdict } from '../model/features.js';
import { renderChecklist } from './checklist.js';
import { stageIndex, canMoveTo } from '../model/stages.js';
import { featureTimeline } from '../model/timeline.js';
import { renderJournal } from './journal.js';
import { pillSelect, milestone, renderLinks, renderTests } from './featureParts.js';

export function renderFeaturePage(ctx, feature) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const patch = (p, label) => ctx.act(label || `a modifié « ${feature.title} »`, (d) => updateFeature(d, feature.id, p, ctx.meta()));
  const t = today();
  const late = isLate(feature, t);
  const idx = stageIndex(doc, feature.stageId);
  const nextStage = doc.stages[idx + 1] || null;
  const gate = nextStage ? canMoveTo(doc, feature, nextStage.id) : { ok: false };
  const release = doc.releases.find((r) => r.id === feature.releaseId);

  return h('article', { class: 'fpage' },
    h('nav', { class: 'fpage-nav' },
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: ctx.closeFeature }, '← Retour'),
      h('span', { class: 'dim' }, '·'),
      h('span', { class: 'muted' }, feature.familyLabel || feature.family),
      feature.devhubId ? [h('span', { class: 'dim' }, '·'), h('span', { class: 'chip', title: 'Surface du DevHub' }, `DevHub · ${feature.devhubId}`)] : null,
      h('span', { style: { marginLeft: 'auto' }, class: 'hint' }, `modifiée ${relTime(feature.updatedAt)} par ${feature.updatedBy?.login || '—'}`)),

    ro ? h('div', { class: 'readonly-bar fpage-ro' }, icon('warn'), h('span', { style: { flex: 1 } }, 'Lecture seule : connecte ton token GitHub pour modifier cette fiche.'),
      h('button', { type: 'button', onClick: () => ctx.openSettings() }, 'Se connecter')) : null,

    h('header', { class: 'fpage-head' },
      h('div', { class: 'drawer-icon fpage-icon' }, h('input', { 'aria-label': 'Icône', value: feature.icon || '', maxlength: 4, placeholder: '✦', disabled: ro, onChange: (e) => patch({ icon: e.target.value.trim() }) })),
      h('div', { class: 'fpage-title' },
        h('input', { class: 'input input-title fpage-title-input', value: feature.title, 'aria-label': 'Titre', disabled: ro, dataset: { key: `title:${feature.id}` },
          onChange: (e) => { if (e.target.value.trim()) patch({ title: e.target.value.trim() }, `a renommé « ${feature.title} » en « ${e.target.value.trim()} »`); else e.target.value = feature.title; } }),
        h('div', { class: 'drawer-meta' },
          pillSelect(FAMILIES, feature.family, ro, (v) => patch({ family: v, familyLabel: FAMILIES.find((f) => f.id === v)?.label || '' })),
          pillSelect(PRIORITIES, feature.priority, ro, (v) => patch({ priority: v })),
          pillSelect([{ id: '', label: 'Sans version' }, ...doc.releases.map((r) => ({ id: r.id, label: `${r.version}${r.name ? ` · ${r.name}` : ''}` }))], feature.releaseId, ro, (v) => patch({ releaseId: v }, `a rattaché « ${feature.title} » à une version`)),
          h('div', { class: 'toggle-row', style: { marginLeft: '4px' } }, PLATFORMS.map((p) => h('button', {
            type: 'button', class: 'toggle toggle-xs', 'aria-pressed': feature.platforms.includes(p.id) ? 'true' : 'false', disabled: ro,
            onClick: () => patch({ platforms: feature.platforms.includes(p.id) ? feature.platforms.filter((x) => x !== p.id) : [...feature.platforms, p.id] }),
          }, p.label)))))),

    h('section', { class: 'fpage-hero glass' },
      h('div', { class: 'fpage-hero-left' },
        bigGauge(doc, feature),
        h('div', { class: 'fpage-hero-facts' },
          fact('Prod test', feature.dates.prodTestActual ? `fait le ${fmtDay(feature.dates.prodTestActual)}` : feature.dates.prodTestPlanned ? `cible ${fmtDay(feature.dates.prodTestPlanned)}` : 'pas de date', late.prodTest),
          fact('Prod final', feature.dates.prodFinalActual ? `livré le ${fmtDay(feature.dates.prodFinalActual)}` : feature.dates.prodFinalPlanned ? `cible ${fmtDay(feature.dates.prodFinalPlanned)}` : 'pas de date', late.prodFinal),
          fact('Dernier test', lastVerdict(feature) ? `${lastVerdict(feature).verdict.toUpperCase()} · ${fmtDay(lastVerdict(feature).at)}` : 'aucun'),
          fact('Version', release ? `${release.version}${release.plannedAt ? ` · ${fmtDay(release.plannedAt)}` : ''}` : 'aucune'))),
      h('div', { class: 'fpage-hero-right' },
        stageStepper(doc, feature, (id) => ctx.move(feature.id, id)),
        feature.stageId !== doc.gates.finalStageId ? h('div', { class: 'field', style: { marginTop: '16px' } },
          h('label', { for: 'step-range' }, `Avancement dans l’étape · ${feature.stepProgress || 0} %`),
          h('input', { id: 'step-range', class: 'range', type: 'range', min: 0, max: 100, step: 5, value: feature.stepProgress || 0, disabled: ro,
            onInput: (e) => { e.target.previousSibling.textContent = `Avancement dans l’étape · ${e.target.value} %`; },
            onChange: (e) => patch({ stepProgress: Number(e.target.value) }, `a réglé l’avancement de « ${feature.title} » à ${e.target.value} %`) })) : null,
        nextStage && !ro ? h('div', { class: 'fpage-next' },
          h('button', { type: 'button', class: 'btn btn-cta', onClick: () => ctx.move(feature.id, nextStage.id) }, `Passer en ${nextStage.label}`, icon('arrow')),
          !gate.ok ? h('span', { class: 'hint' }, gate.reason) : null) : null)),

    renderChecklist(ctx, feature, ro),

    h('div', { class: 'fpage-cols' },
      h('div', { class: 'fpage-main' },
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Description')),
          h('textarea', { class: 'textarea fpage-desc', placeholder: 'Intention, périmètre, ce qui reste à trancher…', disabled: ro, dataset: { key: `desc:${feature.id}` }, onChange: (e) => patch({ description: e.target.value }) }, feature.description)),
        renderTests(ctx, feature, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Historique complet')),
          renderJournal(ctx, { featureId: feature.id, limit: 200, compact: true }))),
      h('aside', { class: 'fpage-side' },
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Temporalité')),
          h('div', { class: 'milestones' },
            milestone(ctx, feature, { key: 'prodTest', label: 'Prod test', hint: 'build de test (TestFlight / interne)' }),
            milestone(ctx, feature, { key: 'prodFinal', label: 'Prod final', hint: release?.plannedAt ? `version ${release.version} prévue le ${fmtDay(release.plannedAt)}` : 'sortie store' })),
          release?.plannedAt && !ro && feature.dates.prodFinalPlanned !== release.plannedAt ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', style: { marginTop: '8px' }, onClick: () => patch({ dates: { prodFinalPlanned: release.plannedAt } }, `a aligné la cible prod de « ${feature.title} » sur la version ${release.version}`) }, icon('flag'), `Aligner la cible sur la version ${release.version}`) : null,
          renderTimeline(ctx, feature, t)),
        renderLinks(ctx, feature, ro),
        h('section', { class: 'panel glass' },
          h('div', { class: 'section-head' }, h('h3', {}, 'Personnes')),
          person('Créée par', feature.createdBy, feature.createdAt),
          person('Dernière modification', feature.updatedBy, feature.updatedAt),
          testers(feature)),
        ro ? null : h('section', { class: 'panel glass', style: { display: 'flex', justifyContent: 'flex-end' } },
          h('button', { type: 'button', class: 'btn btn-danger btn-sm', onClick: () => {
            if (confirm(`Supprimer « ${feature.title} » ? Cette action est journalisée.`)) {
              if (ctx.act(`a supprimé « ${feature.title} »`, (d) => deleteFeature(d, feature.id, ctx.meta()))) ctx.closeFeature();
            }
          } }, icon('trash'), 'Supprimer la feature')))));
}

function fact(label, value, late = false) {
  return h('div', { class: 'fact' }, h('span', { class: 'fact-label' }, label), h('b', { class: late ? 'is-late' : '' }, value, late ? ' · retard' : ''));
}

function person(label, who, at) {
  return h('div', { class: 'person' }, avatar(who, 26), h('div', {}, h('div', { class: 'muted', style: { fontSize: '12px' } }, label), h('b', {}, who?.login || '—'), h('span', { class: 'dim' }, at ? ` · ${fmtDayFull(at)}` : '')));
}

function testers(feature) {
  const seen = new Map();
  for (const s of feature.tests) if (s.by?.login && !seen.has(s.by.login)) seen.set(s.by.login, s.by);
  if (!seen.size) return null;
  return h('div', { class: 'person' }, h('span', { class: 'avatar-stack' }, [...seen.values()].map((u) => avatar(u, 26))),
    h('div', {}, h('div', { class: 'muted', style: { fontSize: '12px' } }, 'Testeurs'), h('b', {}, [...seen.keys()].join(', '))));
}

const KIND = {
  create: { label: 'Création', color: '#8b97ad' }, move: { label: 'Étape', color: '#4f8cff' }, test: { label: 'Test', color: '#22d3ee' },
  prodTest: { label: 'Prod test', color: '#f59e0b' }, prodFinal: { label: 'Prod final', color: '#b5f03a' },
};

function renderTimeline(ctx, feature, t) {
  const events = featureTimeline(ctx.doc, feature, t);
  if (!events.length) return null;
  let todayInserted = false;
  const rows = [];
  for (const e of events) {
    if (!todayInserted && e.day > t) { rows.push(h('li', { class: 'tl-today' }, h('span', { class: 'tl-dot' }), h('span', {}, 'aujourd’hui'))); todayInserted = true; }
    const k = KIND[e.kind] || KIND.move;
    rows.push(h('li', { class: `tl-item${e.future ? ' is-future' : ''}${e.late ? ' is-late' : ''}`, style: { '--tl': k.color } },
      h('span', { class: 'tl-dot' }),
      h('div', { class: 'tl-body' },
        h('div', { class: 'tl-when' }, fmtDay(e.day), e.late ? h('span', { class: 'badge badge-late', style: { marginLeft: '6px' } }, 'dépassé') : null),
        h('div', { class: 'tl-text' }, e.by ? [h('b', {}, e.by.login), ' '] : null, e.text))));
  }
  if (!todayInserted) rows.push(h('li', { class: 'tl-today' }, h('span', { class: 'tl-dot' }), h('span', {}, 'aujourd’hui')));
  return h('div', { style: { marginTop: '18px' } }, h('div', { class: 'section-head' }, h('h3', {}, 'Frise')), h('ul', { class: 'tl' }, rows));
}
