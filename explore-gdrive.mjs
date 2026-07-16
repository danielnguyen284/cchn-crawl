import { writeFileSync } from 'fs';

async function main() {
  const url = 'https://drive.google.com/drive/folders/1w6eXTf6xRPXxqG0XHuUQLjddigdxHneU';
  console.log(`Fetching Google Drive folder: ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  writeFileSync('raw/gdrive_folder.html', html);
  console.log(`Saved HTML (${html.length} bytes) to raw/gdrive_folder.html`);

  // Look for any JSON data inside window._state or similar
  const stateMatch = html.match(/window\s*\[\s*['"]_state['"]\s*\]\s*=\s*({.*?});/s) || 
                     html.match(/window\s*\._state\s*=\s*({.*?});/s);
  if (stateMatch) {
    console.log('Found window._state JSON!');
    writeFileSync('raw/gdrive_state.json', stateMatch[1]);
  } else {
    console.log('window._state not found via simple regex, checking for other JSON objects...');
  }

  // Look for resource keys or google drive file patterns
  // e.g., ["https://docs.google.com/...", "title"] or items/files
  const driveFileRegex = /"https:\/\/docs\.google\.com\/[^"]+"/g;
  const matches = html.match(driveFileRegex) || [];
  console.log(`Found ${matches.length} references to docs.google.com in HTML`);
  matches.slice(0, 10).forEach(m => console.log('  ', m));
}

main().catch(console.error);
