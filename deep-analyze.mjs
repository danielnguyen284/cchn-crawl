// Download ALL JS chunks and search for question data, Firestore paths, and NotebookLM links
import { writeFileSync, mkdirSync } from 'fs';

const SITE_URL = 'https://vn-securities-platform.vercel.app';

async function main() {
  // Get the HTML pages to find all JS chunks
  const pages = ['/study', '/exam', '/dashboard', '/login', '/premium', '/study/cccm1', '/exam/cccm1'];
  const allJsUrls = new Set();

  for (const page of pages) {
    const html = await (await fetch(`${SITE_URL}${page}`)).text();
    const matches = html.matchAll(/(?:src|href)="(\/_next\/static\/chunks\/[^"]+\.(?:js|css))"/g);
    for (const m of matches) allJsUrls.add(m[1]);
  }

  console.log(`Found ${allJsUrls.size} unique JS/CSS chunks across all pages\n`);

  mkdirSync('js-all', { recursive: true });

  const results = {
    firestoreCollections: new Set(),
    firestorePaths: [],
    notebookLinks: [],
    driveLinks: [],
    pdfUrls: [],
    subjectData: [],
    questionPatterns: [],
    apiEndpoints: [],
  };

  for (const url of allJsUrls) {
    const fullUrl = `${SITE_URL}${url}`;
    try {
      const content = await (await fetch(fullUrl)).text();
      const filename = url.split('/').pop();
      
      // Search for Firestore collection/doc patterns (broader search)
      const patterns = [
        // collection(db, "name") or doc(db, "name") 
        /(?:collection|doc)\s*\(\s*\w+\s*,\s*["']([a-zA-Z_][a-zA-Z0-9_-]*)["']/g,
        // "collection_name" in context of Firestore
        /firestore.*?["']([a-zA-Z_][a-zA-Z0-9_]{2,})["']/gi,
        // addDoc, setDoc, updateDoc, getDoc, getDocs patterns
        /(?:addDoc|setDoc|updateDoc|getDoc|getDocs)\s*\(/g,
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          if (match[1]) {
            results.firestoreCollections.add(match[1]);
            results.firestorePaths.push({ file: filename, match: match[0].substring(0, 100) });
          }
        }
      }

      // Search for question-related code
      const qPatterns = content.match(/["']cccm\d+-q[a-z]+-\d+["']/g) || [];
      if (qPatterns.length > 0) {
        results.questionPatterns.push({ file: filename, count: qPatterns.length, samples: qPatterns.slice(0, 5) });
        writeFileSync(`js-all/${filename}`, content);
        console.log(`💡 ${filename}: ${qPatterns.length} question ID patterns — SAVED`);
      }

      // Search for NotebookLM
      const nbMatches = content.match(/notebooklm[^"'`\s\\]*/gi) || [];
      const nbUrlMatches = content.match(/https?:\/\/[^"'`\s\\]*notebooklm[^"'`\s\\]*/gi) || [];
      if (nbMatches.length > 0) {
        results.notebookLinks.push({ file: filename, matches: [...new Set(nbMatches)] });
        if (!content.includes('question ID patterns')) {
          writeFileSync(`js-all/${filename}`, content);
        }
        console.log(`📓 ${filename}: NotebookLM references — SAVED`);
      }

      // Search for Google Drive links
      const driveMatches = content.match(/https?:\/\/[^"'`\s\\]*(?:drive\.google|docs\.google|sheets\.google)[^"'`\s\\]*/gi) || [];
      if (driveMatches.length > 0) {
        results.driveLinks.push(...driveMatches);
        console.log(`📎 ${filename}: Drive links found`);
      }

      // Search for PDF URLs  
      const pdfMatches = content.match(/["']\/documents\/[^"']+\.pdf["']/g) || [];
      if (pdfMatches.length > 0) {
        pdfMatches.forEach(m => results.pdfUrls.push(m.replace(/["']/g, '')));
      }

      // Search for API endpoints
      const apiMatches = content.match(/["']\/api\/[^"']+["']/g) || [];
      if (apiMatches.length > 0) {
        apiMatches.forEach(m => results.apiEndpoints.push(m.replace(/["']/g, '')));
      }

      // Search for question/exam related functions and data structures
      const examCode = content.match(/(?:question|answer|exam|subject|topic|quiz)[A-Za-z]*\s*[:=]/gi) || [];
      if (examCode.length > 5) {
        writeFileSync(`js-all/${filename}`, content);
        console.log(`📝 ${filename}: ${examCode.length} exam-related patterns — SAVED`);
      }

    } catch (e) {
      console.log(`❌ ${url}: ${e.message}`);
    }
  }

  // Convert Set to Array for JSON
  const output = {
    ...results,
    firestoreCollections: [...results.firestoreCollections].sort(),
    pdfUrls: [...new Set(results.pdfUrls)],
    driveLinks: [...new Set(results.driveLinks)],
    apiEndpoints: [...new Set(results.apiEndpoints)],
  };

  console.log('\n=== SUMMARY ===');
  console.log('Firestore collections:', output.firestoreCollections);
  console.log('NotebookLM refs:', output.notebookLinks);
  console.log('Drive links:', output.driveLinks);
  console.log('PDF URLs:', output.pdfUrls);
  console.log('API endpoints:', output.apiEndpoints);
  console.log('Question patterns:', output.questionPatterns);

  writeFileSync('full-discovery.json', JSON.stringify(output, null, 2));
  console.log('\n📁 Full results saved to full-discovery.json');
}

main().catch(console.error);
