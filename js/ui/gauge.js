import { h, svg } from './dom.js';
import { gaugeOf, stageIndex, stageById } from '../model/stages.js';

/** Anneau de progression, couleur de l'étape courante. */
export function ringGauge(doc, feature, size = 44) {
  const value = gaugeOf(doc, feature);
  const stage = stageById(doc, feature.stageId);
  const color = stage?.color || '#8b97ad';
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const el = svg('svg', { class: 'ring', viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': `${value} %` },
    svg('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-track' }),
    svg('circle', { cx: size / 2, cy: size / 2, r, class: 'ring-value', stroke: color, 'stroke-dasharray': `${dash} ${c - dash}`, transform: `rotate(-90 ${size / 2} ${size / 2})` }),
    svg('text', { x: '50%', y: '50%', class: 'ring-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, value === 100 ? '✓' : `${value}`));
  el.style.setProperty('--ring-glow', color);
  return el;
}

/** Barre segmentée : un segment par étape, remplis jusqu'à l'étape courante. */
export function stageBar(doc, feature) {
  const idx = stageIndex(doc, feature.stageId);
  return h('div', { class: 'stagebar', role: 'img', 'aria-label': `Étape ${idx + 1} sur ${doc.stages.length}` },
    doc.stages.map((s, i) => h('span', {
      class: `stagebar-seg${i < idx ? ' is-done' : ''}${i === idx ? ' is-current' : ''}`,
      style: i <= idx ? { background: s.color } : null,
      title: s.label,
    })));
}

/** Stepper cliquable du tiroir. */
export function stageStepper(doc, feature, onPick) {
  const idx = stageIndex(doc, feature.stageId);
  return h('ol', { class: 'stepper' },
    doc.stages.map((s, i) => h('li', {
      class: `step${i < idx ? ' is-done' : ''}${i === idx ? ' is-current' : ''}`,
      style: { '--step-color': s.color },
    },
    h('button', { type: 'button', class: 'step-btn', onClick: () => onPick(s.id), 'aria-current': i === idx ? 'step' : null },
      h('span', { class: 'step-dot' }),
      h('span', { class: 'step-label' }, s.label)))));
}

export function bigGauge(doc, feature) {
  const value = gaugeOf(doc, feature);
  const stage = stageById(doc, feature.stageId);
  return h('div', { class: 'biggauge' },
    ringGauge(doc, feature, 92),
    h('div', { class: 'biggauge-text' },
      h('div', { class: 'biggauge-value' }, `${value}`, h('span', {}, '%')),
      h('div', { class: 'biggauge-stage', style: { color: stage?.color } }, stage?.label || '—')));
}
