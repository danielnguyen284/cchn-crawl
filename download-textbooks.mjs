import { writeFileSync, readFileSync, existsSync, mkdirSync, createWriteStream } from 'fs';
import { join } from 'path';

async function downloadFile(id, name) {
  const outputDir = 'documents';
  mkdirSync(outputDir, { recursive: true });
  const filename = `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
  const filepath = join(outputDir, filename);

  if (existsSync(filepath)) {
    console.log(`\n⏭️  ${filename} already exists.`);
    return;
  }

  console.log(`\n📥 Starting download for: ${name} (ID: ${id})`);
  
  const url = `https://drive.google.com/uc?export=download&id=${id}`;
  
  try {
    let res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch initial page: HTTP ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    let downloadUrl = url;

    if (contentType.includes('text/html')) {
      const html = await res.text();
      
      const formMatch = html.match(/<form\s+id="download-form"\s+action="([^"]+)"[^>]*>([\s\S]*?)<\/form>/i);
      if (formMatch) {
        const actionUrl = formMatch[1];
        const formHtml = formMatch[2];
        
        const params = new URLSearchParams();
        const inputRegex = /<input\s+[^>]*type="hidden"[^>]*>/gi;
        let match;
        while ((match = inputRegex.exec(formHtml)) !== null) {
          const inputTag = match[0];
          const nameAttr = inputTag.match(/name="([^"]+)"/i);
          const valueAttr = inputTag.match(/value="([^"]+)"/i);
          if (nameAttr && valueAttr) {
            params.append(nameAttr[1], valueAttr[1]);
          }
        }
        
        downloadUrl = `${actionUrl}?${params.toString()}`;
        console.log(`🔗 Constructed download URL: ${downloadUrl}`);
        
        res = await fetch(downloadUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch confirmed download: HTTP ${res.status}`);
        }
      } else {
        writeFileSync('raw/gdrive_download_error.html', html);
        throw new Error(`Google Drive returned HTML but no confirmation form was found. Saved HTML to raw/gdrive_download_error.html`);
      }
    }

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    console.log(`📦 File size: ${totalBytes ? (totalBytes / 1024 / 1024).toFixed(2) + ' MB' : 'unknown size'}`);

    const fileStream = createWriteStream(filepath);
    const reader = res.body.getReader();
    let downloadedBytes = 0;
    let lastLogTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      fileStream.write(Buffer.from(value));
      downloadedBytes += value.length;

      // Log progress every 2 seconds or when finished
      const now = Date.now();
      if (now - lastLogTime > 2000) {
        const percent = totalBytes ? ((downloadedBytes / totalBytes) * 100).toFixed(1) + '%' : 'N/A';
        const mb = (downloadedBytes / 1024 / 1024).toFixed(2);
        console.log(`⏳ Downloaded ${mb} MB (${percent})`);
        lastLogTime = now;
      }
    }

    fileStream.end();
    console.log(`✅ Successfully downloaded ${filename} (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
  } catch (e) {
    console.error(`❌ Failed to download ${name}:`, e.message);
    if (existsSync(filepath)) {
      try { fileStream.close(); } catch(e) {}
    }
  }
}

async function main() {
  const rawData = readFileSync('raw/gdrive_extracted_files.json', 'utf8');
  const files = JSON.parse(rawData);

  console.log(`Found ${files.length} textbooks to download.`);
  for (const file of files) {
    await downloadFile(file.id, file.name);
  }
  console.log('\n✨ Download process finished!');
}

main().catch(console.error);
