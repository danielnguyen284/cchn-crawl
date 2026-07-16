import { readFileSync } from 'fs';

const html = readFileSync('raw/gdrive_folder.html', 'utf8');

// Find all matches for "cccm", "chứng khoán", etc.
const keywords = ['cccm', 'chung khoan', 'chứng khoán', 'tài liệu', 'tai lieu', 'đề thi', 'de thi', 'luat', 'môi giới', 'moi gioi', 'phân tích', 'phan tich'];

console.log('Searching for keywords...');
for (const kw of keywords) {
  const regex = new RegExp(kw, 'gi');
  const matches = html.match(regex) || [];
  console.log(`  "${kw}": ${matches.length} matches`);
}

// Find any string in double quotes that looks like a vietnamese phrase or title
const matches = html.match(/"[^"]*?(?:chứng khoán|đề thi|tài liệu|cccm|học tập)[^"]*?"/gi) || [];
console.log(`\nFound ${matches.length} matching strings in double quotes:`);
matches.slice(0, 20).forEach(m => console.log('  ', m));
