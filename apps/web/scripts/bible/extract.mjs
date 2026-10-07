import { JSDOM } from 'jsdom';

export function extractChapter(html, { allowEmpty = false } = {}) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  const main = document.querySelector('.main');
  if (!main) throw new Error('Chapter body missing');
  const verses = [];
  let current;
  function visit(node) {
    if (node.nodeType === 3) {
      if (current) current.text += node.textContent;
      return;
    }
    if (node.nodeType !== 1) return;
    if (
      node.matches(
        'ul, script, style, .footnote, .notemark, .s, .s2, .r, .chapterlabel, .d, .copyright, .tnav',
      )
    )
      return;
    if (node.matches('.verse')) {
      const number = Number(node.id.replace(/^V/, ''));
      if (!Number.isInteger(number) || number < 1) throw new Error('Invalid verse marker');
      current = { number, text: '' };
      verses.push(current);
      return;
    }
    for (const child of node.childNodes) visit(child);
    if (current && node.matches('div, p, br')) current.text += ' ';
  }
  visit(main);
  for (const [index, verse] of verses.entries()) {
    verse.text = verse.text.replace(/\s+/g, ' ').trim();
    if ((!allowEmpty && !verse.text) || verse.number !== index + 1)
      throw new Error('Missing or out-of-order verse');
  }
  if (!verses.length) throw new Error('Empty chapter');
  dom.window.close();
  return verses;
}
