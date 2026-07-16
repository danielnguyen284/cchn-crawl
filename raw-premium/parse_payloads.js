import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function extractFiles(filename) {
  const content = readFileSync(join('raw-premium', filename), 'utf8');
  // Match JSON strings in Next.js payloads containing "files"
  const regex = /"files"\s*:\s*(\[[^\]]*\])/g;
  let match;
  const allFiles = [];
  
  // Also search for objects with "path" and "name"
  const fileArrayRegex = /\{"name":"[^"]+","path":"[^"]+","isZip":(?:true|false)\}/g;
  const matches = content.match(fileArrayRegex);
  if (matches) {
    matches.forEach(m => {
      try {
        const parsed = JSON.parse(m);
        allFiles.push(parsed);
      } catch(e) {}
    });
  }
  
  // Deduplicate
  const unique = [];
  const paths = new Set();
  allFiles.forEach(f => {
    if (!paths.has(f.path)) {
      paths.add(f.path);
      unique.push(f);
    }
  });
  
  return unique;
}

function main() {
  const dir = readdirSync('raw-premium');
  const results = {};
  
  for (const file of dir) {
    if (file.endsWith('.html') && !file.includes('_rsc')) {
      const files = extractFiles(file);
      results[file] = files;
    }
  }
  
  console.log(JSON.stringify(results, null, 2));
  writeFileSync('raw-premium/extracted_files.json', JSON.stringify(results, null, 2));
}

main();
