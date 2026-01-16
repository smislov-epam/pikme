# Deploy PIKME to production (GitHub Pages + custom domain)

This repo is a **Vite + React** app under `apps/web`. This guide deploys it to **GitHub Pages** and maps your purchased domain **pikme.online**.

## What you’ll end up with

- Build + deploy on every push to `main` via GitHub Actions.
- Production site served from `https://pikme.online`.
- HTTPS handled by GitHub Pages.

## 1) Repo changes (already supported by this repo)

### 1.1 Add GitHub Pages workflow

This repo includes a workflow at `.github/workflows/deploy-pages.yml` that:
- installs deps in `apps/web`
- builds `apps/web/dist`
- publishes the artifact to GitHub Pages

If you don’t have it yet, add it (it’s included in this workspace).

### 1.2 Ensure correct Vite base path

For a **custom domain**, the site is served from the domain root, so the correct base path is:
- `VITE_BASE_PATH=/`

The workflow sets this env var during build.

### 1.3 Add the CNAME file (recommended)

For a custom domain on GitHub Pages, ensure a `CNAME` file is included in the build output.

This repo uses Vite, so the simplest approach is:
- `apps/web/public/CNAME` containing exactly:
  - `pikme.online`

Vite copies `public/` into `dist/`, so the `CNAME` ends up at the root of the deployed site.

## 2) Configure GitHub Pages in the repo settings

In GitHub:

1. Go to **Repo → Settings → Pages**
2. Under **Build and deployment**:
   - **Source**: select **GitHub Actions**
3. Under **Custom domain**:
   - enter `pikme.online`
   - click **Save**
4. Wait for GitHub to show DNS instructions and a green check.
5. Enable **Enforce HTTPS** (this appears after DNS resolves).

Notes:
- GitHub Pages will provision a TLS certificate automatically once DNS is correct.
- DNS + cert provisioning can take from minutes up to 24 hours.

## 3) Set DNS for `pikme.online`

You must update DNS at your domain registrar (or DNS provider like Cloudflare).

### Namecheap (BasicDNS) exact steps

1. Namecheap → **Domain List** → **Manage** `pikme.online`
2. Confirm **NAMESERVERS** is set to **Namecheap BasicDNS**
3. Go to the **Advanced DNS** tab → **Host Records**
4. Remove any conflicting records for `@` and `www` (common culprits):
  - `URL Redirect Record` for `@` or `www`
  - `A` record for `@` pointing somewhere else
  - `CNAME` for `www` pointing somewhere else
  - `AAAA` for `@` pointing somewhere else
5. Add the records below (TTL: **Automatic** is fine)

### Option A (common): Use apex domain `pikme.online`

Create these records:

- `A` records for `@` (apex):
  - `185.199.108.153`
  - `185.199.109.153`
  - `185.199.110.153`
  - `185.199.111.153`

Optional (IPv6):
- `AAAA` records for `@`:
  - `2606:50c0:8000::153`
  - `2606:50c0:8001::153`
  - `2606:50c0:8002::153`
  - `2606:50c0:8003::153`

These are GitHub Pages IPs.

### Option B (recommended too): Also support `www.pikme.online`

Add:
- `CNAME` record
  - Host/Name: `www`
  - Target/Value: `smislov-epam.github.io`

(Replace `<your-github-username>` with the account that owns the Pages site.)

In this repo, the GitHub username is `smislov-epam`, so the correct target is:
- `www` → `smislov-epam.github.io`

Then in GitHub Pages settings you can choose whether your primary domain is apex or `www`.

### If you use Cloudflare

- Start with Cloudflare proxy **off** (DNS-only / gray cloud) until GitHub verifies the domain.
- After it’s verified and HTTPS is enforced, you can choose to enable proxying, but it’s optional.

## 4) Deploy

1. Push to `main`:
   - `git push origin main`
2. In GitHub: **Actions** tab → watch “Deploy to GitHub Pages”.
3. When it finishes, open `https://pikme.online`.

## Optional: Enable Google Analytics in production

PIKME only enables analytics in production builds when a GA4 measurement ID is provided.

1. In GitHub, go to **Repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Create a secret:
  - Name: `VITE_GA_MEASUREMENT_ID`
  - Value: your GA4 ID (looks like `G-XXXXXXXXXX`)

On the next deploy, the build will include the measurement ID and analytics will initialize.

## Optional: Enable Firebase backend for multi-user testing

PIKME can connect to a Firebase backend for user authentication, session sharing, and multi-user preference sync. This is **disabled by default** in production builds.

