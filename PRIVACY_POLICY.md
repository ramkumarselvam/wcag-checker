# Privacy Policy — WCAG 2.1 Checker

**Last updated:** March 5, 2026

## Overview

WCAG 2.1 Checker is a Chrome extension that performs automated accessibility audits on web pages using axe-core. Your privacy is important to us.

## Data Collection

**We do not collect, store, transmit, or share any personal data.** The extension operates entirely within your browser.

## How It Works

- When you activate the extension on a page, it injects the axe-core library into the **current tab only** to run accessibility checks.
- Audit results are displayed locally in the Chrome side panel.
- No data leaves your browser. No analytics, no tracking, no telemetry.

## Permissions Explained

| Permission | Why It's Needed |
|---|---|
| `activeTab` | Access the current tab's content when you click the extension icon |
| `scripting` | Inject axe-core into the page to run the accessibility audit |
| `sidePanel` | Display audit results in Chrome's side panel |
| `storage` | Save your preferences locally in the browser |

## Third-Party Services

The extension loads **axe-core** from a CDN (`cdnjs.cloudflare.com`) when running audits. No user data is sent to this CDN — it only serves the axe-core JavaScript library. See [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/) for their CDN practices.

## Data Storage

All data (preferences, audit results) is stored locally in your browser using Chrome's `storage` API. Nothing is sent to external servers.

## Changes to This Policy

If this policy changes, the updated version will be published here with a new date.

## Contact

For questions about this privacy policy, open an issue on the project's repository.
