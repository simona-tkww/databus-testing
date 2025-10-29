const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Read SSL certificates
const privateKey = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Store messages for the dashboard
let receivedMessages = [];
let messageCount = 0;

// Response mode: 'success' or 'error'
let responseMode = 'success';

// Serve static files and handle API endpoints
const server = https.createServer(credentials, (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API endpoint for webhook
  if (pathname === '/webhook/positive' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        messageCount++;
        const timestamp = new Date().toISOString();
        
        // Store the message
        receivedMessages.unshift({
          id: messageCount,
          timestamp: timestamp,
          data: data,
          headers: req.headers
        });

        // Keep only last 50 messages
        if (receivedMessages.length > 50) {
          receivedMessages = receivedMessages.slice(0, 50);
        }

        console.log(`📨 Webhook received message #${messageCount}:`, data);

        // Response based on current mode
        if (responseMode === 'success') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'success', 
            message: 'Webhook received successfully',
            messageId: messageCount,
            timestamp: timestamp
          }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'error', 
            message: 'Server intentionally returning 500 error',
            messageId: messageCount,
            timestamp: timestamp
          }));
        }
      } catch (error) {
        console.error('Error parsing webhook data:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API endpoint to get messages for dashboard
  if (pathname === '/api/messages' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      messages: receivedMessages,
      totalCount: messageCount
    }));
    return;
  }

  // API endpoint to set response mode
  if (pathname === '/api/mode' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.mode === 'success' || data.mode === 'error') {
          responseMode = data.mode;
          console.log(`🔧 Response mode changed to: ${responseMode}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'success', 
            message: `Response mode set to ${responseMode}`,
            currentMode: responseMode
          }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid mode. Use "success" or "error"' }));
        }
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // API endpoint to get current mode
  if (pathname === '/api/mode' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      currentMode: responseMode
    }));
    return;
  }

  // Serve static files
  let filePath = '';
  if (pathname === '/') {
    filePath = './index.html';
  } else if (pathname === '/webhook/positive') {
    filePath = './webhook/positive/index.html';
  } else {
    filePath = '.' + pathname;
  }

  // Check if file exists and serve it
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    // Determine content type
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'application/javascript';
    if (ext === '.css') contentType = 'text/css';
    if (ext === '.json') contentType = 'application/json';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Subscriber App running at https://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: https://localhost:${PORT}/webhook/positive`);
  console.log(`📊 Dashboard: https://localhost:${PORT}`);
});