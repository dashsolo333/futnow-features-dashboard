import { h, icon, avatar, fmtDay, relTime, today } from './dom.js';
import { bigGauge, stageStepper } from './gauge.js';
import { FAMILIES, PRIORITIES, PLATFORMS, newId } from '../model/doc.js';
import { updateFeature, addTestSession, removeTestSession, deleteFeature, isLate } from '../model/features.js';
import { renderJournal } from './journal.js';

export function renderDrawer(ctx, feature) {
  const doc = ctx.doc;
  const ro = !ctx.canWrite();
  const patch = (p, label) => ctx.act(label || `a modifié « ${feature.title} »`, (d) => updateFeature(d, feature.id, p, ctx.meta()));
  const late = isLate(feature, today());

  const drawer = h('aside', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': feature.title },
    h('div', { class: 'drawer-top' },
      h('div', { class: 'drawer-icon' }, h('input', { 'aria-label': 'Icône', value: feature.icon || '', maxlength: 4, placeholder: '✦', disabled: ro, onChange: (e) => patch({ icon: e.target.value.trim() }) })),
      h('div', { class: 'drawer-title' },
        h('input', { class: 'input input-title', value: feature.title, 'aria-label': 'Titre', disabled: ro, onChange: (e) => { if (e.target.value.trim()) patch({ title: e.target.value.trim() }); else e.target.value = feature.title; } }),
        h('div', { class: 'drawer-meta' },
          select(FAMILIES, feature.family, ro, (v) => patch({ family: v, familyLabel: FAMILIES.find((f) => f.id === v)?.label || '' })),
          select(PRIORITIES, feature.priority, ro, (v) => patch({ priority: v })),
          select([{ id: '', label: 'Sans version' }, ...doc.releases.map((r) => ({ id: r.id, label: `${r.version}${r.name ? ` · ${r.name}` : ''}` }))], feature.releaseId, ro, (v) => patch({ releaseId: v })),
          feature.devhubId ? h('span', { class: 'chip', title: 'Surface du DevHub' }, `DevHub · ${feature.devhubId}`) : null)),
      h('button', { type: 'button', class: 'btn btn-ghost btn-icon', 'aria-label': 'Fermer', onClick: ctx.closeDrawer }, icon('close'))),
    ro ? h('div', { class: 'readonly-bar', style: { margin: '16px 0 -8px', borderRadius: '12px', border: '1px solid rgba(245,158,11,.25)' } },
      icon('warn'), h('span', { style: { flex: 1 } }, 'Lecture seule : connecte ton token GitHub pour modifier cette fiche.'),
      h('button', { type: 'button', onClick: () => ctx.openSettings() }, 'Se connecter')) : null,

    h('section', { class: 'section' },
      bigGauge(doc, feature),
      h('div', { style: { marginTop: '18px' } }, stageStepper(doc, feature, (id) => ctx.move(feature.id, id))),
      feature.stageId !== doc.gates.finalStageId ? h('div', { class: 'field', style: { marginTop: '14px' } },
        h('label', { for: 'step-range' }, `Avancement dans l’étape · ${feature.stepProgress || 0} %`),
        h('input', { id: 'step-range', class: 'range', type: 'range', min: 0, max: 100, step: 5, value: feature.stepProgress || 0, disabled: ro,
          onInput: (e) => { e.target.previousSibling.textContent = `Avancement dans l’étape · ${e.target.value} %`; },
          onChange: (e) => patch({ stepProgress: Number(e.target.value) }, `a réglé l’avancement de « ${feature.title} » à ${e.target.value} %`) })) : null),

    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h3', {}, 'Temporalité'), h('span', { class: 'hint' }, 'dates cibles puis dates réelles')),
      h('div', { class: 'grid-4' },
        dateField('Prod test · cible', feature.dates.prodTestPlanned, ro, (v) => patch({ dates: { prodTestPlanned: v } }, `a planifié le prod test de « ${feature.title} » au ${fmtDay(v)}`), late.prodTest),
        dateField('Prod test · réel', feature.dates.prodTestActual, ro, (v) => patch({ dates: { prodTestActual: v } })),
        dateField('Prod final · cible', feature.dates.prodFinalPlanned, ro, (v) => patch({ dates: { prodFinalPlanned: v } }, `a planifié la prod de « ${feature.title} » au ${fmtDay(v)}`), late.prodFinal),
        dateField('Prod final · réel', feature.dates.prodFinalActual, ro, (v) => patch({ dates: { prodFinalActual: v } })))),

    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h3', {}, 'Plateformes')),
      h('div', { class: 'toggle-row' }, PLATFORMS.map((p) => h('button', {
        type: 'button', class: 'toggle', 'aria-pressed': feature.platforms.includes(p.id) ? 'true' : 'false', disabled: ro,
        onClick: () => patch({ platforms: feature.platforms.includes(p.id) ? feature.platforms.filter((x) => x !== p.id) : [...feature.platforms, p.id] }),
      }, p.label)))),

    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h3', {}, 'Description')),
      h('textarea', { class: 'textarea', placeholder: 'Intention, périmètre, ce qui reste à trancher…', disabled: ro, onChange: (e) => patch({ description: e.target.value }) }, feature.description)),

    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h3', {}, 'Liens'), ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => addLink(ctx, feature) }, icon('plus'), 'Lien')),
      h('div', { class: 'link-list' }, feature.links.length ? feature.links.map((l, i) => h('div', { class: 'link-item' },
        icon('link'), isSafeUrl(l.url) ? h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label || l.url) : h('span', { class: 'dim' }, l.label || l.url),
        ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => patch({ links: feature.links.filter((_, j) => j !== i) }) }, icon('close'))))
        : h('span', { class: 'dim' }, 'Aucun lien (PR, Figma, doc…)'))),

    renderTests(ctx, feature, ro),

    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('h3', {}, 'Historique')),
      renderJournal(ctx, { featureId: feature.id, limit: 12, compact: true }),
      h('p', { class: 'hint', style: { marginTop: '10px' } }, `Créée ${relTime(feature.createdAt)} par ${feature.createdBy?.login || '—'} · modifiée ${relTime(feature.updatedAt)} par ${feature.updatedBy?.login || '—'}`)),

    ro ? null : h('section', { class: 'section', style: { display: 'flex', justifyContent: 'flex-end' } },
      h('button', { type: 'button', class: 'btn btn-danger btn-sm', onClick: () => {
        if (confirm(`Supprimer « ${feature.title} » ? Cette action est journalisée.`)) {
          ctx.act(`a supprimé « ${feature.title} »`, (d) => deleteFeature(d, feature.id, ctx.meta()));
          ctx.closeDrawer();
        }
      } }, icon('trash'), 'Supprimer la feature')));

  return h('div', { class: 'drawer-host' },
    h('div', { class: 'drawer-scrim', onClick: ctx.closeDrawer }),
    drawer);
}

