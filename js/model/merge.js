// Fusion de conflits : GitHub refuse une écriture si le sha a changé.
// On recharge le document distant et on rejoue les opérations locales dessus.
export function replayOps(remoteDoc, ops) {
  let doc = remoteDoc;
  let skipped = 0;
  for (const op of ops) {
    try {
      doc = op(doc);
    } catch {
      skipped += 1;
    }
  }
  return skipped ? { ...doc, __skipped: skipped } : doc;
}

export function stripMeta(doc) {
  const { __skipped, ...rest } = doc;
  return rest;
}
