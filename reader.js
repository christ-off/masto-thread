import { parseUrl, formatTime, stripHtml } from './lib.js';
import { addBookmark } from './instapaper.js';

function setErrorStatus(container, statusEl, message) {
  const el = document.createElement('div');
  el.className = 'error';
  el.textContent = message;
  statusEl.textContent = '';
  container.innerHTML = '';
  container.appendChild(el);
}

function setStatus(container, statusEl, message, type) {
  if (type === 'loading') {
    setLoadingStatus(statusEl);
    container.innerHTML = '';
    return;
  }
  if (type === 'error') {
    setErrorStatus(container, statusEl, message);
    return;
  }
  setPlainStatus(statusEl, message);
}

function setPlainStatus(el, text) {
  el.textContent = text;
}

function setLoadingStatus(el) {
  el.innerHTML = '<span class="spinner">↻</span> Loading thread…';
}

function sanitizeHtml(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('script, iframe, object, embed, form').forEach(el => el.remove());
  for (const el of d.querySelectorAll('*')) {
    for (const attr of el.attributes) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
      else if (attr.name === 'href' || attr.name === 'src' || attr.name === 'action') {
        if (!isSafeUrl(attr.value)) el.removeAttribute(attr.name);
      }
    }
  }
  return d.innerHTML;
}

function isSafeUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  }
  catch {
    return false;
  }
}

function renderPost(post, showConnector) {
  const acc = post.account;
  const initials = stripHtml(acc.display_name || acc.username || '?').slice(0, 2).toUpperCase();

  const mediaItems = (post.media_attachments || []).filter(m => m.type === 'image');

  const wrapper = document.createElement('div');

  const postEl = document.createElement('div');
  postEl.className = 'post';

  const avatarCol = document.createElement('div');
  avatarCol.className = 'avatar-col';

  if (acc.avatar) {
    const img = document.createElement('img');
    img.className = 'avatar';
    img.src = acc.avatar;
    img.alt = stripHtml(acc.display_name || '');
    const fallback = document.createElement('div');
    fallback.className = 'avatar-fallback';
    fallback.textContent = initials;
    fallback.style.display = 'none';
    img.onerror = () => { img.style.display = 'none'; fallback.style.display = 'flex'; };
    avatarCol.appendChild(img);
    avatarCol.appendChild(fallback);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'avatar-fallback';
    fallback.textContent = initials;
    avatarCol.appendChild(fallback);
  }

  if (showConnector) {
    const connector = document.createElement('div');
    connector.className = 'connector';
    avatarCol.appendChild(connector);
  }

  const body = document.createElement('div');
  body.className = 'post-body';

  const meta = document.createElement('div');
  meta.className = 'post-meta';

  const author = document.createElement('span');
  author.className = 'post-author';
  author.textContent = stripHtml(acc.display_name || acc.username);

  const time = document.createElement('span');
  time.className = 'post-time';
  time.textContent = formatTime(post.created_at);

  meta.appendChild(author);
  meta.appendChild(time);

  const content = document.createElement('div');
  content.className = 'post-content';
  content.setHTML(sanitizeHtml(post.content));

  body.appendChild(meta);
  body.appendChild(content);

  if (mediaItems.length) {
    const mediaDiv = document.createElement('div');
    mediaDiv.className = 'post-media';
    mediaItems.forEach(m => {
      const img = document.createElement('img');
      img.src = m.preview_url || m.url;
      img.alt = m.description || '';
      img.loading = 'lazy';
      img.addEventListener('click', () => openLightbox(m.url || m.preview_url));
      mediaDiv.appendChild(img);
    });
    body.appendChild(mediaDiv);
  }

  postEl.appendChild(avatarCol);
  postEl.appendChild(body);
  wrapper.appendChild(postEl);

  return wrapper;
}

