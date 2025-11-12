# Databus Testing Suite

A complete testing setup for databus messaging systems with publisher and subscriber apps.

## 📋 Overview

This project simulates a complete databus messaging flow:

1. **Publisher App** (Python script) → Sends authenticated messages to databus
2. **Databus** → Stores messages and forwards them to subscribers  
3. **Subscriber App** (Local HTTPS server) → Receives webhook messages from databus


## 🔧 Prerequisites

- **Python 3.11+** with pip
- **Node.js** (any recent version)
- **Cloudflared** tunnel (for public access)

---

## ⚡ Quick Start

### 1️⃣ Install Dependencies

```bash
# Install Python packages
pip install requests PyJWT
```

**Note:** No Node.js dependencies needed - server uses built-in modules only!

### 2️⃣ Start Local Server

**Open Terminal 1:**
```bash
node server.js
```

**Expected output:**
```
🚀 Subscriber App running at https://localhost:8080
✅ Webhook POSITIVE (returns 200): https://localhost:8080/webhook/positive
❌ Webhook NEGATIVE (returns 500): https://localhost:8080/webhook/negative
📊 Dashboard: https://localhost:8080
```

### 3️⃣ Create Public Tunnel

**Open Terminal 2:**
```bash

cloudflared tunnel --url https://localhost:8080 --no-tls-verify 2>&1 | grep 'trycloudflare.com'
```

**Look for your tunnel URL:**
```
+------------------------------------------------------------------------------+
|  https://random-words-here.trycloudflare.com                                |
+------------------------------------------------------------------------------+
```

### 4️⃣ Configure Databus

Choose your webhook endpoint based on testing scenario:

| Test Scenario | Endpoint | Response | Usage |
|---------------|----------|----------|-------|
| **Success Testing** | `/webhook/positive` | Always 200 | Test normal message delivery |
| **Failure Testing** | `/webhook/negative` | Always 500 | Test retry/error handling |

**Example URLs:**
- Success: `https://your-tunnel-url.trycloudflare.com/webhook/positive`  
- Failure: `https://your-tunnel-url.trycloudflare.com/webhook/negative`

### 5️⃣ Send Test Message

**Open Terminal 3:**
```bash
python3 send-message-to-databus.py
```

**Expected output:**
```
SUCCESS! (HTTP 200)
Databus accepted your message.
```

### 6️⃣ Monitor Results

- **📊 Dashboard**: https://localhost:8080 (real-time message monitoring)
- **🖥️ Server logs**: Check Terminal 1 for webhook activity
- **🔍 Message details**: Dashboard shows endpoint, response codes, and data



## ⚠️ Important Notes

### Tunnel Management
- **Keep Terminal 2 open** - closing stops the tunnel
- **URL changes** on each restart - update databus config accordingly
- **SSL handling** - `--no-tls-verify` flag required for self-signed certs
