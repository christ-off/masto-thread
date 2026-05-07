import { describe, it, expect } from 'vitest';
import { isMastodonUrl, parseUrl, stripHtml } from './lib.js';

describe('isMastodonUrl', () => {
  it('accepts a standard post URL', () => {
    expect(isMastodonUrl('https://mastodon.social/@alice/123456789')).toBe(true);
  });

  it('accepts a subdomain instance', () => {
    expect(isMastodonUrl('https://fosstodon.org/@bob/987654321')).toBe(true);
  });

  it('rejects a profile URL (no numeric ID)', () => {
    expect(isMastodonUrl('https://mastodon.social/@alice')).toBe(false);
  });

  it('rejects a non-Mastodon URL', () => {
    expect(isMastodonUrl('https://example.com/foo/bar')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isMastodonUrl('')).toBe(false);
  });

  it('rejects a malformed URL', () => {
    expect(isMastodonUrl('not a url')).toBe(false);
  });

  it('rejects a URL where the last segment is not purely numeric', () => {
    expect(isMastodonUrl('https://mastodon.social/@alice/abc123')).toBe(false);
  });
});

describe('parseUrl', () => {
  it('returns instance and id for a valid URL', () => {
    expect(parseUrl('https://mastodon.social/@alice/123456789')).toEqual({
      instance: 'https://mastodon.social',
      id: '123456789',
    });
  });

  it('preserves the full origin as instance', () => {
    expect(parseUrl('https://fosstodon.org/@bob/111')).toEqual({
      instance: 'https://fosstodon.org',
      id: '111',
    });
  });

  it('returns null for a non-numeric trailing segment', () => {
    expect(parseUrl('https://mastodon.social/@alice/notanid')).toBeNull();
  });

  it('returns null for a malformed URL', () => {
    expect(parseUrl('garbage')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseUrl('')).toBeNull();
  });
});

describe('stripHtml', () => {
  it('strips tags and returns plain text', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('returns an empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(stripHtml('no tags here')).toBe('no tags here');
  });

  it('handles nested tags', () => {
    expect(stripHtml('<div><span>foo</span> <em>bar</em></div>')).toBe('foo bar');
  });
});
