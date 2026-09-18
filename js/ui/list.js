import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { PRIORITIES } from '../model/doc.js';
import { gaugeOf, stageById } from '../model/stages.js';
import { isLate, byRank, checklistProgress } from '../model/features.js';
import { verdictBadge, bugBadge } from './card.js';
import { visibleFeatures } from './filters.js';

const COLS = [
  { id: 'manual', label: '', title: 'Ordre manuel (glisse les lignes)', get: null },
  { id: 'title', label: 'Feature', get: (f) => f.title.toLowerCase() },
  { id: 'stage', label: 'Étape', get: (f, doc) => doc.stages.findIndex((s) => s.id === f.stageId) },
  { id: 'status', label: 'Dernier statut', get: (f) => (f.status ? f.statusAt || f.updatedAt : '') },
  { id: 'gauge', label: 'Avancement', get: (f, doc) => gaugeOf(doc, f) },
  { id: 'tasks', label: 'Checklist', get: (f) => { const p = checklistProgress(f); return p.total ? p.done / p.total : -1; } },
  { id: 'test', label: 'Prod test', get: (f) => f.dates.prodTestActual || f.dates.prodTestPlanned || '9999' },
  { id: 'prod', label: 'Prod final', get: (f) => f.dates.prodFinalActual || f.dates.prodFinalPlanned || '9999' },
  { id: 'verdict', label: 'Dernier test', get: (f) => (f.tests.at(-1)?.verdict || 'zz') },
  { id: 'release', label: 'Version', get: (f, doc) => doc.releases.find((r) => r.id === f.releaseId)?.version || 'zz' },
  { id: 'updated', label: 'Mis à jour', get: (f) => f.updatedAt },
];

