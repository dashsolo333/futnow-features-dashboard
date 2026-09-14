// Client minimal de l'API GitHub Contents. Lecture publique sans token
// (avec ETag pour ne pas consommer le quota), écriture avec token perso.
import { CONFIG, IS_LOCAL, DEV_MODE } from './config.js';

const API = 'https://api.github.com';

function contentsUrl() {
  return `${API}/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.dataPath}?ref=${CONFIG.branch}`;
}

function headers(token, extra = {}) {
  const h = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...extra };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

function decodeContent(b64) {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeContent(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

export class GitHubError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function readError(res) {
  let msg = res.statusText;
  try { msg = (await res.json()).message || msg; } catch { /* corps vide */ }
  return new GitHubError(res.status, msg);
}

/** Lit le JSON. Renvoie { doc, sha, etag } ou { unchanged: true } si l'ETag est intact. */
export async function loadDoc({ token, etag } = {}) {
  if (IS_LOCAL) return loadLocal(etag);
  const res = await fetch(contentsUrl(), {
    headers: headers(token, etag ? { 'If-None-Match': etag } : {}),
    cache: 'no-store',
  });
  if (res.status === 304) return { unchanged: true };
  if (!res.ok) throw await readError(res);
  const body = await res.json();
  return { doc: JSON.parse(decodeContent(body.content)), sha: body.sha, etag: res.headers.get('ETag') || '' };
}

/** Écrit le JSON. Lève GitHubError(409/422) si le sha ne correspond plus. */
export async function saveDoc({ token, doc, sha, message }) {
  if (DEV_MODE) { console.info('[dev] commit simulé :', message); return { sha: `dev-${Date.now()}` }; }
  const res = await fetch(contentsUrl().split('?')[0], {
    method: 'PUT',
    headers: headers(token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      message, branch: CONFIG.branch, sha,
      content: encodeContent(`${JSON.stringify(doc, null, 2)}\n`),
    }),
  });
  if (!res.ok) throw await readError(res);
  const body = await res.json();
  return { sha: body.content.sha };
}

export function isConflict(err) {
  return err instanceof GitHubError && (err.status === 409 || err.status === 422);
}

/** Vérifie le token, renvoie l'utilisateur et son droit d'écriture sur le dépôt. */
export async function whoAmI(token) {
  if (DEV_MODE) return { login: 'dev', avatar: '', name: 'Recette locale', canWrite: true };
  const res = await fetch(`${API}/user`, { headers: headers(token) });
  if (!res.ok) throw await readError(res);
  const u = await res.json();
  const repoRes = await fetch(`${API}/repos/${CONFIG.owner}/${CONFIG.repo}`, { headers: headers(token) });
  const repo = repoRes.ok ? await repoRes.json() : null;
  const canWrite = Boolean(repo?.permissions?.push || repo?.permissions?.admin);
  return { login: u.login, avatar: u.avatar_url, name: u.name || u.login, canWrite };
}

/** Recette locale : lit data/features.json servi par le serveur statique. */
async function loadLocal(etag) {
  const res = await fetch(`${CONFIG.dataPath}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new GitHubError(res.status, `fichier local introuvable (${res.status})`);
  const text = await res.text();
  const hash = String(text.length);
  if (etag && etag === hash) return { unchanged: true };
  return { doc: JSON.parse(text), sha: 'local', etag: hash };
}
