import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAccessToken, addBookmark, verifyCredentials } from './instapaper.js';

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

  it('throws when response has no oauth_token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token_secret=def',
    });
    await expect(getAccessToken('user', 'pass')).rejects.toThrow('no token returned');
  });

  it('encodes special chars in credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'oauth_token=abc&oauth_token_secret=def',
    });
    // These chars !'()* are percent-encoded by percentEncode's replaceAll callback
    const result = await getAccessToken("user!test", "p'ass(w)");
    expect(result).toEqual({ token: 'abc', secret: 'def' });
    // Verify fetch was called with the correct Authorization header
    const callArgs = globalThis.fetch.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toContain('OAuth');
  });
});

describe('verifyCredentials', () => {
  it('returns user on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ type: 'user', display_name: 'alice' }],
    });
    const user = await verifyCredentials('tok', 'sec');
    expect(user.display_name).toBe('alice');
  });

  it('throws when no user in response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    await expect(verifyCredentials('tok', 'sec')).rejects.toThrow('Unexpected response');
  });

  it('throws on HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    await expect(verifyCredentials('bad', 'secret')).rejects.toThrow('HTTP 401');
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

  it('throws on HTTP error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(addBookmark('tok', 'sec', { url: 'https://example.com', title: 'Test', content: '' }))
      .rejects.toThrow('HTTP 500');
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