export function renderList(ctx) {
  const doc = ctx.doc;
  const sort = ctx.sort || { col: 'stage', dir: -1 };
  const col = COLS.find((c) => c.id === sort.col) || COLS.find((c) => c.id === 'stage');
  const manual = col.id === 'manual';
  const feats = [...visibleFeatures(doc, ctx.filters)].sort(manual ? byRank : (a, b) => {
    const va = col.get(a, doc); const vb = col.get(b, doc);
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
  });
  const t = today();
  const sel = ctx.selection;
  const canSelect = ctx.canWrite();
  const allSelected = feats.length > 0 && feats.every((f) => sel.has(f.id));
  const someSelected = feats.some((f) => sel.has(f.id));
  const selectAll = h('input', { type: 'checkbox', class: 'check', 'aria-label': 'Tout sélectionner', checked: allSelected, disabled: !canSelect,
    onChange: (e) => ctx.setSelection(e.target.checked ? feats.map((f) => f.id) : []) });
  selectAll.indeterminate = someSelected && !allSelected;
  return h('div', {},
    sel.size ? renderBulkBar(ctx, feats) : null,
    h('div', { class: 'table-wrap glass' },
    h('table', { class: 'table' },
      h('thead', {}, h('tr', {}, h('th', { class: 'th-check', 'aria-label': 'Sélection' }, selectAll), COLS.map((c) => h('th', {
        scope: 'col', class: c.id === 'manual' ? 'th-handle' : null, title: c.title || null,
        'aria-sort': sort.col === c.id ? (c.id === 'manual' ? 'other' : sort.dir > 0 ? 'ascending' : 'descending') : null,
        onClick: () => ctx.setSort({ col: c.id, dir: c.id === 'manual' ? 1 : sort.col === c.id ? -sort.dir : 1 }),
      }, c.id === 'manual' ? icon('grip') : [c.label, sort.col === c.id ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''])))),
      h('tbody', {}, feats.map((f) => {
        const stage = stageById(doc, f.stageId);
        const g = gaugeOf(doc, f);
        const late = isLate(f, t);
        const selected = sel.has(f.id);
        const tr = h('tr', { class: selected ? 'is-selected' : '', dataset: { id: f.id },
          onDragstart: (e) => { e.dataTransfer.setData('text/plain', `row:${f.id}`); e.dataTransfer.effectAllowed = 'move'; tr.classList.add('is-dragging'); },
          onDragend: () => { tr.classList.remove('is-dragging'); tr.draggable = false; clearDropMarks(tr.parentElement); },
          onDragover: (e) => { if (!canSelect || !e.dataTransfer.types.includes('text/plain')) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; markDrop(tr, e); },
          onDragleave: () => tr.classList.remove('is-drop-before', 'is-drop-after'),
          onDrop: (e) => { e.preventDefault(); const raw = e.dataTransfer.getData('text/plain'); if (!raw.startsWith('row:')) return; dropRow(ctx, feats, raw.slice(4), f.id, tr.classList.contains('is-drop-before')); clearDropMarks(tr.parentElement); },
          onClick: (e) => { if (e.shiftKey && canSelect) { e.preventDefault(); ctx.toggleSelect(f.id); } else ctx.openFeature(f.id); }, tabindex: 0,
          onKeydown: (e) => { if (e.key === 'Enter') ctx.openFeature(f.id); if (e.key === ' ' && canSelect) { e.preventDefault(); ctx.toggleSelect(f.id); } } },
          h('td', { class: 'td-check', onClick: (e) => e.stopPropagation() },
            h('input', { type: 'checkbox', class: 'check', 'aria-label': `Sélectionner ${f.title}`, checked: selected, disabled: !canSelect, onChange: (e) => ctx.toggleSelect(f.id, e.target.checked) })),
          h('td', { class: 'td-handle', onClick: (e) => e.stopPropagation() },
            canSelect ? h('span', { class: 'drag-handle', title: 'Glisser pour changer l’ordre', 'aria-label': 'Réordonner',
              onPointerdown: () => { tr.draggable = true; }, onPointerup: () => { tr.draggable = false; } }, icon('grip')) : null),
          h('td', {}, h('div', { class: 'cell-title' },
            h('span', { class: 'cell-title-icon' }, f.icon || ''),
            h('div', { class: 'cell-title-text', title: f.title }, h('b', {}, f.title), h('small', {}, f.familyLabel || f.family || '—')),
            f.priority === 'p0' || f.priority === 'p1' ? h('span', { class: 'badge badge-soon', title: 'Priorité' }, f.priority === 'p0' ? 'Critique' : 'Haute') : null)),
          h('td', {}, h('span', { class: 'chip chip-stage', style: { '--dot': stage?.color } }, h('i', { class: 'chip-dot' }), stage?.label)),
          h('td', {}, statusCell(f)),
          h('td', {}, h('div', { class: 'cell-gauge' }, h('div', { class: 'bar', style: { '--bar': stage?.color } }, h('i', { style: { width: `${g}%` } })), h('b', {}, `${g} %`))),
          h('td', {}, tasksCell(checklistProgress(f))),
          h('td', {}, dateCell(f.dates.prodTestPlanned, f.dates.prodTestActual, late.prodTest)),
          h('td', {}, dateCell(f.dates.prodFinalPlanned, f.dates.prodFinalActual, late.prodFinal)),
          h('td', {}, verdictBadge(f) || h('span', { class: 'dim' }, '—')),
          h('td', { class: 'muted' }, doc.releases.find((r) => r.id === f.releaseId)?.version || '—'),
          h('td', {}, h('div', { class: 'td-updated' }, avatar(f.updatedBy, 20), h('span', { class: 'muted' }, relTime(f.updatedAt)))));
        return tr;
      })),
    ),
    !feats.length ? h('div', { class: 'empty' }, h('b', {}, 'Aucune feature'), 'Change les filtres ou crée une feature.') : null),
    canSelect && !sel.size ? h('p', { class: 'hint', style: { marginTop: '10px' } }, 'Coche des features (ou Maj + clic sur une ligne) pour changer leur étape, leur version ou leur priorité d’un coup, ou les supprimer. Glisse une ligne par sa poignée pour fixer l’ordre de la liste.') : null);
}

