const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Read SSL certificates
const privateKey = fs.readFileSync('key.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Store messages for the dashboard
let receivedMessages = [];
let messageCount = 0;
let successCount = 0;
let errorCount = 0;
let sentMessageCount = 0;

// Tunnel management
let tunnelProcess = null;
let tunnelUrl = null;
let tunnelStatus = 'stopped';

// Helper function to handle webhook requests
function handleWebhook(req, res, endpoint, responseCode) {
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  req.on('end', () => {
    try {
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
  const reqUrl = new URL(req.url, `https://${req.headers.host}`);
  const pathname = reqUrl.pathname;

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

  // API endpoint to start tunnel
  if (pathname === '/api/tunnel/start' && req.method === 'POST') {
    // If tunnel is already running, kill it first to generate a new endpoint
    if (tunnelProcess) {
      console.log('🔄 Stopping existing tunnel to generate new endpoint...');
      try {
        tunnelProcess.kill();
        tunnelProcess = null;
        tunnelUrl = null;
        tunnelStatus = 'stopped';
      } catch (error) {
        console.error('Error killing tunnel process:', error);
      }
      // Wait a bit for the process to fully terminate
      setTimeout(() => {
        startNewTunnel(res);
      }, 1000);
      return;
    }

    startNewTunnel(res);
    return;
  }

  // Helper function to start tunnel
  function startNewTunnel(res) {
    try {
      tunnelStatus = 'starting';
      tunnelUrl = null;
      let responded = false;
      let timeout;

      // Start cloudflared tunnel
      console.log('🌐 Starting cloudflared tunnel with command: cloudflared tunnel --url https://localhost:8080 --no-tls-verify');
      tunnelProcess = spawn('cloudflared', ['tunnel', '--url', 'https://localhost:8080', '--no-tls-verify'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      console.log('✓ Tunnel process spawned with PID:', tunnelProcess.pid);

      function respondWithTunnel(url) {
        if (!responded) {
          responded = true;
          clearTimeout(timeout);
          tunnelStatus = url ? 'running' : 'error';
          res.writeHead(url ? 200 : 500, { 'Content-Type': 'application/json' });
          if (url) {
            res.end(JSON.stringify({ success: true, url }));
          } else {
            res.end(JSON.stringify({ success: false, error: 'Error: Too many requests. Please try again in 5-10 minutes.' }));
          }
        }
      }

      // Wait max 30 seconds for tunnel URL
      timeout = setTimeout(() => {
        respondWithTunnel(tunnelUrl);
      }, 30000);

      // Capture output to extract tunnel URL
      function checkForUrl(output) {
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch) {
          tunnelUrl = urlMatch[0];
          console.log('✅ Tunnel URL detected:', tunnelUrl);
          respondWithTunnel(tunnelUrl);
        }
      }

      tunnelProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[STDOUT]:', output);
        checkForUrl(output);
      });

      tunnelProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('[STDERR]:', output);
        // Check for rate limiting
        if (output.includes('429 Too Many Requests') || output.includes('error code: 1015')) {
          console.error('⚠️ Cloudflare rate limit detected - too many tunnel requests');
          tunnelStatus = 'rate_limited';
        }
        checkForUrl(output);
      });

      tunnelProcess.on('error', (error) => {
        console.error('❌ Tunnel process error:', error);
        console.error('This usually means cloudflared is not installed or not in PATH');
        tunnelStatus = 'error';
        tunnelProcess = null;
        respondWithTunnel(null);
      });

      tunnelProcess.on('close', (code) => {
        console.log(`🔴 Tunnel process exited with code ${code}`);
        tunnelStatus = 'stopped';
        // Only respond with error if tunnelUrl was never detected
        if (!responded) {
          respondWithTunnel(tunnelUrl);
        }
        tunnelProcess = null;
      });
    } catch (error) {
      console.error('❌ Error starting tunnel:', error);
      console.error('Error details:', error.message);
      tunnelStatus = 'error';
      res.writeHead(500, { 'Content-Type': 'application/json' });
      // Use generic error message to prevent XSS
      res.end(JSON.stringify({ success: false, error: 'Failed to start tunnel. Please check if cloudflared is installed.' }));
    }
  }

  // API endpoint to get tunnel status
  if (pathname === '/api/tunnel/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: tunnelStatus,
      url: tunnelUrl,
      running: tunnelProcess !== null
    }));
    return;
  }

  // API endpoint to send message to DataBus
  if (pathname === '/api/send-message' && req.method === 'POST') {
    try {
      console.log('✉️ Executing: node send-message-to-databus.js');
      const nodeProcess = spawn('node', ['send-message-to-databus.js'], {
        cwd: __dirname,
        env: process.env
      });
      let output = '';
      let errorOutput = '';
      nodeProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('[Node STDOUT]:', data.toString());
      });
      nodeProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('[Node STDERR]:', data.toString());
      });
      nodeProcess.on('close', (code) => {
        function escapeHtml(str) {
          if (typeof str !== 'string') return str;
          return str.replace(/[&<>'"`]/g, function (c) {
            return {
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              "'": '&#39;',
              '"': '&quot;',
              '`': '&#96;'
            }[c];
          });
        }
        if (code === 0) {
          sentMessageCount++;
          console.log('✔️ Message sent successfully and Databus accepted your message!');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            output: `#${sentMessageCount} Message sent successfully! Check it in messages section ✓`,
            code: code
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: escapeHtml(errorOutput || output || 'Failed to send message'),
            code: code
          }));
        }
      });
      nodeProcess.on('error', (error) => {
        console.error('❌ Error executing Node script:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Failed to execute Node script. Make sure Node.js is installed.'
        }));
      });
    } catch (error) {
      console.error('❌ Error in send-message handler:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      function escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"`]/g, function (c) {
          return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;',
            '`': '&#96;'
          }[c];
        });
      }
      res.end(JSON.stringify({ success: false, error: escapeHtml(error.message) }));
    }
    return;
  }

  // Serve static files
  let filePath = '';
  if (pathname === '/') {
    filePath = './index.html';
  } else {
    // Sanitize pathname to prevent path traversal
    const safePath = pathname.replace(/\.\./g, '');
    filePath = path.join(__dirname, safePath);
  }

  // Validate that the resolved path is within the current directory
  const resolvedPath = path.resolve(filePath);
  const baseDir = path.resolve(__dirname);
  
  if (!resolvedPath.startsWith(baseDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if file exists and serve it
  // Simple rate limiting: allow max 5 reads per second
  let lastReadTimestamps = [];
  function canReadFile() {
    const now = Date.now();
    lastReadTimestamps = lastReadTimestamps.filter(ts => now - ts < 1000);
    if (lastReadTimestamps.length < 5) {
      lastReadTimestamps.push(now);
      return true;
    }
    return false;
  }

  if (!canReadFile()) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Rate limit exceeded. Try again later.' }));
    return;
  }
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
  console.log(`🟣 Subscriber App running at https://localhost:${PORT}`);
  console.log(`🟢 Webhook POSITIVE (returns 200): https://localhost:${PORT}/webhook/positive`);
  console.log(`🔴 Webhook NEGATIVE (returns 500): https://localhost:${PORT}/webhook/negative`);
  console.log(`🔵 Dashboard: https://localhost:${PORT}`);
});