function select(options, value, disabled, onChange) {
  return h('select', { class: 'select', style: { width: 'auto', minHeight: '28px', padding: '2px 28px 2px 10px', fontSize: '12.5px', borderRadius: '999px' }, disabled, onChange: (e) => onChange(e.target.value) },
    options.map((o) => h('option', { value: o.id, selected: o.id === value }, o.label)));
}

function dateField(label, value, disabled, onChange, late = false) {
  return h('div', { class: 'field' },
    h('label', {}, label, late ? h('span', { class: 'badge badge-late', style: { marginLeft: '6px' } }, 'retard') : null),
    h('input', { class: 'input', type: 'date', value: value || '', disabled, onChange: (e) => onChange(e.target.value) }));
}

export function isSafeUrl(url) {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
}

function addLink(ctx, feature) {
  const url = prompt('URL du lien (PR, Figma, doc…)');
  if (!url) return;
  if (!isSafeUrl(url)) { ctx.toast('Lien refusé : il faut une URL http(s).', { kind: 'error' }); return; }
  let label = '';
  try { label = new URL(url).hostname.replace('www.', '') + new URL(url).pathname.slice(0, 40); } catch { label = url; }
  const custom = prompt('Libellé', label);
  ctx.act(`a ajouté un lien à « ${feature.title} »`, (d) => updateFeature(d, feature.id, { links: [...feature.links, { label: custom || label, url }] }, ctx.meta()));
}

function renderTests(ctx, feature, ro) {
  const form = { platform: 'ios', verdict: 'ok', notes: '', build: '' };
  const tests = [...feature.tests].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  let notesEl; let buildEl;
  const platformBtns = PLATFORMS.map((p) => h('button', { type: 'button', class: 'toggle', 'aria-pressed': p.id === form.platform ? 'true' : 'false',
    onClick: (e) => { form.platform = p.id; platformBtns.forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); } }, p.label));
  const verdictBtns = [['ok', 'OK ✓'], ['ko', 'KO ✗']].map(([v, label]) => h('button', { type: 'button', class: `toggle toggle-${v}`, 'aria-pressed': v === form.verdict ? 'true' : 'false',
    onClick: (e) => { form.verdict = v; verdictBtns.forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false')); } }, label));
  return h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('h3', {}, `Sessions de test · ${tests.length}`), h('span', { class: 'hint' }, 'le dernier verdict OK débloque la prod final')),
    h('div', { class: 'test-list' }, tests.length ? tests.map((s) => h('div', { class: 'test-item' },
      h('span', { class: `badge badge-${s.verdict}` }, s.verdict.toUpperCase()),
      h('div', {}, h('b', {}, PLATFORMS.find((p) => p.id === s.platform)?.label || s.platform), s.build ? h('span', { class: 'muted' }, ` · build ${s.build}`) : null, h('span', { class: 'test-when' }, ` · ${fmtDay(s.at)} · `), avatar(s.by, 16), h('span', { class: 'muted' }, ` ${s.by?.login || ''}`)),
      ro ? h('span') : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => ctx.act(`a retiré un test de « ${feature.title} »`, (d) => removeTestSession(d, feature.id, s.id, ctx.meta())) }, icon('close')),
      s.notes ? h('p', {}, s.notes) : null)) : h('span', { class: 'dim' }, 'Aucun test enregistré.')),
    ro ? null : h('form', { class: 'test-form', style: { marginTop: '12px' }, onSubmit: (e) => {
      e.preventDefault();
      ctx.act(`a testé « ${feature.title} »`, (d) => addTestSession(d, feature.id, { id: newId('t'), platform: form.platform, verdict: form.verdict, notes: notesEl.value.trim(), build: buildEl.value.trim(), ...ctx.meta() }));
    } },
    h('div', { class: 'grid-2' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Plateforme'), h('div', { class: 'toggle-row' }, platformBtns)),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Verdict'), h('div', { class: 'toggle-row' }, verdictBtns))),
    h('div', { class: 'grid-2' },
      h('div', { class: 'field' }, h('label', { for: 'test-build' }, 'Build / version testée'), buildEl = h('input', { id: 'test-build', class: 'input', placeholder: '1.7.0 (42), TestFlight…' })),
      null),
    h('div', { class: 'field' }, h('label', { for: 'test-notes' }, 'Notes & feedback'), notesEl = h('textarea', { id: 'test-notes', class: 'textarea', placeholder: 'Ce qui marche, ce qui casse, sur quel appareil…', style: { minHeight: '70px' } })),
    h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h('button', { type: 'submit', class: 'btn btn-cta btn-sm' }, icon('check'), 'Enregistrer le test'))));
}
