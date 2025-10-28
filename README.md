# databus-testing

Testing setup for databus messaging system with publisher and subscriber apps.

## What This Does

This project simulates a complete databus messaging flow:

1. **Publisher App** (Python script) → Sends messages to databus
2. **Databus** → Stores message in a subject and forwards messages to a subscriber
3. **Subscriber App** (Local server) → Receives messages from databus

## Requirements

- **Python 3.11+** (for the publisher)
- **Node.js** (for the subscriber server)

## Setup

1. **Install Python packages:**
```bash
pip install requests PyJWT
```

2. **Install Node.js dependencies:**
```bash
npm install
```

## How to Use

### 🚀 Quick Start (First Time Setup)

**Step 1: Start your local server**
```bash
npm start
```
✅ Server starts at: https://localhost:8080

**Step 2: Create public tunnel (NEW TERMINAL)**
```bash
cloudflared tunnel --url localhost:8080
```
✅ Look for the box showing your tunnel URL like:
```
+------------------------------------------------------------------------------+
|  https://random-words-here.trycloudflare.com                                |
+------------------------------------------------------------------------------+
```

**Step 3: Configure your databus**
Use this as your endpoint:
```
https://random-words-here.trycloudflare.com/webhook/positive
```

**Step 4: Test the flow**
```bash
python3 send-message-to-databus.py
```
✅ Sends message to databus → databus forwards to your tunnel → your server receives it

**Step 5: Monitor messages**
- Dashboard: https://localhost:8080 (see received messages)
- Keep both terminals open!

## What You'll See

**✅ Publisher (Python script):**
```
SUCCESS! (HTTP 200)
Databus accepted your message.
```

**✅ Subscriber (Server):**
- **Dashboard**: https://localhost:8080 (monitor activity in real-time)  
- **Webhook**: https://localhost:8080/webhook/positive (receives messages)

## Configure Databus

**Use this endpoint in your databus configuration:**
```
https://YOUR-TUNNEL-URL.trycloudflare.com/webhook/positive
```

**Example:** If your tunnel shows `https://fonts-human-riders-seminar.trycloudflare.com`, then use:
```
https://fonts-human-riders-seminar.trycloudflare.com/webhook/positive
```

**Important Notes:**
- Keep the tunnel terminal open - if you close it, the tunnel stops working
- The tunnel URL changes each time you restart it
- Update the databus configuration whenever you restart the tunnel
