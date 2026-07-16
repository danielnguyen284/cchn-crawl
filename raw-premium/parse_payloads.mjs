import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function extractFiles(filename) {
  const rawContent = readFileSync(join('raw-premium', filename), 'utf8');
  // Replace escaped double quotes with regular quotes
  const content = rawContent.replace(/\\"/g, '"');
  
  // Find all file entries of the format: {"name":"...","path":"...","isZip":...}
  const fileArrayRegex = /\{"name":"[^"]+","path":"[^"]+","isZip":(?:true|false)\}/g;
  const matches = content.match(fileArrayRegex);
  const allFiles = [];
  if (matches) {
    matches.forEach(m => {
      try {
        const parsed = JSON.parse(m);
        allFiles.push(parsed);
      } catch(e) {
        // Try to manually extract name and path if JSON parse fails
        const nameMatch = m.match(/"name":"([^"]+)"/);
        const pathMatch = m.match(/"path":"([^"]+)"/);
        const isZipMatch = m.match(/"isZip":(true|false)/);
        if (nameMatch && pathMatch) {
          allFiles.push({
            name: nameMatch[1],
            path: pathMatch[1],
            isZip: isZipMatch ? isZipMatch[1] === 'true' : false
          });
        }
      }
    });
  }
  
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
