import { JSDOM } from 'jsdom';

// Respect narrative paragraphs. Consecutive poetry lines form one block.
export function paragraphGroups(html, verses) {
  const dom = new JSDOM(html);
  try {
    const main = dom.window.document.querySelector('.main');
    if (!main) throw new Error('Chapter body missing');
    const groups = [];
    let previousBlock;
    let previousPoetry = false;
    const byNumber = new Map(verses.map((verse) => [verse.number, verse]));
    for (const marker of main.querySelectorAll('.verse')) {
      const verse = byNumber.get(Number(marker.id.slice(1)));
      if (!verse) throw new Error('Verse marker is absent from verified chapter');
      const block = marker.closest('div, p');
      const poetry = /^q\d*$/.test(block?.className ?? '');
      if (!groups.length || (block !== previousBlock && !(poetry && previousPoetry)))
        groups.push([]);
      if (verse.text) groups.at(-1).push(verse);
      previousBlock = block;
      previousPoetry = poetry;
    }
    return groups.filter((group) => group.length);
  } finally {
    dom.window.close();
  }
}

export function splitGroup(verses, tokenCount, prefix, target = 256, limit = 512) {
  const chunks = [];
  let current = [];
  for (const verse of verses) {
    if (tokenCount(prefix + verse.text) > limit)
      throw new Error(
        `Verse ${verse.number} exceeds model limit; explicit sub-verse handling required.`,
      );
    const next = [...current, verse];
    if (current.length && tokenCount(prefix + next.map((v) => v.text).join(' ')) > target) {
      chunks.push(current);
      current = [];
    }
    current.push(verse);
  }
  if (current.length) chunks.push(current);
  return chunks;
}
