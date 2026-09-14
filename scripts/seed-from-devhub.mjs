#!/usr/bin/env node
// Régénère data/features.json depuis le catalogue DevHub de futnow-app.
// Usage : node scripts/seed-from-devhub.mjs [chemin/vers/futnow-app] [--force]
// Sans --force, refuse d'écraser un features.json qui contient déjà des données.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedFromCatalogue } from '../js/model/seed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const appRoot = args.find((a) => !a.startsWith('--')) || path.resolve(ROOT, '../futnow-app');
const OUT = path.join(ROOT, 'data/features.json');

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const catalogue = read(path.join(appRoot, 'app/src/dev/devhub.catalogue.json'));
const updatedPath = path.join(appRoot, 'app/src/dev/devhub.updated.json');
const updated = existsSync(updatedPath) ? read(updatedPath) : { entries: {} };

if (existsSync(OUT) && !force) {
  const current = read(OUT);
  if (current.features?.length) {
    console.error(`${OUT} contient déjà ${current.features.length} features. Relance avec --force pour écraser.`);
    process.exit(1);
  }
}

const doc = seedFromCatalogue(catalogue, updated, { at: new Date().toISOString() });
writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`${doc.features.length} features écrites dans ${path.relative(ROOT, OUT)}`);