async function loadThread() {
  let url = document.getElementById('url-input').value.trim();
  const parsed = parseUrl(url);
  const container = document.getElementById('thread-container');
  const statusEl = document.getElementById('status');

  if (!parsed) {
    setStatus(container, statusEl, 'Invalid URL. Paste a valid Mastodon post URL.', 'error');
    return;
  }

  // Construct safe URL from parsed instance + known-safe protocol
  url = `${parsed.instance}/statuses/${parsed.id}`;

  setStatus(container, statusEl, 'Loading thread…', 'loading');
  container.innerHTML = '';

  document.title = 'Loading thread…';

  try {
    const [postRes, ctxRes] = await Promise.all([
      fetch(`${parsed.instance}/api/v1/statuses/${parsed.id}`),
      fetch(`${parsed.instance}/api/v1/statuses/${parsed.id}/context`)
    ]);

    if (!postRes.ok) throw new Error(`HTTP ${postRes.status} — post not found or instance unreachable`);

    const [post, ctx] = await Promise.all([postRes.json(), ctxRes.json()]);

    const authorId = post.account.id;
    const ancestors = ctx.ancestors || [];
    const descendants = (ctx.descendants || []).filter(p => p.account.id === authorId);
    const allPosts = [...ancestors, post, ...descendants];
    const count = allPosts.length;

    const displayName = stripHtml(post.account.display_name || post.account.username);
    document.title = `Thread by ${displayName}`;
    setPlainStatus(statusEl, `✓ ${count} post${count > 1 ? 's' : ''} loaded`);

    const header = document.createElement('div');
    header.className = 'thread-header';

    const threadTitle = document.createElement('div');
    threadTitle.className = 'thread-title';
    threadTitle.textContent = `Thread by ${displayName}`;

    const threadMeta = document.createElement('div');
    threadMeta.className = 'thread-meta';
    threadMeta.appendChild(document.createTextNode(
      `${count} post${count > 1 ? 's' : ''}  ·  `
    ));
    const viewLink = document.createElement('a');
    viewLink.href = url;
    viewLink.target = '_blank';
    viewLink.rel = 'noopener';
    viewLink.textContent = 'View on Mastodon ↗';
    threadMeta.appendChild(viewLink);

    header.appendChild(threadTitle);
    header.appendChild(threadMeta);

    const thread = document.createElement('div');
    thread.className = 'thread';
    allPosts.forEach((p, i) => thread.appendChild(renderPost(p, i < allPosts.length - 1)));

    container.appendChild(header);
    container.appendChild(thread);

    const instaBtn = renderInstapaperButton(url, `Thread by ${displayName}`, container);
    container.appendChild(instaBtn);

  } catch(e) {
    setStatus(container, statusEl, `Error: ${e.message}`, 'error');
    document.title = 'Thread Reader — Error';
  }
}

function openLightbox(src) {
  document.getElementById('lightbox-img').src = src;
  document.getElementById('lightbox').classList.add('open');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

function renderInstapaperButton(postUrl, title, container) {
  const btn = document.createElement('button');
  btn.id = 'instapaper-btn';
  btn.textContent = 'Save to Instapaper';
  btn.style.cssText = `
    display: inline-flex; align-items: center; gap: 6px;
    font-family: inherit; font-size: 13px; font-weight: 500;
    padding: 7px 14px; border: 0.5px solid var(--border-hover);
    border-radius: var(--radius); background: var(--bg); color: var(--text);
    cursor: pointer; margin-top: 1rem;
  `;

  btn.addEventListener('click', async () => {
    const { instaToken, instaSecret } = await browser.storage.local.get(['instaToken', 'instaSecret']);
    if (!instaToken) {
      browser.runtime.openOptionsPage();
      return;
    }
    btn.textContent = 'Saving…';
    btn.disabled = true;
    try {
      const content = container.querySelector('.thread').outerHTML;
      await addBookmark(instaToken, instaSecret, { url: postUrl, title, content });
      btn.textContent = '✓ Saved to Instapaper';
    } catch (e) {
      btn.textContent = 'Error — retry';
      btn.disabled = false;
      console.error(e);
    }
  });

  return btn;
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('load-btn');
  const input = document.getElementById('url-input');
  const lightbox = document.getElementById('lightbox');

  btn.addEventListener('click', loadThread);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') loadThread(); });
  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  const params = new URLSearchParams(globalThis.location.search);
  const urlParam = params.get('url');
  if (urlParam) {
    input.value = urlParam;
    loadThread();
  }
});
