# databus-testing

Testing setup for databus messaging system with publisher app and subscriber app.

## What This Does

This project simulates a complete databus messaging flow:

1. **Publisher App** (Python script) → Sends messages to databus
2. **Databus** → Stores message in a subject and forwards messages to a subsriber
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

### Step 1: Start the Message Receiver Server
```bash
npm run dev
```
✅ Server starts at: http://localhost:8080

### Step 2: Send a Test Message to databus
```bash
python3 send-message-to-databus.py
```
✅ Sends message to databus endpoint

## What You'll See

**✅ Publisher (Python script):**
```
SUCCESS! (HTTP 200)
Databus accepted your message.
```

**✅ Subscriber (Server):**
- **Dashboard**: http://localhost:8080 (monitor activity)
- **Webhook**: http://localhost:8080/webhook.response200.html (receives messages)

## Configure Databus

When setting up the databus system, use this as your subscriber endpoint:
```
http://localhost:8080/webhook.response200.html
```