function renderBulkBar(ctx, feats) {
  const doc = ctx.doc;
  const ids = [...ctx.selection].filter((id) => doc.features.some((f) => f.id === id));
  const n = ids.length;
  const pick = (label, options, onPick) => h('select', { class: 'select select-pill', 'aria-label': label, onChange: (e) => { if (e.target.value) onPick(e.target.value); e.target.value = ''; } },
    h('option', { value: '' }, label), options.map((o) => h('option', { value: o.id }, o.label)));
  return h('div', { class: 'bulkbar glass', role: 'toolbar', 'aria-label': 'Actions groupées' },
    h('b', { class: 'bulkbar-count' }, `${n} sélectionnée${n > 1 ? 's' : ''}`),
    pick('Passer à l’étape…', doc.stages, (v) => ctx.bulkMove(ids, v)),
    pick('Version…', [{ id: '__none', label: 'Sans version' }, ...doc.releases.map((r) => ({ id: r.id, label: r.version }))], (v) => ctx.bulkUpdate(ids, { releaseId: v === '__none' ? '' : v }, 'la version')),
    pick('Priorité…', PRIORITIES, (v) => ctx.bulkUpdate(ids, { priority: v }, 'la priorité')),
    h('button', { type: 'button', class: 'btn btn-sm btn-danger', onClick: () => ctx.bulkDelete(ids) }, icon('trash'), 'Supprimer'),
    h('button', { type: 'button', class: 'btn btn-sm btn-ghost', style: { marginLeft: 'auto' }, onClick: ctx.clearSelection }, 'Tout désélectionner', h('span', { class: 'dim' }, ' · Échap')),
    feats.length > n ? h('button', { type: 'button', class: 'btn btn-sm btn-ghost', onClick: () => ctx.setSelection(feats.map((f) => f.id)) }, `Sélectionner les ${feats.length} visibles`) : null);
}

/** Dernier statut libre : le texte, puis quand et par qui. */
function statusCell(f) {
  if (!f.status) return h('span', { class: 'dim' }, '—');
  const at = f.statusAt || f.updatedAt;
  const by = f.statusBy || f.updatedBy;
  return h('div', { class: 'cell-status', title: f.status },
    h('span', { class: 'cell-status-text' }, f.status),
    h('small', {}, at ? relTime(at) : '', by?.login ? ` · ${by.login}` : ''));
}

function tasksCell({ done, total, bugs }) {
  if (!total) return h('span', { class: 'dim' }, '—');
  const pct = Math.round((done / total) * 100);
  return h('div', { class: 'cell-tasks', title: `${done} tâche${done > 1 ? 's' : ''} faite${done > 1 ? 's' : ''} sur ${total}` },
    h('b', { class: done === total ? 'is-done' : '' }, `${done}/${total}`),
    h('div', { class: 'bar bar-tasks' }, h('i', { style: { width: `${pct}%` } })),
    bugs ? bugBadge(bugs) : null);
}

function dateCell(planned, actual, late) {
  if (!planned && !actual) return h('span', { class: 'dim' }, '—');
  return h('div', { class: 'cell-dates' },
    actual ? h('span', { style: { color: '#6fe3a0' } }, `✓ ${fmtDay(actual)}`) : null,
    planned ? h('span', { class: late ? 'badge badge-late' : 'muted' }, `${actual ? 'cible ' : ''}${fmtDay(planned)}${late ? ' · retard' : ''}`) : null);
}

// ---------- Glisser-déposer des lignes ----------
function markDrop(tr, e) {
  const r = tr.getBoundingClientRect();
  const before = e.clientY < r.top + r.height / 2;
  tr.classList.toggle('is-drop-before', before);
  tr.classList.toggle('is-drop-after', !before);
}
function clearDropMarks(tbody) {
  if (!tbody) return;
  for (const row of tbody.querySelectorAll('.is-drop-before, .is-drop-after')) row.classList.remove('is-drop-before', 'is-drop-after');
}
/** Recompose l'ordre des lignes visibles avec `movedId` placé avant ou après `targetId`. */
function dropRow(ctx, feats, movedId, targetId, before) {
  if (movedId === targetId) return;
  const ids = feats.map((f) => f.id).filter((id) => id !== movedId);
  const at = ids.indexOf(targetId);
  if (at < 0) return;
  ids.splice(before ? at : at + 1, 0, movedId);
  ctx.reorder(ids);
}
