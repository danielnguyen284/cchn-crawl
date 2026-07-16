import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('raw/gdrive_folder.html', 'utf8');

// Function to decode unicode escapes like \u003d, \u1ebf
function decodeUnicodeEscapes(str) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}

const decodedHtml = decodeUnicodeEscapes(html);
writeFileSync('raw/gdrive_decoded.html', decodedHtml);
console.log('Saved decoded HTML to raw/gdrive_decoded.html');

// Now let's search for keywords
const keywords = ['cccm', 'sách', 'sach', 'chứng khoán', 'tài liệu', 'tai lieu', 'đề thi', 'de thi', 'luật', 'môi giới', 'phân tích', 'pdf', 'docx', 'xlsx'];
console.log('\nSearching in decoded HTML:');
for (const kw of keywords) {
  const regex = new RegExp(kw, 'gi');
  const matches = decodedHtml.match(regex) || [];
  console.log(`  "${kw}": ${matches.length} matches`);
}

// Find any double quoted strings that look like files/documents or titles
// e.g. "something.pdf" or "Tài liệu..."
const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let strMatch;
const candidates = new Set();
while ((strMatch = strRegex.exec(decodedHtml)) !== null) {
  const val = strMatch[1];
  if (val.length > 5 && (val.includes('.pdf') || val.includes('.docx') || val.includes('.xlsx') || val.includes('.pptx') || val.includes('.png') || val.includes('.jpg'))) {
    candidates.add(val);
  }
}

console.log(`\nFound ${candidates.size} potential files with extensions:`);
console.log(JSON.stringify([...candidates], null, 2));
