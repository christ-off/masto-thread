import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAccessToken, addBookmark } from './instapaper.js';

function mockCrypto() {
  vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-1111-1111-1111-111111111111');
  vi.spyOn(globalThis.crypto.subtle, 'importKey').mockResolvedValue('key');
  vi.spyOn(globalThis.crypto.subtle, 'sign').mockResolvedValue(new Uint8Array(20));
}

beforeEach(mockCrypto);
afterEach(() => {
  vi.restoreAllMocks();
});

describe('getAccessToken', () => {
  it('parses token and secret on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=abc&oauth_token_secret=def',
    });
    const result = await getAccessToken('user@example.com', 'pass');
    expect(result).toEqual({ token: 'abc', secret: 'def' });
  });

  it('throws on HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(getAccessToken('bad', 'creds')).rejects.toThrow('Auth failed: HTTP 401');
  });
});

describe('addBookmark', () => {
  it('returns bookmark on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ type: 'bookmark', bookmark_id: 42, url: 'https://example.com' }],
    });
    const bm = await addBookmark('tok', 'sec', { url: 'https://example.com', title: 'Test', content: '<p>hi</p>' });
    expect(bm.bookmark_id).toBe(42);
  });

  it('throws on API error object', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ type: 'error', error_code: 1240, message: 'Invalid URL' }],
    });
    await expect(addBookmark('tok', 'sec', { url: '', title: '', content: '' }))
      .rejects.toThrow('1240');
  });
});
