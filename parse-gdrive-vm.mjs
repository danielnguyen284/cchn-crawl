import { readFileSync, writeFileSync } from 'fs';
import vm from 'vm';

const html = readFileSync('raw/gdrive_decoded.html', 'utf8');

const ivdMatch = html.match(/window\s*\[\s*['_"]_DRIVE_ivd['_"]\s*\]\s*=\s*'([^']*)'/i) ||
                 html.match(/window\._DRIVE_ivd\s*=\s*'([^']*)'/i);

if (ivdMatch) {
  const content = ivdMatch[1];
  
  // Custom decode function that handles hex escapes but keeps the JSON string escaped validly
  function decodeHexEscapes(str) {
    return str.replace(/\\x([0-9a-fA-F]{2})/g, (match, grp) => {
      const char = String.fromCharCode(parseInt(grp, 16));
      // Escape control chars or quotes if necessary, but here we can evaluate it directly in JS
      return char;
    });
  }
  
  const decoded = decodeHexEscapes(content);
  
  // Use VM module to safely evaluate the array literal in Node.js
  const scriptStr = `const val = ${decoded}; val;`;
  try {
    const script = new vm.Script(scriptStr);
    const data = script.runInNewContext();
    console.log('Evaluated successfully using VM!');
    
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
    console.error('VM execution failed:', err.message);
  }
} else {
  console.log('Could not find window._DRIVE_ivd in HTML');
}
