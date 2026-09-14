import { h } from './dom.js';
import { renderCard } from './card.js';
import { visibleFeatures } from './filters.js';

export function renderBoard(ctx) {
  const doc = ctx.doc;
  const feats = visibleFeatures(doc, ctx.filters);
  return h('div', { class: 'board' },
    doc.stages.map((stage) => {
      const items = feats.filter((f) => f.stageId === stage.id);
      const gate = stage.id === doc.gates.finalStageId ? 'test OK requis' : stage.id === doc.gates.testStageId ? 'garde test' : '';
      const col = h('section', {
        class: 'col', 'aria-label': stage.label,
        onDragover: (e) => { if (!ctx.canWrite()) return; e.preventDefault(); col.classList.add('is-over'); },
        onDragleave: () => col.classList.remove('is-over'),
        onDrop: (e) => { e.preventDefault(); col.classList.remove('is-over'); const id = e.dataTransfer.getData('text/plain'); if (id) ctx.move(id, stage.id); },
      },
      h('header', { class: 'col-head' },
        h('span', { class: 'col-dot', style: { background: stage.color, color: stage.color } }),
        h('h2', {}, stage.label),
        gate ? h('span', { class: 'col-gate' }, gate) : null,
        h('span', { class: 'col-count' }, items.length)),
      items.map((f) => renderCard(ctx, f)),
      !items.length ? h('div', { class: 'empty', style: { padding: '30px 10px' } }, 'Rien ici') : null);
      return col;
    }));
}
