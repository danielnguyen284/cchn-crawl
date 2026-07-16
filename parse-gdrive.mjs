import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('raw/gdrive_folder.html', 'utf8');

// Look for script tags
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/g;
let match;
let count = 0;

console.log('Scanning script tags...');
while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  if (content.includes('INITIAL_DATA') || content.includes('init') || content.includes('itemId') || content.includes('folder')) {
    console.log(`Script ${count} matches keywords (length: ${content.length} chars)`);
    writeFileSync(`raw/script_${count}.js`, content);
  }
  count++;
}

// Google Drive file IDs are usually 33 characters (or 44 or similar) matching [a-zA-Z0-9_-]{28,45}
// Let's look for common MIME types or file patterns:
// pdf, docx, xlsx, pptx, or folder
// Let's print out strings that look like Google Drive IDs or file names.
console.log('\nScanning for potential file names and IDs...');
const strings = [];
const strRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let strMatch;
while ((strMatch = strRegex.exec(html)) !== null) {
  const val = strMatch[1];
  if (val.length > 5 && (val.includes('.pdf') || val.includes('.docx') || val.includes('.xlsx') || val.includes('.pptx') || val.includes('.zip') || val.includes('.rar'))) {
    strings.push(val);
  }
}
console.log(`Found ${strings.length} file-like strings:`);
console.log(JSON.stringify([...new Set(strings)], null, 2));
