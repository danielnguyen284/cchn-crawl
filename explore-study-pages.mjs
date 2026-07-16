import { writeFileSync, mkdirSync } from 'fs';

const FIREBASE_PROJECT = 'educated-brokers';
const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';
const SITE_URL = 'https://vn-securities-platform.vercel.app';

async function refreshToken() {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  const data = await res.json();
  return data.id_token;
}

async function fetchPage(url, token) {
  const res = await fetch(url, {
    headers: {
      'Cookie': `__session=${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  return await res.text();
}

async function fetchRSC(path, token) {
  const res = await fetch(`${SITE_URL}${path}`, {
    headers: {
      'RSC': '1',
      'Cookie': `__session=${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  return await res.text();
}

async function main() {
  const token = await refreshToken();
  mkdirSync('raw', { recursive: true });

  const subjectIds = ['cccm1', 'cccm2', 'cccm3', 'cccm4', 'cccm5', 'cccm6', 'cccm7', 'cccm8'];
  
  console.log('=== Fetching study pages and RSC ===\n');
  const allFoundLinks = new Set();
  
  for (const sid of subjectIds) {
    const pageUrl = `/study/${sid}`;
    console.log(`Fetching ${pageUrl}...`);
    
    // HTML
    try {
      const html = await fetchPage(`${SITE_URL}${pageUrl}`, token);
      writeFileSync(`raw/study_${sid}.html`, html);
      console.log(`  HTML: ${html.length} bytes`);
      
      // Look for links in HTML
      const matches = html.matchAll(/(?:href|src)="([^"]*?)"/gi);
      for (const m of matches) {
        const link = m[1];
        if (link.includes('drive.google') || link.includes('notebooklm') || link.includes('docs.google') || link.includes('.pdf')) {
          allFoundLinks.add(link);
        }
      }
    } catch (e) {
      console.error(`  HTML Error:`, e.message);
    }
    
    // RSC
    try {
      const rsc = await fetchRSC(pageUrl, token);
      writeFileSync(`raw/rsc_study_${sid}.txt`, rsc);
      console.log(`  RSC: ${rsc.length} bytes`);
      
      // Look for links in RSC
      const rscUrls = rsc.match(/https?:\/\/[^\s"'\\]+/g) || [];
      for (const u of rscUrls) {
        if (u.includes('drive.google') || u.includes('notebooklm') || u.includes('docs.google') || u.includes('.pdf')) {
          // clean any training bracket/quote/etc
          const cleanU = u.replace(/[",';\]\)]+$/, '');
          allFoundLinks.add(cleanU);
        }
      }
    } catch (e) {
      console.error(`  RSC Error:`, e.message);
    }
  }
  
  console.log('\n=== All Found Links of Interest ===');
  for (const link of allFoundLinks) {
    console.log(`🔗 ${link}`);
  }
}

main().catch(console.error);
