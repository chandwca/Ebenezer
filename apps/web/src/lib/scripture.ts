export const passages = [
  {
    value: '1 Samuel 7:12',
    labelKey: 'journal:passages.remember',
    quote: 'Hitherto hath the LORD helped us.',
    symbol: '🪨',
    chapterUrl: 'https://www.bible.com/bible/1/1SA.7.KJV',
  },
  {
    value: '1 Peter 5:7',
    labelKey: 'journal:passages.care',
    quote: 'Casting all your care upon him; for he careth for you.',
    symbol: '🤲',
    chapterUrl: 'https://www.bible.com/bible/1/1PE.5.KJV',
  },
  {
    value: 'Psalm 61:2',
    labelKey: 'journal:passages.rock',
    quote:
      'From the end of the earth will I cry unto thee, when my heart is overwhelmed: lead me to the rock that is higher than I.',
    symbol: '⛰️',
    chapterUrl: 'https://www.bible.com/bible/1/PSA.61.KJV',
  },
] as const;

export function stoneSymbol(reference: string) {
  return passages.find((passage) => passage.value === reference)?.symbol ?? '🪨';
}

/** Wrap Scripture in quotation marks, unless the verse already carries its own speech marks. */
export function quoted(text: string) {
  return /[“”"]/.test(text) ? text : `“${text}”`;
}
