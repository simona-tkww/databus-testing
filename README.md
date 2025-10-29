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

### 🚀 Quick Start

**Step 1: Start your local server (NEW TERMINAL)**
```bash
npm start
```
✅ Server starts at: https://localhost:8080

**Step 2: Create public tunnel (NEW TERMINAL)**
```bash
cloudflared tunnel --url https://localhost:8080 --no-tls-verify
```
✅ Look for the box showing your tunnel URL like:
```
+------------------------------------------------------------------------------+
|  https://random-words-here.trycloudflare.com                                |
+------------------------------------------------------------------------------+
```

**Step 3: Configure your databus**
Choose your endpoint based on testing needs:

**For SUCCESS testing (returns 200):**
```
https://andrea-levy-forgot-toolbox.trycloudflare.com/webhook/positive
```

**For FAILURE testing (returns 500):**
```
https://andrea-levy-forgot-toolbox.trycloudflare.com/webhook/negative
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
- **Webhook POSITIVE** (returns 200): https://localhost:8080/webhook/positive
- **Webhook NEGATIVE** (returns 500): https://localhost:8080/webhook/negative

## Configure Databus

**Choose your endpoint based on testing scenario:**

**For SUCCESS testing (databus gets 200 response):**
```
https://YOUR-TUNNEL-URL.trycloudflare.com/webhook/positive
```

**For FAILURE testing (databus gets 500 response):**
```
https://YOUR-TUNNEL-URL.trycloudflare.com/webhook/negative
```

**Examples:** If your tunnel shows `https://andrea-levy-forgot-toolbox.trycloudflare.com`, then use:
- Success: `https://andrea-levy-forgot-toolbox.trycloudflare.com/webhook/positive`
- Failure: `https://andrea-levy-forgot-toolbox.trycloudflare.com/webhook/negative`

**Important Notes:**
- Keep the tunnel terminal open - if you close it, the tunnel stops working
- The tunnel URL changes each time you restart it
- Update the databus configuration whenever you restart the tunnel

## Testing Both Success and Failure Scenarios

No more mode switching needed! Your server now has two endpoints:

### ✅ Test SUCCESS behavior:
1. **Configure databus** with: `https://your-tunnel-url.trycloudflare.com/webhook/positive`
2. **Send message**: `python3 send-message-to-databus.py`
3. **Result**: Databus gets 200 → Message delivered successfully

### ❌ Test FAILURE behavior:
1. **Configure databus** with: `https://your-tunnel-url.trycloudflare.com/webhook/negative`
2. **Send message**: `python3 send-message-to-databus.py`
3. **Result**: Databus gets 500 → Message failed, databus retries

### 📊 Monitor both scenarios:
- **Dashboard**: https://localhost:8080 shows all messages with endpoint and response code
- **Logs**: Terminal shows which endpoint received each message
- **Messages**: Both endpoints store messages, so you can see the full history
