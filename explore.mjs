// Quick exploration script to discover where data lives
const FIREBASE_PROJECT = 'educated-brokers';
const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';

const SITE_URL = 'https://vn-securities-platform.vercel.app';

// Step 1: Refresh the access token
async function refreshToken() {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  const data = await res.json();
  if (data.error) {
    console.error('Token refresh failed:', data.error);
    process.exit(1);
  }
  console.log('✅ Token refreshed, expires in', data.expires_in, 'seconds');
  return data.id_token;
}

// Step 2: Try Firestore REST API
async function tryFirestore(token) {
  console.log('\n--- Firestore REST API ---');
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;
  
  // Try listing root documents (may reveal collections)
  const collections = ['questions', 'exams', 'subjects', 'documents', 'materials', 
    'users', 'topics', 'courses', 'lessons', 'quizzes', 'banks',
    'examBanks', 'questionBanks', 'study', 'resources', 'files',
    'cccm1', 'exam_sessions', 'user_progress'];
  
  for (const col of collections) {
    try {
      const res = await fetch(`${baseUrl}/${col}?pageSize=2`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.documents && data.documents.length > 0) {
        console.log(`✅ Collection "${col}" EXISTS — ${data.documents.length} docs found`);
        // Show first doc structure (keys only)
        const firstDoc = data.documents[0];
        const fields = Object.keys(firstDoc.fields || {});
        console.log(`   Fields: ${fields.join(', ')}`);
        console.log(`   Path: ${firstDoc.name}`);
      } else if (res.ok) {
        console.log(`⚠️  Collection "${col}" — empty or no docs`);
      } else {
        // Don't log 404s (collection doesn't exist)
        if (res.status !== 404) {
          console.log(`❌ Collection "${col}" — ${res.status}: ${data.error?.message || 'unknown'}`);
        }
      }
    } catch (e) {
      // skip
    }
  }

  // Also try listing collections via the listCollectionIds API
  console.log('\n--- Listing all root collections ---');
  try {
    const res = await fetch(`${baseUrl}:listCollectionIds`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (res.ok) {
      console.log('Root collections:', data.collectionIds || 'none');
    } else {
      console.log('listCollectionIds failed:', res.status, data.error?.message);
    }
  } catch (e) {
    console.log('listCollectionIds error:', e.message);
  }
}

// Step 3: Try Realtime Database
async function tryRTDB(token) {
  console.log('\n--- Firebase Realtime Database ---');
  const urls = [
    `https://${FIREBASE_PROJECT}-default-rtdb.firebaseio.com/.json?auth=${token}&shallow=true`,
    `https://${FIREBASE_PROJECT}-default-rtdb.asia-southeast1.firebasedatabase.app/.json?auth=${token}&shallow=true`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && !data.error) {
        console.log('✅ RTDB found! Root keys:', Object.keys(data));
      } else {
        console.log('RTDB:', data.error || `status ${res.status}`);
      }
    } catch (e) {
      console.log('RTDB not at:', url.split('?')[0]);
    }
  }
}

// Step 4: Try Next.js API routes on the site
async function trySiteAPI(token) {
  console.log('\n--- Next.js API Routes ---');
  const routes = [
    '/api/exams', '/api/questions', '/api/subjects', '/api/documents',
    '/api/materials', '/api/topics', '/api/user', '/api/auth',
    '/api/study', '/api/courses', '/api/exam-bank', '/api/question-bank',
    '/api/resources', '/api/files', '/api/download',
    '/api/trpc', // tRPC
  ];
  
  for (const route of routes) {
    try {
      const res = await fetch(`${SITE_URL}${route}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (res.status !== 404) {
        const text = await res.text();
        const preview = text.substring(0, 200);
        console.log(`${res.status === 200 ? '✅' : '⚠️'} ${route} — ${res.status} — ${preview}`);
      }
    } catch (e) {
      // skip 404s
    }
  }
}

// Step 5: Try reading RSC pages
async function tryRSCPages(token) {
  console.log('\n--- RSC Pages (Next.js App Router) ---');
  const pages = ['/study', '/exam', '/premium', '/dashboard', '/tai-lieu', '/de-thi', '/ngan-hang-cau-hoi'];
  
  for (const page of pages) {
    try {
      const res = await fetch(`${SITE_URL}${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'RSC': '1',
          'Next-Router-State-Tree': '%5B%22%22%5D',
        }
      });
      if (res.status !== 404) {
        const text = await res.text();
        // Look for data in RSC response
        const hasData = text.length > 100;
        console.log(`${res.status === 200 ? '✅' : '⚠️'} ${page} — ${res.status} — ${text.length} bytes`);
      }
    } catch (e) {
      // skip
    }
  }
}

async function main() {
  console.log('🔍 Exploring VN Securities Platform data sources...\n');
  
  const token = await refreshToken();
  
  await tryFirestore(token);
  await tryRTDB(token);
  await trySiteAPI(token);
  await tryRSCPages(token);
  
  console.log('\n✨ Exploration complete!');
}

main().catch(console.error);
