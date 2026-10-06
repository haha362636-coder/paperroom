// Maps paperroom://app/<path> to a file inside the bundled web folder.
// Anything that would escape the folder (.., encoded separators, other hosts) resolves to null.
const path = require('path');

const SCHEME = 'paperroom';
const HOST = 'app';
const ORIGIN = `${SCHEME}://${HOST}`;

function resolveWebFile(root, requestUrl) {
  let url;
  try { url = new URL(requestUrl); } catch { return null; }
  if (url.protocol !== `${SCHEME}:` || url.host !== HOST) return null;
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { return null; }
  if (rel.includes('\0') || rel.includes('\\')) return null;
  if (rel === '/' || rel === '') rel = '/index.html';
  const base = path.resolve(root);
  const file = path.resolve(base, '.' + rel);
  return file.startsWith(base + path.sep) ? file : null;
}

module.exports = { SCHEME, HOST, ORIGIN, resolveWebFile };
