import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync, createWriteStream } from 'fs';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';

const API_KEY = 'AIzaSyBHR6-29DkQW_lWsKiyq6M6aMI1Cn0nNm4';
const REFRESH_TOKEN = 'AMf-vByBGVOSkJ29Amn7xuWQwyBCLma76PAySXbxbMnyNT6hdOreRkRVbArp4w0S21B1RZ34skuF6qCvy5oGotmlVkKG65pidlz7U86YuHYu34O545gP3BKABdJlQYmzDNbr0Bur_624CVnE1_sJHimTvu8t_rSfUdbkbYCxdDzIl7FjZYpyIUvTI4j8yzKMCYs_XKybFFmj-JN5TJuCvn1TSYcOggPuvexRpj8vIc1DL0HRCJHak_JoeC64e1sNNibg6UVcRuthqNdJI9Ki2pmnGXOzdRaFXEqPpF2irePDFiVqVshpGg4eycPqL_KK7Z79ehn2GUYyEqcw7Z5ZGFvt09gViotoAIPlpT-tteDSQhN9NR454ndL52Ww8TQM4P3oxOKsa6xOoi_UK8yhD8M9dUtjsrsTvrHSLUJ2dVT70vBxjLQOYZdjeN0U3pZyXV2jsONlmNBt';
const SITE_URL = 'https://vn-securities-platform.vercel.app';

// Path mapping from key to folders
const PATH_MAPPING = {
  '_cfa_level-1.html': 'documents/cfa/level-1',
  '_cfa_level-2.html': 'documents/cfa/level-2',
  '_cmt_level-1.html': 'documents/cmt/level-1',
  '_cmt_level-2.html': 'documents/cmt/level-2',
  '_cmt_level-3.html': 'documents/cmt/level-3'
};

async function refreshToken() {
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${REFRESH_TOKEN}`
  });
  const data = await res.json();
  if (!data.id_token) {
    throw new Error('Failed to refresh Firebase token');
  }
  return data.id_token;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function downloadFileWithRetry(url, destPath, token, maxRetries = 3) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const res = await fetch(url, {
        headers: {
          'Cookie': `__session=${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }
      
      const fileStream = createWriteStream(destPath);
      await pipeline(res.body, fileStream);
      return;
    } catch (err) {
      attempt++;
      console.warn(`    ⚠️ [Attempt ${attempt}/${maxRetries}] Failed to download ${url}. Error: ${err.message}`);
      if (attempt >= maxRetries) {
        throw err;
      }
      await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
    }
  }
}

async function main() {
  console.log('🔄 Refreshing authentication token...');
  const token = await refreshToken();
  console.log('✅ Authentication token refreshed successfully.\n');

  // Load target file database
  const extractedDb = JSON.parse(readFileSync('raw-premium/extracted_files.json', 'utf8'));

  // Flatten and prepare the download list
  const queue = [];
  for (const [key, files] of Object.entries(extractedDb)) {
    const targetFolder = PATH_MAPPING[key];
    if (!targetFolder) continue;

    for (const file of files) {
      // Decode name and paths properly to avoid double escaping
      const decodedName = decodeURIComponent(file.name);
      const fileUrl = `${SITE_URL}${file.path}`;
      const destPath = join(targetFolder, decodedName);
      
      queue.push({
        name: decodedName,
        url: fileUrl,
        dest: destPath
      });
    }
  }

  console.log(`📋 Total files to download: ${queue.length}\n`);

  const CONCURRENCY_LIMIT = 3;
  let activeCount = 0;
  let index = 0;
  const total = queue.length;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  async function next() {
    if (index >= total) return;
    const task = queue[index++];
    const currentIdx = index;

    // Check resume capability
    if (existsSync(task.dest)) {
      const stats = statSync(task.dest);
      if (stats.size > 0) {
        console.log(`[${currentIdx}/${total}] ⏩ Skipping existing file: ${task.dest} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        skipCount++;
        return next();
      }
    }

    activeCount++;
    try {
      // Ensure target directory exists
      mkdirSync(dirname(task.dest), { recursive: true });
      
      console.log(`[${currentIdx}/${total}] 📥 Downloading: ${task.name}...`);
      await downloadFileWithRetry(task.url, task.dest, token);
      
      const stats = statSync(task.dest);
      console.log(`[${currentIdx}/${total}]  └─ ✅ Saved: ${task.dest} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      successCount++;
    } catch (err) {
      console.error(`[${currentIdx}/${total}] ❌ Failed to download ${task.name}:`, err.message);
      failCount++;
    } finally {
      activeCount--;
    }
    
    await next();
  }

  // Launch workers
  const workers = [];
  for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
    workers.push(next());
  }
  await Promise.all(workers);

  console.log('\n✨ Download finished!');
  console.log(`📊 Total: ${total} | Success: ${successCount} | Skipped: ${skipCount} | Failed: ${failCount}`);
}

main().catch(console.error);
