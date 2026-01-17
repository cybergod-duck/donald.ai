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
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
};

const server = createServer(async (req, res) => {
  try {
    // Normalize URL path, remove query string, and default to index.html
    let filePath = normalize(req.url.split('?')[0].replace(/^\/+/, ''));
    if (!filePath || filePath === '/') filePath = 'index.html';

    const fullPath = join(__dirname, filePath);
    const fileStats = await stat(fullPath); // Early stat for existence and size
    if (!fileStats.isFile()) throw { code: 'ENOENT' };

    const ext = extname(fullPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = await readFile(fullPath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': fileStats.size,
    });
    res.end(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`404 Not Found: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1><p>The requested resource could not be located.</p>');
    } else {
      console.error(`Server Error: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Server Error: ${error.code || 'Unknown'}`);
    }
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}/`));
