require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');
const axios = require('axios');
const fs = require('fs');

// --- 1. CONFIGURATION ---
// Load from environment variables or set defaults
const api_key = process.env.DATABUS_API_KEY;
const jwt_secret = process.env.DATABUS_JWT_SECRET;
const subject_id = process.env.DATABUS_SUBJECT_ID;
const endpoint = process.env.DATABUS_ENDPOINT;
const counterFile = 'counter.json';

// --- 2. IMPROVED TOKEN GENERATION ---
console.log("Generating token...");

// Current time in UNIX timestamp format (seconds)
const now_timestamp = Math.floor(Date.now() / 1000);

// Define validity periods
// nbf (Not Before): Valid since 60 seconds ago (to avoid clock skew)
const not_before = now_timestamp - 60;
// iat (Issued At): Created now
const issued_at = now_timestamp;
// exp (Expiration): Valid for 1 hour
const expiration = now_timestamp + 3600;

const jwt_claims = {
    'iss': api_key,    // Issuer (Who issues it)
    'exp': expiration, // Expiration (When it expires)
    'iat': issued_at,  // Issued At (When it was created)
    'nbf': not_before  // Not Before (Valid from)
};

console.log(`Token claims:`, jwt_claims);
if (!jwt_secret) {
    console.error('❌ ERROR: Required environment variable is missing. Please check your .env file.');
    process.exit(1);
}
const token = jwt.sign(jwt_claims, jwt_secret, { algorithm: 'HS256' });

// --- 3. THE MESSAGE ---
// --- Persistent message counter ---
// Read current count from counter.json
let messageCount = 1;
try {
    if (fs.existsSync(counterFile)) {
        const data = fs.readFileSync(counterFile, 'utf8');
        const obj = JSON.parse(data);
        if (typeof obj.count === 'number') messageCount = obj.count;
    }
} catch (e) {
    messageCount = 1;
}

// Function to increment counter.json with each message sent
function incrementCounter() {
    messageCount++;
    fs.writeFileSync(counterFile, JSON.stringify({ count: messageCount }), 'utf8');
}

const timestamp = Math.floor(Date.now() / 1000);
const stream_id = `stream-${timestamp}`;
const message_body = {
    'message_id': `message-${timestamp}`,
    'description': "DataBus Test"
};

const body_payload = {
    'subject_id': subject_id,
    'stream_id': stream_id,
    'body': message_body
};

console.log(`Sending message to Subject: ${subject_id}`);
console.log(`Content:`, JSON.stringify(body_payload, null, 2));

// --- 4. PUBLICATION ---
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

axios.post(endpoint, body_payload, { headers })
.then(response => {
    console.log("✅ SUCCESS! (HTTP 200)");
    console.log("Databus accepted your message.");

    // --- Update message counter ---
    incrementCounter();
    process.exit(0);
})
.catch(error => {
    if (error.response) {
        console.log(`\n❌ Publishing error! (HTTP ${error.response.status})`);
        console.log(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
        console.log(`\n❌ No response received. Check your network connection.`);
    } else {
        console.log(`\n🔧 An unexpected error occurred: ${error.message}`);
    }
    process.exit(1);
});