### Prerequisites

1. A Firebase project (e.g., `pikme-online-dev`) with:
   - Authentication enabled (Email/Password provider)
   - Firestore database created
   - Cloud Functions deployed
2. Authorized domains configured in Firebase Console:
   - Go to **Authentication → Settings → Authorized domains**
   - Add `pikme.online` and `pikme.github.io`

### Register a web app and get config values

If you haven't registered a web app in Firebase yet:

1. Go to [Firebase Console](https://console.firebase.google.com/) → select your project
2. Click the **gear icon** → **Project settings**
3. Scroll to **Your apps** section
4. Click **Add app** → select **Web** (</> icon)
5. Enter app nickname (e.g., `pikme-web`) and click **Register app**
6. Copy the config values shown:

   ```javascript
   const firebaseConfig = {
     apiKey: "...",           // → FIREBASE_API_KEY
     authDomain: "...",       // → FIREBASE_AUTH_DOMAIN
     projectId: "...",        // → FIREBASE_PROJECT_ID
     storageBucket: "...",    // → FIREBASE_STORAGE_BUCKET
     messagingSenderId: "...",// → FIREBASE_MESSAGING_SENDER_ID
     appId: "..."             // → FIREBASE_APP_ID
   };
   ```

7. Click **Continue to console**

### Enable Firebase in production

1. **Add Firebase secrets** in GitHub (Repo → Settings → Secrets and variables → Actions → Secrets):

   | Secret name | Description |
   |-------------|-------------|
   | `FIREBASE_API_KEY` | Firebase Web API key |
   | `FIREBASE_AUTH_DOMAIN` | e.g., `pikme-online-dev.firebaseapp.com` |
   | `FIREBASE_PROJECT_ID` | e.g., `pikme-online-dev` |
   | `FIREBASE_STORAGE_BUCKET` | e.g., `pikme-online-dev.appspot.com` |
   | `FIREBASE_MESSAGING_SENDER_ID` | Numeric sender ID |
   | `FIREBASE_APP_ID` | Firebase app ID |

2. **Create the toggle variable** (Repo → Settings → Secrets and variables → Actions → Variables):
   - Click **New repository variable**
   - Name: `ENABLE_FIREBASE`
   - Value: `1`

3. **Push or trigger deploy** — the next build will include Firebase functionality.

### Disable Firebase quickly

To disable Firebase in production (e.g., for troubleshooting or cost control):

1. Go to **Repo → Settings → Secrets and variables → Actions → Variables**
2. Edit `ENABLE_FIREBASE` and set value to `0`
3. Trigger a new deployment (push to `main` or manually dispatch workflow)

Build + deploy takes ~2-3 minutes. During this time, existing users can still access the app in local-only mode.

### Beta testing: User registration limit

For beta testing, control user access by generating an invite with a limited number of uses:

```bash
# Generate a single invite link that can be used by up to 5 beta testers
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json \
PIKME_APP_URL=https://pikme.online \
node tools/generate-invite.mjs --maxUses 5 --expiresInDays 30
```

Share the generated link with beta testers. Once 5 users have registered with the link, it will no longer be valid.

For local development with emulators:
```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8081 \
node tools/generate-invite.mjs --maxUses 5 --expiresInDays 30
```

### Security notes

- All Firestore reads require authentication — unauthenticated users have zero backend access
- All writes go through Cloud Functions (no direct client writes)
- Firebase secrets are not exposed in client bundle (only config values like project ID)

## 5) Operational notes (local-first app)

- PIKME stores data in IndexedDB per **origin**.
  - `http://localhost:5173` and `https://pikme.online` are different origins.
  - Your local data will **not** automatically appear on production.
- If you want to move data between origins, you’ll need an export/import feature (not covered in this doc).

## Troubleshooting

- **404s for assets / blank page**
  - Ensure `VITE_BASE_PATH=/` for custom domain.

- **DNS check doesn’t pass**
  - Re-check `A` records for `@` and the `CNAME` for `www`.
  - DNS can take time; try again after 10–30 minutes.

- **GitHub Pages says “Domain does not resolve to the GitHub Pages server (NotServedByPagesError)”**
  - Confirm the deploy workflow ran at least once (Repo → **Actions**).
  - Confirm Pages is set to **Source: GitHub Actions** (Repo → **Settings → Pages**).
  - Check for conflicting `AAAA` records for `@` in Namecheap.

- **HTTPS toggle not available**
  - Wait for GitHub to finish certificate provisioning.

