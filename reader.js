import { parseUrl, formatTime, stripHtml } from './lib.js';

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
  content.setHTML(post.content);

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
  const url = document.getElementById('url-input').value.trim();
  const parsed = parseUrl(url);
  const container = document.getElementById('thread-container');
  const statusEl = document.getElementById('status');

  if (!parsed) {
    container.innerHTML = '<div class="error">Invalid URL. Paste a valid Mastodon post URL.</div>';
    return;
  }

  statusEl.innerHTML = '<span class="spinner">↻</span> Loading thread…';
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
    statusEl.innerHTML = `✓ ${count} post${count > 1 ? 's' : ''} loaded`;

    const header = document.createElement('div');
    header.className = 'thread-header';
    header.innerHTML = `
      <div class="thread-title">Thread by ${displayName}</div>
      <div class="thread-meta">
        ${count} post${count > 1 ? 's' : ''} &nbsp;·&nbsp;
        <a href="${url}" target="_blank" rel="noopener">View on Mastodon ↗</a>
      </div>`;

    const thread = document.createElement('div');
    thread.className = 'thread';
    allPosts.forEach((p, i) => thread.appendChild(renderPost(p, i < allPosts.length - 1)));

    container.appendChild(header);
    container.appendChild(thread);

  } catch(e) {
    statusEl.innerHTML = '';
    container.innerHTML = `<div class="error">Error: ${e.message}</div>`;
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

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('load-btn');
  const input = document.getElementById('url-input');
  const lightbox = document.getElementById('lightbox');

  btn.addEventListener('click', loadThread);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') loadThread(); });
  lightbox.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');
  if (urlParam) {
    input.value = urlParam;
    loadThread();
  }
});
