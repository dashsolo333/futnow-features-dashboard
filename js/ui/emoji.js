// Sélecteur d'emoji pour l'icône d'une feature : un bouton qui montre l'emoji courant,
// une grille triée par thème, et un champ libre pour coller n'importe quel emoji.
import { h, icon } from './dom.js';

export const EMOJI_GROUPS = [
  { label: 'Produit & app', items: ['📱', '💻', '🧭', '🗺️', '📡', '🔔', '💬', '🧵', '📊', '📈', '🎨', '🖼️', '🎬', '📸', '🎥', '🔗', '🧲', '🔒', '🔑', '🧩', '🛠️', '🧪', '⚙️', '🚀'] },
  { label: 'Foot & terrain', items: ['⚽', '🥅', '🏟️', '🏆', '🥇', '🥈', '🥉', '🎽', '👟', '🧤', '🏅', '⏱️', '📋', '🔥', '💪', '🤝', '🙌', '👏', '🧑‍🤝‍🧑', '👥', '🏃', '🤸', '🍕', '🍻'] },
  { label: 'Jeu & récompenses', items: ['🎯', '🎮', '🕹️', '🎲', '🃏', '💎', '🪙', '💰', '🎁', '🎟️', '🏷️', '🛒', '🛍️', '👑', '🦄', '🌟', '⭐', '✨', '⚡', '🎉', '🎊', '🥳', '🏁', '📣'] },
  { label: 'Idées & humeur', items: ['💡', '🧠', '👀', '❤️', '😍', '😎', '🤩', '🤔', '🫡', '🙏', '🌈', '☀️', '🌙', '❄️', '🎃', '🗓️', '📍', '🌍', '✈️', '🏙️', '🏫', '🏢', '📦', '🧾'] },
];

/**
 * @param {{ value: string, disabled?: boolean, size?: 'md'|'lg', label?: string, onPick: (emoji: string) => void }} opts
 */
export function emojiPicker({ value = '', disabled = false, size = 'md', label = 'Icône de la feature', onPick }) {
  let pop = null;
  const wrap = h('span', { class: `emoji-pick emoji-${size}` });
  const btn = h('button', {
    type: 'button', class: `emoji-btn${value ? '' : ' is-empty'}`, disabled, 'aria-label': label, 'aria-haspopup': 'dialog', 'aria-expanded': 'false',
    title: disabled ? null : 'Choisir un emoji',
    onClick: () => (pop ? close() : open()),
  }, value || '✦');

  // Le bouton se met à jour tout de suite : dans la création, rien ne re-rend le formulaire.
  const choose = (v) => {
    close();
    if (v === value) return;
    value = v;
    btn.textContent = v || '✦';
    btn.classList.toggle('is-empty', !v);
    onPick(v);
  };
  const onDocClick = (e) => { if (!wrap.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); btn.focus(); } };

  function open() {
    const custom = h('input', { class: 'input emoji-custom', placeholder: 'Autre… colle un emoji', maxlength: 8, 'aria-label': 'Emoji libre',
      onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = custom.value.trim(); if (v) choose(v); } } });
    pop = h('div', { class: 'emoji-pop', role: 'dialog', 'aria-label': 'Choisir un emoji', onKeydown: onKey },
      EMOJI_GROUPS.map((g) => [
        h('div', { class: 'emoji-group-label' }, g.label),
        h('div', { class: 'emoji-grid' }, g.items.map((e) => h('button', { type: 'button', class: `emoji-cell${e === value ? ' is-on' : ''}`, title: e, onClick: () => choose(e) }, e))),
      ]),
      h('div', { class: 'emoji-foot' },
        custom,
        h('button', { type: 'button', class: 'btn btn-sm', onClick: () => { const v = custom.value.trim(); if (v) choose(v); } }, 'OK'),
        value ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', title: 'Retirer l’icône', onClick: () => choose('') }, icon('close'), 'Aucune') : null));
    wrap.append(pop);
    btn.setAttribute('aria-expanded', 'true');
    setTimeout(() => document.addEventListener('click', onDocClick, true), 0);
    (pop.querySelector('.emoji-cell.is-on') || pop.querySelector('.emoji-cell')).focus();
  }
  function close() {
    if (!pop) return;
    pop.remove(); pop = null;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClick, true);
  }
  wrap.append(btn);
  return wrap;
}
