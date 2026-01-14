# PIKME (Board Game Night Game Selector)

Local-first web app that helps a group pick a board game to play.

## Docs-first repo
The product scope and UX flow live in:
- Requirements/Product Requirements.md
- Requirements/Solution Architecture Guidelines.md

## Deploy to production
- GitHub Pages deploy is driven by `.github/workflows/deploy-pages.yml`.
- Custom domain is configured via `apps/web/public/CNAME`.

## Data & storage (local-first)
- All app data is stored locally in your browser using IndexedDB (Dexie).
- Data is **not shared** between different people/devices unless you add an export/import or a backend sync.
- IndexedDB is scoped per-origin, so `https://pikme.online` and `https://www.pikme.online` are treated as different “apps” with different local data.
- Backup & restore: use the header Backup icon (box with arrow) to export a `.zip` and re-import later. Replace mode clears local data first; Merge mode upserts by latest timestamps.

## Frontend (React + Vite)
Implementation lives in `apps/web`.

### Prerequisites
- Node.js 20.x (this repo is currently validated on Node 20.11)
- npm 10+
- **BGG API Key** (free) - see below

### BGG API Key (Optional)
The app works without an API key! You can add games by pasting BGG links.

For **search and BGG username import (collection sync)** features, get a free API key:
1. Go to https://boardgamegeek.com/applications
2. Log in with your BGG account
3. Click "Register New Application"
4. Copy the API key

Enter it via Settings (⚙️ icon) or create `apps/web/.env`:
```
VITE_BGG_API_KEY=your_key_here
```

### Install
From the repo root:
- `npm --prefix "apps/web" install`

### Run locally
From the repo root:
- `npm --prefix "apps/web" run dev -- --host`

Then open `http://localhost:5173/`.

### Build / lint
- `npm --prefix "apps/web" run build`
- `npm --prefix "apps/web" run lint`

## Requirements extraction helper
Source DOCX files are in `Requirements/`. To produce plain-text snapshots for diff/review:
- `python tools/extract_docx_text.py`
