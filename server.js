import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
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
  '.wasm': 'application/wasm'
};

const server = createServer(async (req, res) => {
  try {
    // 1. Remove query strings (e.g. ?v=1)
    const url = req.url.split('?')[0];
    
    // 2. Default to index.html
    let filePath = url === '/' ? 'index.html' : url;

    // 3. Remove leading slash if present (to avoid double slashes)
    if (filePath.startsWith('/')) {
        filePath = filePath.substring(1);
    }

    // 4. Construct absolute path
    const fullPath = join(__dirname, filePath);
    
    // Debug log (optional, check your Vercel logs with this)
    // console.log('Requesting:', fullPath);

    const ext = extname(fullPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    const content = await readFile(fullPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 404 Error
      console.error(`404 Not Found: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found</h1><p>The file could not be located.</p>', 'utf-8');
    } else {
      // 500 Error
      console.error(`Server Error: ${error.message}`);
      res.writeHead(500);
      res.end('Server Error: ' + error.code);
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
