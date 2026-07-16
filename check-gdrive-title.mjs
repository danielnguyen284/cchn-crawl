import { readFileSync } from 'fs';

const html = readFileSync('raw/gdrive_folder.html', 'utf8');

const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
console.log('Title:', titleMatch ? titleMatch[1].trim() : 'No title');

const bodyText = html.replace(/<[^>]*>/g, ' ').substring(0, 1000).trim();
console.log('Body Text (first 1000 chars):', bodyText.replace(/\s+/g, ' '));
