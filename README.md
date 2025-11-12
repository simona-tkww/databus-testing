# Databus Testing Suite

This is a testing setup for Databus messaging systems using Node.js. This project simulates a publisher app and subscriber app flow, with a local HTTPS server and public tunnel for webhook testing.

## 📦 Project Structure

```
backend/
  server.js                # HTTPS server, webhook endpoints, dashboard
  send-message-to-databus.js # Script to send test messages to DataBus
  counter.json             # Tracks sent message count
  certs/                   # SSL certificates (key.pem, cert.pem)
frontend/
  index.html               # Dashboard UI
  styles.css               # Dashboard styles
  main.js                  # Dashboard JS
.env                       # Environment variables
.gitignore                 # Ignores non-essential files
README.md                  # Project documentation
```

## 🚀 Quick Start

### 1. Databus App Setup

Before running the project, make sure you have created at least three apps in your Databus system:

- **Publisher App**: This app will send messages to Databus.
  - When creating the Publisher App, save the **auth key** and **auth secret**. You will need these values for your `.env` file.
- **Subscriber App (Happy Path)**: This app will receive messages and simulate successful processing.
- **Subscriber App (Negative Path)**: This app will receive messages and simulate error/retry scenarios.

After creating these apps:
- For the Publisher App, create a subject.
  - When creating the subject, save the **subject ID**. You will need this value for your `.env` file.
- Both Subscriber Apps should subscribe to this subscription.

### 2. Clone the repository

```bash
git clone https://github.com/simona-tkww/databus-testing.git
cd databus-testing
```

### 3. Install dependencies

After cloning the repository, run:

```bash
npm install
```

This will install all required Node.js packages (`axios`, `dotenv`, `jsonwebtoken`) listed in `package.json`.

### 4. Create and configure your `.env` file

Create a file named `.env` in the project root with the following variables:

```
DATABUS_API_KEY=your_api_key_here
DATABUS_JWT_SECRET=your_jwt_secret_here
DATABUS_SUBJECT_ID=your_subject_id_here
DATABUS_ENDPOINT=https://dbus-qa.dataintel.xogrp.com/publish
```

> **Note:** Replace the values with your actual credentials. These credentials are provided when you create the publisher app and the subject in Databus.

### 5. Run the project

#### Option 1: Run via UI (Dashboard)

1. **Start the local server**
   ```bash
   node backend/server.js
   ```
   - Access the dashboard at: https://localhost:8080
   - Webhook endpoints:
     - Success: https://localhost:8080/webhook/positive
     - Failure: https://localhost:8080/webhook/negative

2. **Create a public tunnel**
   ```bash
   cloudflared tunnel --url https://localhost:8080 --no-tls-verify 2>&1 | grep 'trycloudflare.com'
   ```
   - Copy the generated tunnel URL (e.g., https://random-words.trycloudflare.com)
   - Use this URL for webhook testing from external services.

3. **Send messages using the dashboard UI**
   - Open the dashboard in your browser
   - Use the UI to trigger test messages and monitor results

#### Option 2: Run via Terminal (No UI)

1. **Start the local server**
   ```bash
   node backend/server.js
   ```

2. **Create a public tunnel**
   ```bash
   cloudflared tunnel --url https://localhost:8080 --no-tls-verify 2>&1 | grep 'trycloudflare.com'
   ```

3. **Send a test message**
   ```bash
   node backend/send-message-to-databus.js
   ```
   - Check Terminal output for success or error messages

## 🔗 Webhook Endpoints

| Endpoint                | Response | Usage                      |
|------------------------|----------|----------------------------|
| `/webhook/positive`    | 200      | Test normal message flow   |
| `/webhook/negative`    | 500      | Test error/retry handling  |

- Example: `https://your-tunnel-url.trycloudflare.com/webhook/positive`

## 📝 Notes

- **Keep the tunnel terminal open**; closing it stops public access.
- **Update webhook URLs** if you restart the tunnel (URL changes each time).
- **SSL**: Self-signed certs are used; `--no-tls-verify` is required for cloudflared.
- **Environment variables**: Set in `.env` (API keys, secrets, etc.).
- **Message counter**: `counter.json` tracks sent messages and persists between runs.

## 📂 File Hygiene

- `.gitignore` should include:
  ```
  *.log
  backend/certs/
  counter.json
  .env
  ```

## 💡 Troubleshooting

- If you see errors about missing environment variables, check your `.env` file.
- For SSL errors, ensure `cert.pem` and `key.pem` exist in `backend/certs/`.
- For tunnel issues, make sure `cloudflared` is installed and in your PATH.

---

Enjoy testing your Databus integration with a clean, JavaScript-only setup!
