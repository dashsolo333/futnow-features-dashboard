// Dépôt qui héberge la page ET le JSON. Sur GitHub Pages l'owner/repo est
// déduit de l'URL (owner.github.io/repo) ; en local on retombe sur la valeur fixe.
const FALLBACK = { owner: 'dashsolo333', repo: 'futnow-features-dashboard' };

export function repoFromLocation(loc = globalThis.location) {
  const m = /^([a-z0-9-]+)\.github\.io$/i.exec(loc?.hostname || '');
  const seg = (loc?.pathname || '/').split('/').filter(Boolean)[0];
  if (m && seg) return { owner: m[1], repo: seg };
  return FALLBACK;
}

export const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(globalThis.location?.hostname || '');
// Sur localhost, ?dev=1 simule un utilisateur autorisé et n'écrit rien (recette UI).
export const DEV_MODE = IS_LOCAL && new URLSearchParams(globalThis.location?.search || '').get('dev') === '1';

export const CONFIG = {
  ...repoFromLocation(),
  branch: 'main',
  dataPath: 'data/features.json',
  pollMs: 45_000,
  saveDebounceMs: 900,
  tokenKey: 'ftn.features.token',
  userKey: 'ftn.features.user',
  viewKey: 'ftn.features.view',
};
