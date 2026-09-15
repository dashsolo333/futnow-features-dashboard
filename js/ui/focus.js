// Mode « Avancement » : une feature à la fois, plein écran, centré sur la jauge.
import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { ringGauge } from './gauge.js';
import { gaugeOf, stageById, stageIndex } from '../model/stages.js';
import { isLate, lastVerdict, checklistProgress } from '../model/features.js';
import { visibleFeatures } from './filters.js';

// Descriptions dépliées (par id) : survit au re-rendu, pas au rechargement.
const expandedDesc = new Set();

export function focusList(ctx) {
  return [...visibleFeatures(ctx.doc, ctx.filters)].sort((a, b) => {
    const ga = gaugeOf(ctx.doc, a); const gb = gaugeOf(ctx.doc, b);
    return gb - ga || String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
}

export function renderFocus(ctx) {
  const doc = ctx.doc;
  const list = focusList(ctx);
  if (!list.length) return h('div', { class: 'empty' }, h('b', {}, 'Aucune feature'), 'Change les filtres.');
  let i = list.findIndex((f) => f.id === ctx.focusId);
  if (i < 0) i = 0;
  const f = list[i];
  const stage = stageById(doc, f.stageId);
  const idx = stageIndex(doc, f.stageId);
  const value = gaugeOf(doc, f);
  const t = today();
  const late = isLate(f, t);
  const last = lastVerdict(f);
  const { done, total } = checklistProgress(f);
  const release = doc.releases.find((r) => r.id === f.releaseId);
  const go = (n) => ctx.setFocus(list[(i + n + list.length) % list.length].id);

  return h('section', { class: 'focus', style: { '--fc': stage?.color || '#8b97ad' } },
    h('div', { class: 'focus-glow' }),
    h('header', { class: 'focus-top' },
      h('span', { class: 'muted' }, `${i + 1} / ${list.length}`),
      h('span', { class: 'dim' }, '·'),
      h('span', { class: 'muted' }, f.familyLabel || f.family),
      release ? [h('span', { class: 'dim' }, '·'), h('span', { class: 'chip' }, release.version)] : null,
      h('div', { style: { marginLeft: 'auto', display: 'flex', gap: '8px' } },
        h('button', { type: 'button', class: 'btn btn-sm', title: 'Ouvrir la fiche (Entrée)', onClick: () => ctx.openFeature(f.id) }, 'Ouvrir la fiche'),
        h('button', { type: 'button', class: 'btn btn-sm btn-icon', title: 'Plein écran (f)', 'aria-label': 'Plein écran', onClick: toggleFullscreen }, icon('expand')))),

    h('div', { class: 'focus-body' },
      h('div', { class: 'focus-ring' }, ringGauge(doc, f, 260),
        h('div', { class: 'focus-ring-center' }, h('div', { class: 'focus-value' }, value, h('span', {}, '%')), h('div', { class: 'focus-stage' }, stage?.label || '—'))),
      h('div', { class: 'focus-info' },
        h('h1', { class: 'focus-title' }, f.icon ? h('span', { class: 'focus-icon' }, f.icon) : null, f.title),
        f.description ? renderDesc(ctx, f) : null,
        h('ol', { class: 'focus-steps' }, doc.stages.map((s, k) => h('li', {
          class: `focus-step${k < idx ? ' is-done' : ''}${k === idx ? ' is-current' : ''}`, style: { '--sc': s.color },
        }, h('span', { class: 'focus-step-bar' }), h('span', { class: 'focus-step-label' }, s.label)))),
        h('div', { class: 'focus-facts' },
          fact('Prod test', f.dates.prodTestActual ? `fait le ${fmtDay(f.dates.prodTestActual)}` : f.dates.prodTestPlanned ? `cible ${fmtDay(f.dates.prodTestPlanned)}` : '—', late.prodTest ? 'late' : f.dates.prodTestActual ? 'done' : ''),
          fact('Prod final', f.dates.prodFinalActual ? `livré le ${fmtDay(f.dates.prodFinalActual)}` : f.dates.prodFinalPlanned ? `cible ${fmtDay(f.dates.prodFinalPlanned)}` : '—', late.prodFinal ? 'late' : f.dates.prodFinalActual ? 'done' : ''),
          fact('Dernier test', last ? `${last.verdict.toUpperCase()} · ${fmtDay(last.at)}` : 'aucun', last ? (last.verdict === 'ok' ? 'done' : 'late') : ''),
          fact('Checklist', total ? `${done} / ${total}` : '—', total && done === total ? 'done' : ''),
          fact('Étape', f.stepProgress ? `${f.stepProgress} % dans l’étape` : `${idx + 1} / ${doc.stages.length}`),
          h('div', { class: 'fact' }, h('span', { class: 'fact-label' }, 'Dernière action'), h('b', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, avatar(f.updatedBy, 18), `${f.updatedBy?.login || '—'} · ${relTime(f.updatedAt)}`))))),

    h('footer', { class: 'focus-nav' },
      h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Précédente', onClick: () => go(-1) }, icon('left')),
      h('div', { class: 'focus-dots' }, list.map((x, k) => h('button', {
        type: 'button', class: `focus-dot${k === i ? ' is-current' : ''}`, title: x.title, 'aria-label': x.title,
        style: { '--sc': stageById(doc, x.stageId)?.color }, onClick: () => ctx.setFocus(x.id),
      }))),
      h('button', { type: 'button', class: 'btn btn-icon', 'aria-label': 'Suivante', onClick: () => go(1) }, icon('right'))));
}

/** Une ligne tronquée par défaut ; clic (ou Entrée/Espace dessus) pour déplier. */
function renderDesc(ctx, f) {
  const open = expandedDesc.has(f.id);
  const toggle = () => { if (open) expandedDesc.delete(f.id); else expandedDesc.add(f.id); ctx.setFocus(f.id); };
  return h('p', { class: `focus-desc${open ? ' is-open' : ''}`, role: 'button', tabindex: 0, title: open ? 'Replier' : 'Déplier',
    'aria-expanded': open ? 'true' : 'false', onClick: toggle,
    onKeydown: (e) => { if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggle(); } } },
  open ? f.description : f.description.replace(/\s*\n+\s*/g, ' · '));
}

function fact(label, value, tone = '') {
  return h('div', { class: `fact${tone ? ` is-${tone}` : ''}` }, h('span', { class: 'fact-label' }, label), h('b', {}, value));
}

export function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.();
}
