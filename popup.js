import { isMastodonUrl } from './lib.js';

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.style.display = 'block';
}

function clearError() {
  document.getElementById('error').style.display = 'none';
}

function openReader(url) {
  const readerUrl = browser.runtime.getURL('reader.html') + '?url=' + encodeURIComponent(url);
  browser.tabs.create({ url: readerUrl });
  window.close();
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('url-input');
  const badge = document.getElementById('detected-badge');
  const btn = document.getElementById('open-btn');

  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    const tabUrl = tabs[0]?.url;
    if (tabUrl && isMastodonUrl(tabUrl)) {
      input.value = tabUrl;
      badge.classList.add('visible');
    }
  }).catch(() => {});

  btn.addEventListener('click', () => {
    clearError();
    const url = input.value.trim();
    if (!url) { showError('Please enter a URL.'); return; }
    if (!isMastodonUrl(url)) { showError('This doesn\'t look like a Mastodon post URL.'); return; }
    openReader(url);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') btn.click();
  });
});
