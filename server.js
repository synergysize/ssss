import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8081;

// MIME types for different file extensions
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.csv': 'text/csv',
};

// Create the server
const server = http.createServer((req, res) => {
    console.log(`Request for ${req.url}`);
    
    // Parse the URL to get the pathname
    let pathname = req.url;
    
    // Default to index.html if root is requested
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Handle CSV file requests specially
    if (pathname.includes('fartcoin.csv') || pathname.includes('goattoken.csv')) {
        const csvFile = pathname.includes('fartcoin.csv') ? 
            '/home/computeruse/.anthropic/ssslaunch3/fartcoin.csv' : 
            '/home/computeruse/.anthropic/ssslaunch3/goattoken.csv';
        
        fs.readFile(csvFile, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': 'text/csv' });
            res.end(data);
        });
        return;
    }
    
    // Determine the file path
    let filePath = path.join(__dirname, pathname);
    
    // Get the file extension
    const ext = path.extname(filePath);
    
    // Read the file
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        // Set the content type based on the file extension
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Serving files from: ${__dirname}`);
});