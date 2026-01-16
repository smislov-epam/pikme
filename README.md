# PIKME (Board Game Night Game Selector)

Local-first web app that helps a group pick a board game to play.

## Documentation
- Product/design docs live under `Requirements/`.
- UI consistency rules live in `ui-ux-guidelines.md`.

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

### Build / lint / test
- `npm --prefix "apps/web" run build`
- `npm --prefix "apps/web" run lint`
- `npm --prefix "apps/web" run test`

## Security & Quality Checks

This repo includes automated security and quality checks that run:
1. **On every commit** (via Husky pre-commit hook)
2. **On every push** (via Husky pre-push hook)
3. **On every push to remote** (via GitHub Actions)

### What Gets Checked

#### Pre-Commit (Quick)
- ✅ ESLint code quality checks

#### Pre-Push (Comprehensive)
- 🔐 **Secret Detection** - Scans for exposed API keys, tokens, passwords
- 🔨 **TypeScript Compilation** - Both web app and functions
- 🔍 **ESLint** - Code quality checks
- 🧪 **Unit Tests** - Vitest tests for web app and functions
- 🛡️ **Security Audit** - npm audit for vulnerabilities (moderate+)

#### GitHub Actions (CI/CD)
Runs the same checks as pre-push, plus:
- 📦 **Dependency Review** - Checks for new vulnerable/restricted dependencies in PRs
- ⚙️ **Matrix Testing** - Tests root, web, and functions workspaces in parallel
- 🚫 **Blocks merges** if any check fails

### Manual Security Checks

Run security checks manually:
```bash
# Check everything
npm run security:check

# Individual checks
npm run security:secrets      # Scan for exposed secrets
npm run security:audit        # Root dependencies
npm run security:web          # Web dependencies
npm run security:functions    # Functions dependencies

# Run all pre-push checks manually
npm run pre-push:checks
```

### Bypassing Hooks (Not Recommended)

Only in emergencies, you can bypass hooks:
```bash
git commit --no-verify        # Skip pre-commit
git push --no-verify          # Skip pre-push
```

**Note:** GitHub Actions will still run and may block your PR!

### Configuring Secret Detection

If you get false positives:
1. Review `tools/detect-secrets.mjs`
2. Add patterns to `WHITELISTED_PATTERNS` array
3. Use `.env.example` for API key placeholders

### Firebase emulators (Windows note: Java 21 required)

Recent `firebase-tools` versions require **JDK 21+** for emulators.

Quick commands from the repo root:
- `npm run emu:j21` (recommended on Windows)
- `npm run emu:j21:import` (loads from `./.firebase-emulator-data`)

Short aliases for common tasks:
- `npm run w:dev`, `npm run w:test`, `npm run w:lint`, `npm run w:build`
- `npm run fn:build`, `npm run fn:lint`

## Firebase (Optional Multi-User Features)
Firebase is used for optional multi-user features (REQ-100+). It's **disabled by default**.

### Prerequisites
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project (create at https://console.firebase.google.com)

### Local Development with Emulators
1. Install Functions dependencies:
   ```bash
   npm --prefix functions install
   ```

2. Build Functions:
   ```bash
   npm --prefix functions run build
   ```

3. Start emulators:
   ```bash
   npm run emu:j21
   ```
   Emulator UI available at http://127.0.0.1:4001

4. Configure the web app to use emulators - create `apps/web/.env.local`:
   ```bash
   VITE_FEATURE_FIREBASE=1
   VITE_FIREBASE_USE_EMULATORS=1
   VITE_FIREBASE_API_KEY=fake-api-key
   VITE_FIREBASE_AUTH_DOMAIN=localhost
   VITE_FIREBASE_PROJECT_ID=pikme-dev
   ```

5. Run the web app in another terminal:
   ```bash
   npm run dev
   ```

### Emulator Data Persistence
- Export: `npm run emulators:export`
- Import on start: `npm run emulators:import`

## Requirements extraction helper
Source DOCX files are in `Requirements/`. To produce plain-text snapshots for diff/review:
- `python tools/extract_docx_text.py`
