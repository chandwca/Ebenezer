export function passageInput(passage, config, strategy) {
  if (!['scripture', 'context'].includes(strategy)) throw new Error('Unknown indexing strategy');
  return (
    config.passagePrefix +
    (strategy === 'context' ? `${passage.context}\n${passage.text}` : passage.text)
  );
}
export function validateIndex(index, config, datasetSha256, passageIds) {
  if (
    index.format !== 'ebenezer-bible-embeddings' ||
    index.version !== 1 ||
    index.datasetSha256 !== datasetSha256 ||
    JSON.stringify(index.model) !== JSON.stringify(config)
  )
    throw new Error('Stale or incompatible index; regenerate embeddings.');
  if (
    index.entries.length !== passageIds.length ||
    new Set(index.entries.map((entry) => entry.id)).size !== passageIds.length
  )
    throw new Error('Incomplete index');
  const ids = new Set(passageIds);
  for (const entry of index.entries) {
    if (
      !ids.has(entry.id) ||
      entry.vector.length !== config.dimensions ||
      entry.vector.some((value) => !Number.isFinite(value))
    )
      throw new Error('Invalid index entry');
    const norm = Math.sqrt(entry.vector.reduce((sum, value) => sum + value * value, 0));
    if (Math.abs(norm - 1) > 0.001) throw new Error('Embedding must be normalized');
  }
}
export function rankPassages(query, entries, limit = 3) {
  if (!query.length || query.some((value) => !Number.isFinite(value)))
    throw new Error('Invalid query vector');
  return entries
    .map((entry) => {
      if (entry.vector.length !== query.length) throw new Error('Embedding dimensions mismatch');
      return {
        id: entry.id,
        score: entry.vector.reduce((sum, value, i) => sum + value * query[i], 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit);
}
