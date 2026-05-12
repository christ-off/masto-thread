export function isMastodonUrl(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts.length >= 2 && /^\d+$/.test(parts.at(-1)) && parts.at(-2).startsWith('@');
  } catch(e) { return false; }
}

export function parseUrl(url) {
  try {
    const u = new URL(url);
    const instance = u.origin;
    const parts = u.pathname.split('/').filter(Boolean);
    const id = parts.at(-1);
    if (!id || !/^\d+$/.test(id)) return null;
    return { instance, id };
  } catch(e) { return null; }
}

export function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
