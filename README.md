# databus-testing

Python script for sending test messages to the databus endpoint.

## Requirements

- Python 3.11+ 
- Packages: `requests` and `PyJWT`
- Node.js (for running the subscriber app server)

## Setup

1. Install Python packages:
```bash
pip install requests PyJWT
```

2. Install Node.js dependencies:
```bash
npm install
```

## Usage

### Send Message to databus
```bash
python3 send-message-to-databus.py
```

### Run Subscriber App (Message Receiver)
```bash
npm run dev
```

Then open: http://localhost:8080

## Expected Output

**Python Script:**
```
SUCCESS! (HTTP 200)
Databus accepted your message.
```

**Subscriber App:**
- Dashboard at http://localhost:8080
- Webhook endpoint at http://localhost:8080/webhook.response200.html
