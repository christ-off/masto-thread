const BASE_URL = 'https://www.instapaper.com';
const CONSUMER_KEY = 'YOUR_CONSUMER_KEY';
const CONSUMER_SECRET = 'YOUR_CONSUMER_SECRET';

// --- OAuth 1.0a helpers ---

function percentEncode(s) {
  return encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

async function hmacSha1(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function nonce() {
  return crypto.randomUUID().replace(/-/g, '');
}

async function buildAuthHeader(method, url, params, tokenKey = '', tokenSecret = '') {
  const ts = Math.floor(Date.now() / 1000).toString();
  const oauthParams = {
    oauth_consumer_key: CONSUMER_KEY,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: ts,
    oauth_token: tokenKey,
    oauth_version: '1.0',
  };
  if (!tokenKey) delete oauthParams.oauth_token;

  const allParams = { ...params, ...oauthParams };
  const sortedKeys = Object.keys(allParams).sort();
  const paramStr = sortedKeys
    .map(k => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join('&');

  const sigBase = [method.toUpperCase(), percentEncode(url), percentEncode(paramStr)].join('&');
  const sigKey = `${percentEncode(CONSUMER_SECRET)}&${percentEncode(tokenSecret)}`;
  const signature = await hmacSha1(sigKey, sigBase);

  oauthParams.oauth_signature = signature;
  const headerValue = 'OAuth ' + Object.entries(oauthParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return headerValue;
}

// --- API methods ---

export async function getAccessToken(username, password) {
  const url = `${BASE_URL}/api/1/oauth/access_token`;
  const bodyParams = {
    x_auth_username: username,
    x_auth_password: password,
    x_auth_mode: 'client_auth',
  };
  const authHeader = await buildAuthHeader('POST', url, bodyParams);
  const body = new URLSearchParams(bodyParams);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error(`Auth failed: HTTP ${res.status}`);
  const text = await res.text();
  const parsed = Object.fromEntries(new URLSearchParams(text));
  if (!parsed.oauth_token) throw new Error('Invalid credentials or no token returned');
  return { token: parsed.oauth_token, secret: parsed.oauth_token_secret };
}

export async function verifyCredentials(token, secret) {
  const url = `${BASE_URL}/api/1/account/verify_credentials`;
  const authHeader = await buildAuthHeader('POST', url, {}, token, secret);
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const user = data.find(o => o.type === 'user');
  if (!user) throw new Error('Unexpected response');
  return user;
}

export async function addBookmark(token, secret, { url, title, content }) {
  const endpoint = `${BASE_URL}/api/1/bookmarks/add`;
  const bodyParams = {
    url,
    title,
    content,
    is_private_from_source: 'masto-thread',
    resolve_final_url: '0',
  };
  const authHeader = await buildAuthHeader('POST', endpoint, bodyParams, token, secret);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(bodyParams),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const err = data.find(o => o.type === 'error');
  if (err) throw new Error(`Instapaper error ${err.error_code}: ${err.message}`);
  return data.find(o => o.type === 'bookmark');
}