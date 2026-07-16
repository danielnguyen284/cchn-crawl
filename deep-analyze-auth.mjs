import { writeFileSync, mkdirSync } from 'fs';

const FIREBASE_PROJECT = 'educated-brokers';
const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';
const SITE_URL = 'https://vn-securities-platform.vercel.app';

async function getAuthToken() {
  console.log('🔄 Refreshing auth token...');
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${JSON.stringify(data)}`);
  }
  return data.id_token;
}

async function main() {
  const token = await getAuthToken();
  const pages = [
    '/dashboard',
    '/study',
    '/study/cccm1',
    '/study/cccm2',
    '/study/cccm3',
    '/study/cccm4',
    '/study/cccm5',
    '/study/cccm6',
    '/study/cccm7',
    '/study/cccm8',
    '/exam',
    '/real-exam',
    '/history',
    '/analytics',
    '/watchlist',
    '/premium',
    '/donate',
    '/profile'
  ];

  const allJsUrls = new Set();
  console.log('\n🔍 Fetching pages with authentication to discover JS chunks...');
  
  for (const page of pages) {
    try {
      const res = await fetch(`${SITE_URL}${page}`, {
        headers: {
          'Cookie': `__session=${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const html = await res.text();
      console.log(`✅ Fetched ${page} (${html.length} bytes)`);
      
      const matches = html.matchAll(/(?:src|href)="(\/_next\/static\/chunks\/[^"]+\.js)"/g);
      for (const m of matches) {
        allJsUrls.add(m[1]);
      }
    } catch (e) {
      console.error(`❌ Error fetching ${page}: ${e.message}`);
    }
  }

  console.log(`\nFound ${allJsUrls.size} unique JS chunks.`);
  mkdirSync('js-auth', { recursive: true });

  const foundLinks = {
    notebooklm: new Set(),
    drive: new Set(),
    pdf: new Set(),
    firestoreCollections: new Set(),
    apiEndpoints: new Set()
  };

  for (const jsUrl of allJsUrls) {
    const fullUrl = `${SITE_URL}${jsUrl}`;
    const filename = jsUrl.split('/').pop();
    try {
      const res = await fetch(fullUrl);
      const content = await res.text();
      
      // Save chunk locally for reference
      writeFileSync(`js-auth/${filename}`, content);
      
      // 1. Scan for NotebookLM links
      const nbMatches = content.match(/https?:\/\/[^"'`\s\\]*notebooklm[^"'`\s\\]*/gi) || [];
      nbMatches.forEach(link => {
        const clean = link.replace(/[",';\]\)]+$/, '');
        foundLinks.notebooklm.add(clean);
      });

      // 2. Scan for Google Drive links
      const driveMatches = content.match(/https?:\/\/[^"'`\s\\]*(?:drive\.google|docs\.google|sheets\.google)[^"'`\s\\]*/gi) || [];
      driveMatches.forEach(link => {
        const clean = link.replace(/[",';\]\)]+$/, '');
        foundLinks.drive.add(clean);
      });

      // 3. Scan for PDF / Documents
      const pdfMatches = content.match(/["']\/documents\/[^"']+\.pdf["']/g) || [];
      pdfMatches.forEach(m => foundLinks.pdf.add(m.replace(/["']/g, '')));

      // 4. Scan for Firestore collection names
      const fsMatches = content.matchAll(/(?:collection|doc)\s*\(\s*\w+\s*,\s*["']([a-zA-Z_][a-zA-Z0-9_-]*)["']/g);
      for (const m of fsMatches) {
        if (m[1]) foundLinks.firestoreCollections.add(m[1]);
      }

      // 5. Scan for API endpoints
      const apiMatches = content.match(/["']\/api\/[^"']+["']/g) || [];
      apiMatches.forEach(m => foundLinks.apiEndpoints.add(m.replace(/["']/g, '')));

    } catch (e) {
      console.error(`❌ Error downloading/scanning ${filename}: ${e.message}`);
    }
  }

  const finalOutput = {
    crawledAt: new Date().toISOString(),
    notebooklmLinks: Array.from(foundLinks.notebooklm),
    driveLinks: Array.from(foundLinks.drive),
    pdfLinks: Array.from(foundLinks.pdf),
    firestoreCollections: Array.from(foundLinks.firestoreCollections),
    apiEndpoints: Array.from(foundLinks.apiEndpoints)
  };

  writeFileSync('raw/discovered_auth_resources.json', JSON.stringify(finalOutput, null, 2));
  
  console.log('\n=================== CRAWLED RESOURCES ===================');
  console.log('NotebookLM Links:', finalOutput.notebooklmLinks);
  console.log('Drive Links:', finalOutput.driveLinks);
  console.log('PDF/Doc Links:', finalOutput.pdfLinks);
  console.log('Firestore Collections:', finalOutput.firestoreCollections);
  console.log('API Endpoints:', finalOutput.apiEndpoints);
  console.log('=========================================================\n');
  console.log('Results saved to raw/discovered_auth_resources.json');
}

main().catch(console.error);
