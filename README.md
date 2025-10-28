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

### Step 1: Start the Message Receiver Server
```bash
npm start
```
✅ Server starts at: https://localhost:8080
✅ Dashboard shows real-time messages

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
- **Dashboard**: https://localhost:8080 (monitor activity in real-time)  
- **Webhook**: https://localhost:8080/webhook/positive (receives messages)

## Configure Databus

Use this as your subscriber endpoint:
```
https://localhost:8080/webhook/positive
```

**Note:** The databus and your subscriber app need to be on the same network for localhost to work. If the databus is on a different server, use your IP address instead:
```
https://YOUR_IP_ADDRESS:8080/webhook/positive
```

To find your IP address, run: `ifconfig | grep "inet " | grep -v 127.0.0.1`
