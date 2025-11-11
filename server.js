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
let successCount = 0;
let errorCount = 0;

// Helper function to handle webhook requests
function handleWebhook(req, res, endpoint, responseCode) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      messageCount++;
      if (responseCode === 200) {
        successCount++;
      } else {
        errorCount++;
      }
      const timestamp = new Date().toISOString();
      
      // Store the message
      receivedMessages.unshift({
        id: messageCount,
        timestamp: timestamp,
        data: data,
        headers: req.headers,
        endpoint: endpoint,
        responseCode: responseCode
      });

      // Keep only last 50 messages
      if (receivedMessages.length > 50) {
        receivedMessages = receivedMessages.slice(0, 50);
      }

      const emoji = responseCode === 200 ? '✅' : '❌';
      const type = responseCode === 200 ? 'POSITIVE' : 'NEGATIVE';
      console.log(`${emoji} Webhook ${type} received message #${messageCount} (returning ${responseCode}):`, data);

      // Return appropriate response
      const responseData = {
        status: responseCode === 200 ? 'success' : 'error',
        message: responseCode === 200 ? 'Webhook received successfully' : 'Webhook processing failed (simulated)',
        messageId: messageCount,
        timestamp: timestamp,
        endpoint: responseCode === 200 ? 'positive' : 'negative'
      };

      res.writeHead(responseCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseData));
    } catch (error) {
      console.error('Error parsing webhook data:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
}

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

  // Webhook endpoint that always returns 200 (success)
  if (pathname === '/webhook/positive' && req.method === 'POST') {
    handleWebhook(req, res, '/webhook/positive', 200);
    return;
  }

  // Webhook endpoint that always returns 500 (error)
  if (pathname === '/webhook/negative' && req.method === 'POST') {
    handleWebhook(req, res, '/webhook/negative', 500);
    return;
  }

  // API endpoint to get messages for dashboard
  if (pathname === '/api/messages' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      messages: receivedMessages,
      totalCount: messageCount,
      successCount: successCount,
      errorCount: errorCount
    }));
    return;
  }

  // Serve static files
  let filePath = '';
  if (pathname === '/') {
    filePath = './index.html';
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
  console.log(`✅ Webhook POSITIVE (returns 200): https://localhost:${PORT}/webhook/positive`);
  console.log(`❌ Webhook NEGATIVE (returns 500): https://localhost:${PORT}/webhook/negative`);
  console.log(`📊 Dashboard: https://localhost:${PORT}`);
});