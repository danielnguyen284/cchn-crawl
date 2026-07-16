import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('raw/gdrive_decoded.html', 'utf8');

// Since window['_DRIVE_ivd'] contains the serialized JS array, let's find it.
// Format: window['_DRIVE_ivd'] = '...';
const ivdMatch = html.match(/window\s*\[\s*['_"]_DRIVE_ivd['_"]\s*\]\s*=\s*'([^']*)'/i) ||
                 html.match(/window\._DRIVE_ivd\s*=\s*'([^']*)'/i);

if (ivdMatch) {
  const content = ivdMatch[1];
  console.log(`Found window['_DRIVE_ivd'] of length ${content.length}`);
  
  // The content is escaped using hex codes like \x5b, \x22, \x5d
  // Let's decode it.
  function decodeHexEscapes(str) {
    return str.replace(/\\x([0-9a-fA-F]{2})/g, (match, grp) => {
      return String.fromCharCode(parseInt(grp, 16));
    });
  }
  
  const decoded = decodeHexEscapes(content);
  writeFileSync('raw/gdrive_ivd_decoded.json', decoded);
  console.log('Saved decoded ivd to raw/gdrive_ivd_decoded.json');
  
  // Now parse the decoded JSON (which is a multi-dimensional array)
  try {
    const data = JSON.parse(decoded);
    console.log('Parsed successfully!');
    
    // Let's extract file details from this array structure.
    // The structure typically starts with [[["id", ["folderId"], "name", "mime", ...]]]
    const files = [];
    if (Array.isArray(data) && Array.isArray(data[0])) {
      for (const item of data[0]) {
        if (Array.isArray(item) && item.length > 3) {
          const [id, folderArray, name, mimeType] = item;
          if (typeof id === 'string' && Array.isArray(folderArray) && typeof name === 'string' && typeof mimeType === 'string') {
            files.push({
              id,
              folderId: folderArray[0],
              name,
              mimeType,
              url: `https://drive.google.com/file/d/${id}/view`,
              downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`
            });
          }
        }
      }
    }
    
    console.log(`Extracted ${files.length} files:`);
    console.log(JSON.stringify(files, null, 2));
    writeFileSync('raw/gdrive_extracted_files.json', JSON.stringify(files, null, 2));
    
  } catch (err) {
    console.error('Failed to parse decoded JSON:', err.message);
  }
} else {
  console.log('Could not find window._DRIVE_ivd in HTML');
}
