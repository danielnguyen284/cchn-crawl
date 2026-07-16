// Deep exploration: parse RSC responses and try sub-routes
const FIREBASE_PROJECT = 'educated-brokers';
const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';
const SITE_URL = 'https://vn-securities-platform.vercel.app';

import { writeFileSync, mkdirSync } from 'fs';

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
      'Next-Router-State-Tree': encodeURIComponent(JSON.stringify(["",{"children":["(dashboard)",{"children":[path.replace('/',''),{"children":["__PAGE__",{}]}]}]}])),
      'Cookie': `__session=${token}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
  });
  return await res.text();
}

async function main() {
  const token = await refreshToken();
  mkdirSync('raw', { recursive: true });

  // 1. Fetch full HTML of key pages (to find links, scripts, data)
  console.log('=== Fetching HTML pages ===\n');
  const pages = ['/study', '/exam', '/premium', '/dashboard', '/login'];
  
  for (const page of pages) {
    const html = await fetchPage(`${SITE_URL}${page}`, token);
    writeFileSync(`raw/page_${page.replace(/\//g, '_') || 'root'}.html`, html);
    console.log(`${page}: ${html.length} bytes`);
    
    // Extract links from HTML
    const linkMatches = html.match(/href="([^"]*?)"/g) || [];
    const links = [...new Set(linkMatches.map(m => m.replace('href="', '').replace('"', '')))];
    const internalLinks = links.filter(l => l.startsWith('/') && !l.startsWith('/_next'));
    if (internalLinks.length > 0) {
      console.log(`  Links: ${internalLinks.join(', ')}`);
    }

    // Extract any JSON data embedded in the page
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
    if (nextDataMatch) {
      console.log(`  Found __NEXT_DATA__`);
      writeFileSync(`raw/nextdata_${page.replace(/\//g, '_')}.json`, nextDataMatch[1]);
    }

    // Look for notebooklm, drive, docs links
    const externalLinks = links.filter(l => l.includes('drive.google') || l.includes('notebooklm') || l.includes('docs.google') || l.includes('.pdf'));
    if (externalLinks.length > 0) {
      console.log(`  📎 External resources: ${externalLinks.join('\n    ')}`);
    }
  }

  // 2. Fetch RSC data for study/exam pages
  console.log('\n=== Fetching RSC responses ===\n');
  for (const page of ['/study', '/exam', '/dashboard']) {
    const rsc = await fetchRSC(page, token);
    writeFileSync(`raw/rsc_${page.replace(/\//g, '_')}.txt`, rsc);
    console.log(`RSC ${page}: ${rsc.length} bytes`);
    
    // Look for data patterns in RSC
    const urls = rsc.match(/https?:\/\/[^\s"'\\]+/g) || [];
    const uniqueUrls = [...new Set(urls)].filter(u => !u.includes('_next') && !u.includes('vercel'));
    if (uniqueUrls.length > 0) {
      console.log(`  URLs found:`);
      uniqueUrls.forEach(u => console.log(`    ${u}`));
    }
  }

  // 3. Try sub-routes with subject IDs from exam session
  console.log('\n=== Trying subject-specific routes ===\n');
  const subjectIds = ['cccm1', 'cccm2', 'cccm3', 'cccm4', 'cccm5', 'cccm6'];
  const subRoutes = ['/study/', '/exam/', '/questions/', '/de-thi/', '/tai-lieu/'];
  
  for (const sub of subRoutes) {
    for (const sid of subjectIds) {
      try {
        const res = await fetch(`${SITE_URL}${sub}${sid}`, {
          headers: { 'Cookie': `__session=${token}` },
          redirect: 'manual'
        });
        if (res.status === 200) {
          console.log(`✅ ${sub}${sid} — 200`);
        } else if (res.status === 307 || res.status === 308) {
          console.log(`↩️ ${sub}${sid} — redirect to ${res.headers.get('location')}`);
        }
      } catch (e) {}
    }
  }

  // 4. Try Firestore subcollections under users
  console.log('\n=== Firestore user subcollections ===\n');
  const userId = '19ZIkYWrjDeRE6sEmcMuOwaoaHE3';
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
  
  // List subcollections under user doc
  try {
    const res = await fetch(`${baseUrl}/users/${userId}:listCollectionIds`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.ok) {
      console.log('User subcollections:', data.collectionIds);
      
      // Try to read each subcollection
      for (const col of (data.collectionIds || [])) {
        const colRes = await fetch(`${baseUrl}/users/${userId}/${col}?pageSize=3`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const colData = await colRes.json();
        if (colRes.ok && colData.documents) {
          console.log(`  📁 ${col}: ${colData.documents.length} docs`);
          if (colData.documents[0]) {
            console.log(`    Fields: ${Object.keys(colData.documents[0].fields || {}).join(', ')}`);
          }
        }
      }
    } else {
      console.log('Cannot list user subcollections:', data.error?.message);
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\n✨ Deep exploration complete! Check ./raw/ folder for saved data.');
}

main().catch(console.error);
