// A simple HTTP server to serve the static files
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.url}`);
  
  // Handle root path
  let filePath = req.url === '/' 
    ? path.join(__dirname, 'public', 'index.html')
    : path.join(__dirname, req.url);
    
  console.log(`Debug - Initial filePath: ${filePath}`);
    
  // Handle root-level files
  if (req.url.startsWith('/') && !req.url.startsWith('/public/')) {
    const fileName = req.url.substring(1); // Remove leading '/'
    if (fs.existsSync(path.join(__dirname, 'public', fileName))) {
      filePath = path.join(__dirname, 'public', fileName);
    }
  }
  
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';
  
  // Check if filePath is a directory
  const isDirectory = fs.existsSync(filePath) && fs.statSync(filePath).isDirectory();
  if (isDirectory) {
    console.log(`Debug - filePath is a directory: ${filePath}`);
    filePath = path.join(filePath, 'index.html');
    console.log(`Debug - Updated filePath to: ${filePath}`);
  }
  
  // Log before attempting to read
  console.log(`Debug - Attempting to read: ${filePath}`);
  console.log(`Debug - File exists: ${fs.existsSync(filePath)}`);
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        console.error(`File not found: ${filePath}`);
        res.writeHead(404);
        res.end('File not found');
      } else {
        // Server error
        console.error(`Server error: ${error.code}`);
        console.error(`Error details: ${error.message}`);
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Success
      console.log(`Debug - Successfully served: ${filePath}`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`To view the project, open a browser and navigate to http://localhost:${PORT}/`);
});