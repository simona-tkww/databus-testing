
import requests
import jwt
import time
import json
import datetime

# --- 1. PASTE YOUR NEW DATA HERE ---
api_key = 'DHm24gGQFpj3TrLLt7qqQdgtrH'
jwt_secret = 'HfbwJBfCHWzWJs7ZS0gA-gNepajAAkdT9AR-_ao2t6K'
subject_id = '0efa1b4d-95a6-4237-bd65-fdd67cae10fa'
# ------------------------------------

endpoint = 'https://dbus-qa.dataintel.xogrp.com/publish'

# --- 2. IMPROVED TOKEN GENERATION ---
print("Generating token...")

# We use datetime.UTC as recommended by the warning
now = datetime.datetime.now(datetime.UTC)

# Current time in UNIX timestamp format
now_timestamp = int(now.timestamp())

# Define validity hours
# nbf (Not Before): Valid since 60 seconds ago (to avoid clock skew)
not_before = now_timestamp - 60
# iat (Issued At): Created now
issued_at = now_timestamp
# exp (Expiration): Valid for 1 hour
expiration = now_timestamp + 3600

jwt_claims = {
    'iss': api_key,    # Issuer (Who issues it)
    'exp': expiration, # Expiration (When it expires)
    'iat': issued_at,  # Issued At (When it was created)
    'nbf': not_before  # Not Before (Valid from)
}

print(f"Token claims: {jwt_claims}")
token = jwt.encode(jwt_claims, jwt_secret, algorithm='HS256')

# --- 3. THE MESSAGE ---
timestamp = int(time.time())
stream_id = f"stream-{timestamp}"
message_body = {
    'message_id': f"message-{timestamp}",
    'description': "Test (with improved token) for the databus"
}

body_payload = {
    'subject_id': subject_id,
    'stream_id': stream_id,
    'body': message_body
}

print(f"Sending message to Subject: {subject_id}")
print(f"Content: {json.dumps(body_payload, indent=2)}")

# --- 4. PUBLICATION ---
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {token}'
}

try:
    response = requests.post(endpoint, json=body_payload, headers=headers)
    response.raise_for_status()
    print("\nSUCCESS! (HTTP 200)")
    print("Databus accepted your message.")

except requests.exceptions.HTTPError as err:
    print(f"\nPUBLISHING ERROR! (HTTP {err.response.status_code})")
    print(f"Response: {err.response.text}")
except Exception as err:
    print(f"\nAn unexpected error occurred: {err}")