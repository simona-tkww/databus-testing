# Databus Testing Suite

This is a testing setup for Databus messaging systems using Node.js. This project simulates a publisher app and subscriber app flow, with a local HTTPS server and public tunnel for webhook testing.

## 📦 Project Structure

```
backend/
  server.js                # HTTPS server, webhook endpoints, dashboard
  send-message-to-databus.js # Script to send test messages to Databus
  counter.json             # Tracks sent message count
  certs/                   # SSL certificates (key.pem, cert.pem)
frontend/
  index.html               # Dashboard UI
  styles.css               # Dashboard styles
  main.js                  # Dashboard JS
.env                       # Environment variables (created individually by each user; not included in the repository)
.gitignore                 # Ignores non-essential files
package.json               # Lists dependencies and project metadata
package-lock.json          # Locks exact versions of installed packages
README.md                  # Project documentation
```

## 🚀 Quick Start

### 1. Databus App Setup

Before running the project, make sure you have created at least three applications in Databus: 

- **Publisher App**: This app will send messages to Databus.
  - When creating the Publisher App, save the **auth key** and **auth secret**. You will need these values for your `.env` file.
- **Subscriber App (Happy Path)**: This app will receive messages and simulate successful processing.
- **Subscriber App (Negative Path)**: This app will receive messages and simulate error/retry/dlq scenarios.

After creating these apps:
- For the Publisher App, create a subject.
  - When creating the subject, save the **subject ID**. You will need this value for your `.env` file.

After creating the subject:
- Both Subscriber Apps should create subscriptions to this subject (one subscription per app).

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
DATABUS_API_KEY='your_api_key_here'
DATABUS_JWT_SECRET='your_jwt_secret_here'
DATABUS_SUBJECT_ID='your_subject_id_here'
DATABUS_ENDPOINT=https://dbus-qa.dataintel.xogrp.com/publish
```

> **Note:** Replace the values with your actual credentials. These credentials are provided when you create the publisher app and the subject in Databus.

### 5. Run the project

#### Option 1: Run via UI (Dashboard)

- First, start the local server by running the command in the terminal:
  ```bash
  node backend/server.js
  ```
- Open the dashboard in your browser: [https://localhost:8080](https://localhost:8080)
- Follow the instructions in the dashboard 'Setup' tab to prepare the endpoint and send messages
- Monitor messages in 'Mssages' tab
- Results after each step also can be viewed simultaneously in the terminal

#### Option 2: Run via Terminal (No UI)

- First, start the local server in one terminal window by running the command:
  ```bash
  node backend/server.js
  ```
- In another terminal terminal, create a public tunnel by running the command:
  ```bash
  cloudflared tunnel --url https://localhost:8080 --no-tls-verify 2>&1 | grep 'trycloudflare.com'
  ```
- Once the tunnel is created, combine it with the webhook path and add the full endpoint to the Databus subscription as an HTTPS endpoint:

  | Paths              | Response | Usage                    |
  |----------------------|----------|--------------------------|
  | /webhook/positive    | 200      | Test normal message flow |
  | /webhook/negative    | 500      | Test error/retry/dlq handling|

  Example: `https://your-tunnel-url.trycloudflare.com/webhook/positive`

- Send messages in a third terminal by running the command:
  ```bash
  node backend/send-message-to-databus.js
  ```
- You will see responses about sent messages in the third terminal, and responses about received messages in the first terminal

## 📝 Notes

- **Keep all three terminals open while testing**; Closing the first terminal stops the server and prevents the app from working, closing the second (tunnel) terminal stops public access, and closing the third terminal stops the message-sending process.
- **Update webhook URLs in Databus**; Every time you restart the tunnel, a new public URL is generated. You must update the webhook URLs in Databus with this new URL so messages can reach your local app.
- **SSL**: Self-signed certificates are used, so --no-tls-verify must be added for Cloudflared to bypass certificate verification.
- **Environment variables**: Set in `.env` (API keys, secrets, etc.).
- **Message counter**: `counter.json` tracks sent messages and persists between runs when using dashboard only.


## 💡 Troubleshooting

- If you see errors about missing environment variables, check your `.env` file.
- For SSL errors, ensure `cert.pem` and `key.pem` exist in `backend/certs/`.

