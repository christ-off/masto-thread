import { getAccessToken, verifyCredentials } from './instapaper.js';

const statusEl = document.getElementById('status');
const connectedEl = document.getElementById('connected-info');

async function loadConnected() {
  const { instaToken, instaUsername } = await browser.storage.local.get(['instaToken', 'instaUsername']);
  if (instaToken && instaUsername) {
    connectedEl.textContent = `Connected as ${instaUsername}`;
    connectedEl.style.display = 'block';
  }
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  statusEl.textContent = 'Connecting…';
  statusEl.className = '';
  try {
    const { token, secret } = await getAccessToken(email, password);
    const user = await verifyCredentials(token, secret);
    await browser.storage.local.set({ instaToken: token, instaSecret: secret, instaUsername: user.username });
    statusEl.textContent = `Connected as ${user.username}`;
    statusEl.className = 'ok';
    connectedEl.textContent = `Connected as ${user.username}`;
    connectedEl.style.display = 'block';
  } catch (e) {
    statusEl.textContent = `Error: ${e.message}`;
    statusEl.className = 'err';
  }
});

loadConnected();
