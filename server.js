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
      
      // Start cloudflared tunnel
      console.log('🌐 Starting cloudflared tunnel with command: cloudflared tunnel --url https://localhost:8080 --no-tls-verify');
      tunnelProcess = spawn('cloudflared', ['tunnel', '--url', 'https://localhost:8080', '--no-tls-verify'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      console.log('✓ Tunnel process spawned with PID:', tunnelProcess.pid);
      
      // Capture output to extract tunnel URL
      tunnelProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[STDOUT]:', output);
        
        // Look for the tunnel URL in the output
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !tunnelUrl) {
          tunnelUrl = urlMatch[0];
          tunnelStatus = 'running';
          console.log('✅ Tunnel URL detected:', tunnelUrl);
        }
      });
      
      tunnelProcess.stderr.on('data', (data) => {
        const output = data.toString();
        console.log('[STDERR]:', output);
        
        // Check for rate limiting
        if (output.includes('429 Too Many Requests') || output.includes('error code: 1015')) {
          console.error('⚠️ Cloudflare rate limit detected - too many tunnel requests');
          tunnelStatus = 'rate_limited';
        }
        
        // Also check stderr for URL (cloudflared outputs to stderr)
        const urlMatch = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (urlMatch && !tunnelUrl) {
          tunnelUrl = urlMatch[0];
          tunnelStatus = 'running';
          console.log('✅ Tunnel URL detected:', tunnelUrl);
        }
      });
      
      tunnelProcess.on('error', (error) => {
        console.error('❌ Tunnel process error:', error);
        console.error('This usually means cloudflared is not installed or not in PATH');
        tunnelStatus = 'error';
        tunnelProcess = null;
      });
      
      tunnelProcess.on('close', (code) => {
        console.log(`🔴 Tunnel process exited with code ${code}`);
        tunnelStatus = 'stopped';
        tunnelUrl = null;
        tunnelProcess = null;
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Tunnel starting...', pid: tunnelProcess.pid }));
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
      console.log('📤 Executing: python3 send-message-to-databus.py');
      
      const pythonProcess = spawn('python3', ['send-message-to-databus.py'], {
        cwd: __dirname,
        shell: true,
        env: process.env
      });
      
      let output = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('[Python STDOUT]:', data.toString());
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log('[Python STDERR]:', data.toString());
      });
      
      pythonProcess.on('close', (code) => {
        console.log(`Python process exited with code ${code}`);
        
        if (code === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            output: output || 'Message sent successfully!',
            code: code
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: false, 
            error: errorOutput || output || 'Failed to send message',
            code: code
          }));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.error('❌ Error executing Python script:', error);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Failed to execute Python script. Make sure Python 3 is installed.'
        }));
      });
    } catch (error) {
      console.error('❌ Error in send-message handler:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
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