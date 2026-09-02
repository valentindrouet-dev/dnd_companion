#!/usr/bin/env node
// Serveur statique minimal pour tester en local (et sur l'iPad via le Wi-Fi).
//   npm start        → http://localhost:8080
//   PORT=3000 npm start

import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname } from 'node:path';
import { networkInterfaces } from 'node:os';

const ROOT = process.cwd();
const PORT = Number(process.env.PORT) || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = normalize(join(ROOT, pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Interdit'); }
  let st;
  try { st = statSync(file); } catch { res.writeHead(404); return res.end('Introuvable : ' + pathname); }
  if (st.isDirectory()) { res.writeHead(301, { Location: pathname + '/' }); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Content-Length': st.size });
  createReadStream(file).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Compagnon D&D — serveur local\n  http://localhost:${PORT}/`);
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list) if (i.family === 'IPv4' && !i.internal) console.log(`  http://${i.address}:${PORT}/   (iPad sur le même Wi-Fi)`);
  }
});
