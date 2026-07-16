import { readFileSync } from 'fs';

const html = readFileSync('raw/gdrive_decoded.html', 'utf8');

function findSurroundings(text, term, count = 200) {
  let idx = 0;
  console.log(`\n=== Surroundings for "${term}" ===`);
  while (true) {
    idx = text.indexOf(term, idx);
    if (idx === -1) break;
    const start = Math.max(0, idx - count);
    const end = Math.min(text.length, idx + term.length + count);
    console.log(`[Index ${idx}]: ... ${text.substring(start, end).replace(/\s+/g, ' ')} ...`);
    idx += term.length;
  }
}

findSurroundings(html, 'sách');
findSurroundings(html, 'luật');
findSurroundings(html, 'pdf');
