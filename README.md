# WCAG 2.1 Checker — Chrome Extension

Automated WCAG 2.1 AA accessibility audits powered by [axe-core](https://github.com/dequelabs/axe-core), built with [Plasmo](https://www.plasmo.com/), React, and TypeScript.

## Features

- **One-click audits** — Run axe-core WCAG 2.1 AA checks on any page
- **Side panel UI** — Results grouped by impact (critical → minor)
- **Element highlighting** — Click "Highlight" to locate issues on the page
- **Auto-audit** — Optionally re-run audits on every page navigation
- **Summary stats** — Pass/fail counts and accessibility score
- **Export JSON** — Download full results for reporting

## Setup

```bash
# Install dependencies
pnpm install    # or npm install / yarn

# Run in development mode (hot reload)
pnpm dev

# Build for production
pnpm build
```

## Load in Chrome

1. Run `pnpm dev` or `pnpm build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select `build/chrome-mv3-dev` (dev) or `build/chrome-mv3-prod` (prod)
5. Click the extension icon to open the side panel
6. Click **Run Audit**

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Plasmo (Manifest V3) |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Engine | axe-core 4.9 |

## Project Structure

```
src/
├── background/index.ts    # Service worker — orchestrates audits & highlighting
├── sidepanel/index.tsx     # Side panel UI entry point
├── components/
│   ├── IssueCard.tsx       # Individual violation card
│   └── SummaryBar.tsx      # Pass/fail/score summary
├── types/audit.ts          # Shared TypeScript types
└── style.css               # Tailwind entry
```

## License

MIT
