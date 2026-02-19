import { createServer } from 'http';
import { readFile, stat } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
};

const fileCache = new Map();
const MAX_CACHE_SIZE = 50;
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS_PER_WINDOW = 100;
const clientRequests = new Map();

async function getCachedFile(fullPath) {
  let cacheEntry = fileCache.get(fullPath);
  if (cacheEntry && cacheEntry.expiry > Date.now()) {
    return cacheEntry;
  }

  try {
    const fileStats = await stat(fullPath);
    if (!fileStats.isFile()) throw { code: 'ENOENT' };
    const content = await readFile(fullPath);
    cacheEntry = {
      stats: fileStats,
      content,
      expiry: Date.now() + 3600000, // 1 hour cache
    };
    fileCache.set(fullPath, cacheEntry);

    if (fileCache.size > MAX_CACHE_SIZE) {
      const oldestKey = [...fileCache.keys()][0];
      fileCache.delete(oldestKey);
    }

    return cacheEntry;
  } catch (error) {
    throw error;
  }
}

function checkRateLimit(clientIp) {
  const now = Date.now();
  let requests = clientRequests.get(clientIp) || [];
  requests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  if (requests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  requests.push(now);
  clientRequests.set(clientIp, requests);
  return true;
}

const server = createServer(async (req, res) => {
  const clientIp = req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'text/plain' });
    res.end('Too Many Requests');
    return;
  }

  try {
    let filePath = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[\/\\])+/, '').replace(/^\/+/, '');
    if (!filePath || filePath === '/') filePath = 'index.html';

    const fullPath = join(__dirname, filePath);
    const { stats: fileStats, content } = await getCachedFile(fullPath);

    const ext = extname(fullPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileStats.size,
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1><p>The requested resource could not be located.</p>');
    } else {
      console.error(`Server Error for ${req.url}: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server Error');
    }
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`));