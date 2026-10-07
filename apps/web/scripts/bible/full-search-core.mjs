export function validateFullIndex(index, binary, config, datasetHash, vectorHash, dataset) {
  if (
    index.format !== 'ebenezer-bible-full-embeddings' ||
    index.version !== 1 ||
    index.encoding !== 'float32-le' ||
    index.strategy !== 'scripture' ||
    index.dimensions !== config.dimensions ||
    JSON.stringify(index.model) !== JSON.stringify(config) ||
    index.datasetSha256 !== datasetHash ||
    index.vectorsSha256 !== vectorHash
  )
    throw new Error('Stale or incompatible full-Bible index');
  if (
    !index.passages.length ||
    new Set(index.passages.map((p) => p.id)).size !== index.passages.length ||
    binary.byteLength !== index.passages.length * config.dimensions * 4
  )
    throw new Error('Incomplete full-Bible index');
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const covered = new Set();
  for (const [row, passage] of index.passages.entries()) {
    const chapter = dataset.chapters[passage.chapterKey];
    if (
      !chapter ||
      passage.tokens > config.maxTokens ||
      passage.tokens < 1 ||
      passage.firstVerse > passage.lastVerse
    )
      throw new Error('Invalid passage metadata');
    const verses = chapter.verses.filter(
      (v) => v.number >= passage.firstVerse && v.number <= passage.lastVerse && v.text,
    );
    if (!verses.length || verses.map((v) => v.text).join(' ') !== passage.text)
      throw new Error('Passage text differs from verified Scripture');
    for (const verse of verses) {
      const id = `${passage.chapterKey}:${verse.number}`;
      if (covered.has(id)) throw new Error('Duplicate verse coverage');
      covered.add(id);
    }
    let norm = 0;
    for (let column = 0; column < config.dimensions; column++) {
      const value = view.getFloat32((row * config.dimensions + column) * 4, true);
      if (!Number.isFinite(value)) throw new Error('Invalid vector');
      norm += value * value;
    }
    if (Math.abs(Math.sqrt(norm) - 1) > 0.001) throw new Error('Vector is not normalized');
  }
  for (const [key, chapter] of Object.entries(dataset.chapters))
    for (const verse of chapter.verses)
      if (verse.text && !covered.has(`${key}:${verse.number}`))
        throw new Error('Missing verse coverage');
}

export function rankFullPassages(query, index, binary, limit = 3) {
  if (query.length !== index.dimensions || query.some((v) => !Number.isFinite(v)))
    throw new Error('Invalid query embedding');
  if (binary.byteLength !== index.passages.length * index.dimensions * 4)
    throw new Error('Vector size mismatch');
  const view = new DataView(binary.buffer, binary.byteOffset, binary.byteLength);
  const best = [];
  for (const [row, passage] of index.passages.entries()) {
    let score = 0;
    for (let column = 0; column < query.length; column++)
      score += query[column] * view.getFloat32((row * query.length + column) * 4, true);
    best.push({ id: passage.id, reference: passage.reference, score });
    best.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (best.length > limit) best.pop();
  }
  return best;
}
