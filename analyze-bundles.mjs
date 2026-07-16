// Download and analyze JS bundles to find Firestore collection names
import { writeFileSync, mkdirSync } from 'fs';

const SITE_URL = 'https://vn-securities-platform.vercel.app';

async function main() {
  // 1. Get the study page HTML to find JS chunk URLs
  const html = await (await fetch(`${SITE_URL}/study`)).text();
  
  // Extract all JS chunk URLs
  const jsUrls = [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)]
    .map(m => m[1]);
  
  console.log(`Found ${jsUrls.length} JS chunks`);
  
  mkdirSync('js-chunks', { recursive: true });
  
  // 2. Download each chunk and search for Firestore patterns
  const collectionNames = new Set();
  const firestorePatterns = [];
  const driveLinks = [];
  const notebookLinks = [];
  const allInteresting = [];
  
  for (const url of jsUrls) {
    const fullUrl = `${SITE_URL}${url}`;
    try {
      const js = await (await fetch(fullUrl)).text();
      const filename = url.split('/').pop();
      
      // Search for collection() calls - Firestore collection names
      const colMatches = js.match(/collection\s*\(\s*[a-zA-Z_$]+\s*,\s*["']([^"']+)["']/g) || [];
      colMatches.forEach(m => {
        const name = m.match(/["']([^"']+)["']/)?.[1];
        if (name) {
          collectionNames.add(name);
          firestorePatterns.push({ chunk: filename, pattern: m });
        }
      });
      
      // Also search for doc() calls
      const docMatches = js.match(/doc\s*\(\s*[a-zA-Z_$]+\s*,\s*["']([^"']+)["']/g) || [];
      docMatches.forEach(m => {
        const name = m.match(/["']([^"']+)["']/)?.[1];
        if (name) {
          collectionNames.add(name);
          firestorePatterns.push({ chunk: filename, pattern: m });
        }
      });
      
      // Search for string literals that look like collection names
      const stringLiterals = js.match(/["'](cccm\d+|questions|exams|subjects|topics|materials|resources|documents|users|exam_sessions|question_banks|study_materials|notebooks|notebookLM|configs|settings|chapters|sections|answers)["']/gi) || [];
      stringLiterals.forEach(m => {
        const name = m.replace(/["']/g, '');
        collectionNames.add(name);
      });
      
      // Search for Google Drive / NotebookLM links
      const linkMatches = js.match(/https?:\/\/[^"'`\s\\]+(?:drive\.google|notebooklm|docs\.google|sheets\.google)[^"'`\s\\]*/g) || [];
      linkMatches.forEach(l => driveLinks.push(l));
      
      const nbMatches = js.match(/https?:\/\/[^"'`\s\\]*notebooklm[^"'`\s\\]*/g) || [];
      nbMatches.forEach(l => notebookLinks.push(l));
      
      // Search for any URLs that look like resources
      const pdfMatches = js.match(/https?:\/\/[^"'`\s\\]+\.pdf[^"'`\s\\]*/g) || [];
      pdfMatches.forEach(l => allInteresting.push({ type: 'pdf', url: l }));
      
      // Look for subject/topic definitions
      const subjectMatches = js.match(/cccm[1-8]/g) || [];
      if (subjectMatches.length > 3) {
        // This chunk likely contains subject definitions
        writeFileSync(`js-chunks/${filename}`, js);
        console.log(`  💡 ${filename}: contains ${subjectMatches.length} subject references — SAVED`);
      }
      
      // Search for Firestore query patterns (where, orderBy, etc.)  
      const queryMatches = js.match(/where\s*\(\s*["']([^"']+)["']/g) || [];
      queryMatches.forEach(m => {
        const field = m.match(/["']([^"']+)["']/)?.[1];
        if (field) allInteresting.push({ type: 'query_field', field });
      });
      
    } catch(e) {
      // skip
    }
  }
  
  console.log('\n=== FIRESTORE COLLECTIONS FOUND ===');
  console.log([...collectionNames].sort());
  
  console.log('\n=== FIRESTORE PATTERNS ===');
  firestorePatterns.forEach(p => console.log(`  ${p.chunk}: ${p.pattern}`));
  
  console.log('\n=== DRIVE/NOTEBOOK LINKS ===');
  [...new Set(driveLinks)].forEach(l => console.log(`  📎 ${l}`));
  [...new Set(notebookLinks)].forEach(l => console.log(`  📓 ${l}`));
  
  console.log('\n=== INTERESTING PATTERNS ===');
  const uniqueInteresting = [...new Set(allInteresting.map(JSON.stringify))].map(JSON.parse);
  uniqueInteresting.forEach(i => console.log(`  ${i.type}: ${i.field || i.url}`));
  
  // Save results
  const results = {
    collections: [...collectionNames].sort(),
    firestorePatterns,
    driveLinks: [...new Set(driveLinks)],
    notebookLinks: [...new Set(notebookLinks)],
    interesting: uniqueInteresting
  };
  writeFileSync('discovery-results.json', JSON.stringify(results, null, 2));
  console.log('\n📁 Results saved to discovery-results.json');
}

main().catch(console.error);
