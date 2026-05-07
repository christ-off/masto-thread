# Mastodon Thread Reader

[![CodeQL](https://github.com/christ-off/masto-thread/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/christ-off/masto-thread/actions/workflows/github-code-scanning/codeql) [![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=christ-off_masto-thread&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=christ-off_masto-thread)

A Firefox browser extension that renders any Mastodon thread as a clean, single readable page.

## Features

- Auto-detects Mastodon post URLs on the active tab
- Fetches the full thread via the Mastodon API (ancestors + author's own replies)
- Displays posts in chronological order with avatars, timestamps, and inline images
- Image lightbox on click
- Dark mode support (respects `prefers-color-scheme`)
- Works on any Mastodon instance — no login or API key required

## Installation

1. Clone or download this repository
2. Open Firefox and go to `about:debugging`
3. Click **This Firefox** → **Load Temporary Add-on**
4. Select the `manifest.json` file

> For a permanent install, the extension would need to be signed via [addons.mozilla.org](https://addons.mozilla.org).

## Usage

1. Navigate to any Mastodon post (e.g. `https://mastodon.social/@user/123456789`)
2. Click the extension icon — the URL is pre-filled automatically
3. Click **Open as readable thread** — the thread opens in a new tab
4. You can also paste any Mastodon post URL manually in the reader page

## How it works

The extension calls the public Mastodon REST API:

- `GET /api/v1/statuses/:id` — fetch the root post
- `GET /api/v1/statuses/:id/context` — fetch ancestors and descendants

Descendants are filtered to only include posts from the original author, so replies from others are excluded.

## Project structure

```
manifest.json   Extension manifest (Manifest V2, Firefox)
popup.html/js   Browser action popup
reader.html/js  Full-page thread reader
icons/          SVG icons (48px, 96px)
```

## Permissions

Only `activeTab` — used to read the current tab's URL for auto-detection.