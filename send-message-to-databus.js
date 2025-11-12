require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

// --- 1. LOAD DATA FROM .ENV ---
const api_key = process.env.API_KEY;
const jwt_secret = process.env.JWT_SECRET;
const subject_id = process.env.SUBJECT_ID;

const endpoint = 'https://dbus-qa.dataintel.xogrp.com/publish';

// --- 2. IMPROVED TOKEN GENERATION ---
console.log('Generating token (v2)...');


console.log("Generating token (v2)...");
const now = new Date();
const now_timestamp = Math.floor(now.getTime() / 1000);
const not_before = now_timestamp - 60;
const issued_at = now_timestamp;
const expiration = now_timestamp + 3600;

const jwt_claims = {
    iss: api_key,
    exp: expiration,
    iat: issued_at,
    nbf: not_before
};

console.log(`Token claims: ${JSON.stringify(jwt_claims)}`);
const token = jwt.sign(jwt_claims, jwt_secret, { algorithm: 'HS256' });

// --- 3. THE MESSAGE ---
const timestamp = Math.floor(Date.now() / 1000);
const stream_id = `stream-${timestamp}`;
const message_body = {
    message_id: `msg-${timestamp}`,
    description: "Test v2 (with improved token) for the DLQ"
};

const body_payload = {
    subject_id: subject_id,
    stream_id: stream_id,
    body: message_body
};

console.log(`Sending message to Subject: ${subject_id}`);
console.log(`Content: ${JSON.stringify(body_payload, null, 2)}`);

// --- 4. PUBLICATION ---
const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
};

axios.post(endpoint, body_payload, { headers })
    .then(response => {
        console.log("\nSUCCESS! (HTTP 200)");
        console.log("Databus accepted your message.");
    })
    .catch(error => {
        if (error.response) {
            console.log(`\nPUBLISHING ERROR! (HTTP ${error.response.status})`);
            if (typeof error.response.data === 'string') {
                console.log(`Response: ${error.response.data}`);
            } else {
                console.log(`Response: ${JSON.stringify(error.response.data)}`);
            }
        } else {
            console.log(`\nAn unexpected error occurred: ${error.message}`);
        }
    });
