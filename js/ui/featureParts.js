// Pièces partagées de la page feature : champs, liens, sessions de test.
import { h, icon, avatar, fmtDay } from './dom.js';
import { PLATFORMS, newId } from '../model/doc.js';
import { updateFeature, addTestSession, removeTestSession } from '../model/features.js';

export function isSafeUrl(url) {
  try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; }
}

export function pillSelect(options, value, disabled, onChange) {
  return h('select', { class: 'select select-pill-sm', disabled, onChange: (e) => onChange(e.target.value) },
    options.map((o) => h('option', { value: o.id, selected: o.id === value }, o.label)));
}

export function dateField(label, value, disabled, onChange, late = false) {
  return h('div', { class: 'field' },
    h('label', {}, label, late ? h('span', { class: 'badge badge-late', style: { marginLeft: '6px' } }, 'retard') : null),
    h('input', { class: 'input', type: 'date', value: value || '', disabled, onChange: (e) => onChange(e.target.value) }));
}

export function addLink(ctx, feature) {
  const url = prompt('URL du lien (PR, Figma, doc…)');
  if (!url) return;
  if (!isSafeUrl(url)) { ctx.toast('Lien refusé : il faut une URL http(s).', { kind: 'error' }); return; }
  let label = '';
  try { const u = new URL(url); label = u.hostname.replace('www.', '') + u.pathname.slice(0, 40); } catch { label = url; }
  const custom = prompt('Libellé', label);
  ctx.act(`a ajouté un lien à « ${feature.title} »`, (d) => updateFeature(d, feature.id, { links: [...feature.links, { label: custom || label, url }] }, ctx.meta()));
}

export function renderLinks(ctx, feature, ro) {
  const patch = (p) => ctx.act(`a modifié les liens de « ${feature.title} »`, (d) => updateFeature(d, feature.id, p, ctx.meta()));
  return h('section', { class: 'panel glass' },
    h('div', { class: 'section-head' }, h('h3', {}, 'Liens'), ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => addLink(ctx, feature) }, icon('plus'), 'Lien')),
    h('div', { class: 'link-list' }, feature.links.length ? feature.links.map((l, i) => h('div', { class: 'link-item' },
      icon('link'),
      isSafeUrl(l.url) ? h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label || l.url) : h('span', { class: 'dim' }, l.label || l.url),
      ro ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => patch({ links: feature.links.filter((_, j) => j !== i) }) }, icon('close'))))
      : h('span', { class: 'dim' }, 'Aucun lien (PR, Figma, doc…)')));
}

export function renderTests(ctx, feature, ro) {
  const form = { platform: 'ios', verdict: 'ok' };
  const tests = [...feature.tests].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  let notesEl; let buildEl;
  const pressGroup = (btns) => (e) => btns.forEach((b) => b.setAttribute('aria-pressed', b === e.currentTarget ? 'true' : 'false'));
  const platformBtns = PLATFORMS.map((p) => h('button', { type: 'button', class: 'toggle', 'aria-pressed': p.id === form.platform ? 'true' : 'false',
    onClick: (e) => { form.platform = p.id; pressGroup(platformBtns)(e); } }, p.label));
  const verdictBtns = [['ok', 'OK ✓'], ['ko', 'KO ✗']].map(([v, label]) => h('button', { type: 'button', class: `toggle toggle-${v}`, 'aria-pressed': v === form.verdict ? 'true' : 'false',
    onClick: (e) => { form.verdict = v; pressGroup(verdictBtns)(e); } }, label));
  return h('section', { class: 'panel glass' },
    h('div', { class: 'section-head' }, h('h3', {}, `Sessions de test · ${tests.length}`), h('span', { class: 'hint' }, 'le dernier verdict OK débloque la prod final')),
    h('div', { class: 'test-list' }, tests.length ? tests.map((s) => h('div', { class: 'test-item' },
      h('span', { class: `badge badge-${s.verdict}` }, s.verdict.toUpperCase()),
      h('div', {}, h('b', {}, PLATFORMS.find((p) => p.id === s.platform)?.label || s.platform), s.build ? h('span', { class: 'muted' }, ` · build ${s.build}`) : null,
        h('span', { class: 'test-when' }, ` · ${fmtDay(s.at)} · `), avatar(s.by, 16), h('span', { class: 'muted' }, ` ${s.by?.login || ''}`)),
      ro ? h('span') : h('button', { type: 'button', class: 'btn btn-ghost btn-sm btn-icon', 'aria-label': 'Retirer', onClick: () => ctx.act(`a retiré un test de « ${feature.title} »`, (d) => removeTestSession(d, feature.id, s.id, ctx.meta())) }, icon('close')),
      s.notes ? h('p', {}, s.notes) : null)) : h('span', { class: 'dim' }, 'Aucun test enregistré.')),
    ro ? null : h('form', { class: 'test-form', style: { marginTop: '14px' }, onSubmit: (e) => {
      e.preventDefault();
      const ok = ctx.act(`a testé « ${feature.title} »`, (d) => addTestSession(d, feature.id, { id: newId('t'), platform: form.platform, verdict: form.verdict, notes: notesEl.value.trim(), build: buildEl.value.trim(), ...ctx.meta() }));
      if (ok) { notesEl.value = ''; }
    } },
    h('div', { class: 'grid-2' },
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Plateforme'), h('div', { class: 'toggle-row' }, platformBtns)),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Verdict'), h('div', { class: 'toggle-row' }, verdictBtns))),
    h('div', { class: 'grid-2' },
      h('div', { class: 'field' }, h('label', { for: 'test-build' }, 'Build / version testée'), buildEl = h('input', { id: 'test-build', class: 'input', placeholder: '1.7.0 (42), TestFlight…' })),
      h('div', { class: 'field' }, h('label', { for: 'test-notes' }, 'Notes & feedback'), notesEl = h('textarea', { id: 'test-notes', class: 'textarea', placeholder: 'Ce qui marche, ce qui casse, sur quel appareil…', style: { minHeight: '38px' } }))),
    h('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, h('button', { type: 'submit', class: 'btn btn-cta btn-sm' }, icon('check'), 'Enregistrer le test'))));
}
