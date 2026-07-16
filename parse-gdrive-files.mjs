import { readFileSync, writeFileSync } from 'fs';

const html = readFileSync('raw/gdrive_decoded.html', 'utf8');

// The file entry structure in Google Drive init data window['_DRIVE_ivd'] looks like:
// [[["1liY6Duh1TDVWaBWiAjzJunAELMWBSCxR",["1w6eXTf6xRPXxqG0XHuUQLjddigdxHneU"],"GIÁO TRÌNH CƠ BẢN","application/pdf",...
// Let's write a regular expression to extract these arrays

// We can find files by looking for:
// ["<id>", ["<folderId>"], "<filename>", "<mimeType>"
const fileRegex = /\["([a-zA-Z0-9_-]{25,50})",\s*\["([a-zA-Z0-9_-]{25,50})"\],\s*"([^"]+)",\s*"([^"]+)"/g;
let match;
const files = [];

while ((match = fileRegex.exec(html)) !== null) {
  files.push({
    id: match[1],
    folderId: match[2],
    name: match[3],
    mimeType: match[4],
    url: `https://drive.google.com/file/d/${match[1]}/view`
  });
}

console.log(`Found ${files.length} files matching regex pattern:`);
console.log(JSON.stringify(files, null, 2));

writeFileSync('raw/gdrive_files.json', JSON.stringify(files, null, 2));
