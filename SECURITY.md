# Security Policy

## Overview
PIKME is a local-first board game selector application. This document outlines the security measures in place and how to report security vulnerabilities.

## Security Measures

### 1. Secrets Management
- **No hardcoded credentials**: All API keys and sensitive configuration are stored in environment variables
- **Environment variables**: Configuration uses `VITE_*` prefix for Vite build-time variables
- **Git protection**: `.gitignore` excludes all sensitive files:
  - `.env` and `.env.*` files (except `.env.example`)
  - Service account keys (`*-firebase-adminsdk-*.json`, `service-account*.json`)
  - `tools/` directory (may contain sensitive keys)
  - `Requirements/` directory (internal documentation)

### 2. API Key Handling
#### BoardGameGeek (BGG) API
- API keys are optional - app works without them
- Keys can be provided via:
  - Environment variable: `VITE_BGG_API_KEY` (for development)
  - User input: Stored in browser's `localStorage` only
- Keys are sent as Bearer tokens in Authorization headers
- API key input dialog uses `type="password"` to prevent shoulder surfing
- Console logs only indicate presence of key, never the actual key value

#### Firebase Configuration
- Firebase features are **disabled by default** (`VITE_FEATURE_FIREBASE=0`)
- Firebase API keys are safe to commit (they are not secret per Firebase documentation)
- Configuration is environment-based:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### 3. Data Storage
- **Local-first architecture**: All user data stored in browser's IndexedDB
- **No backend database**: Production app does not transmit personal data to servers
- **BGG API**: Only used for fetching public game information
- **Firebase (optional)**: Used only when explicitly enabled for multi-user features

### 4. Authentication & Authorization
#### Firebase Security Rules (when enabled)
- Default deny all: `allow read, write: if false`
- Users can only read their own documents: `request.auth.uid == userId`
- Writes are handled by Cloud Functions only
- Registration invites: Admin SDK only, no client access

#### Token Handling
- Registration invite tokens use SHA-256 hashing
- Raw tokens are never stored, only hashes
- Tokens generated using cryptographically secure random bytes (32 bytes default)

### 5. Dependencies
#### Current Vulnerabilities (apps/web)
As of last scan:
- **Critical**: `@vitest/ui` and `vitest` (dev dependencies only, not in production)
  - Range: 1.3.0 - 1.6.0
  - Fix: Update to 1.6.1+
- **Moderate**: `esbuild` and `vite` (dev dependencies)
  - Issue: GHSA-67mh-4wv8-2f99 (development server only)
  - Fix: Update to vite 7.3.1+

**Note**: These vulnerabilities only affect development environments, not production builds.

#### Functions Dependencies
- ✅ No vulnerabilities detected

### 6. Build & Deployment Security
- GitHub Actions workflow uses:
  - Minimal permissions: `contents: read, pages: write, id-token: write`
  - Secrets stored in GitHub Secrets (not in code):
    - `VITE_GA_MEASUREMENT_ID` (optional Google Analytics)
  - No private keys or credentials in repository
- Production builds are static files (HTML, CSS, JS) served via GitHub Pages
- HTTPS enforced by GitHub Pages

### 7. Error Handling & Logging
- Error messages are generic and don't expose:
  - API keys or tokens
  - Internal paths or system information
  - Stack traces in production builds
- Console logs in production:
  - Only log public, non-sensitive status information
  - BGG API logs: "Using API key" vs "No API key" (boolean state only)
  - Firebase logs: Connection status and configuration state

### 8. Input Validation
- CSV import: Validates column structure before processing
- BGG URLs: Validated format before parsing
- User input: Sanitized through React's built-in XSS protection
- File uploads: Only specific formats accepted (CSV, ZIP for backup)

### 9. Third-Party Services
#### BoardGameGeek API
- Public API for game information
- Optional authentication via API key
- No personal data transmitted

#### Firebase (Optional)
- Used only when explicitly enabled
- Firestore security rules enforce access control
- Cloud Functions handle sensitive operations
- Emulator mode available for local development

#### Google Analytics (Optional)
- Only enabled in production when `VITE_GA_MEASUREMENT_ID` is set
- No personally identifiable information tracked
- Standard GA4 privacy controls apply

## Security Best Practices for Developers

### Environment Variables
1. Never commit `.env` files (except `.env.example` template)
2. Use `.env.local` for local development secrets
3. Document all environment variables in `.env.example`
4. Use `VITE_` prefix for client-side variables only

### API Keys & Secrets
1. Store in environment variables or GitHub Secrets
2. Never log actual key values
3. Use `type="password"` for sensitive input fields
4. Clear from memory after use when possible

### Dependencies
1. Run `npm audit` regularly
2. Update dependencies with security fixes promptly
3. Review dependency changes in PRs
4. Use `npm audit fix` for automated updates when safe

### Firebase Security
1. Keep Firestore rules restrictive (deny by default)
2. Use Admin SDK for privileged operations
3. Test rules with Firebase Emulator
4. Never commit service account keys

### Code Review
1. Check for hardcoded secrets before committing
2. Review console logs for sensitive data
3. Validate input from external sources
4. Use prepared statements/parameterized queries

## Reporting a Vulnerability

If you discover a security vulnerability in PIKME, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer directly (see GitHub profile)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

We will respond within 48 hours and work with you to address the issue.

## Security Checklist

Before deploying to production:
- [ ] No `.env` files committed
- [ ] No API keys or secrets in code
- [ ] Dependencies scanned with `npm audit`
- [ ] Firebase rules tested and restrictive
- [ ] Error messages don't expose sensitive info
- [ ] Console logs don't contain secrets
- [ ] `.gitignore` up to date
- [ ] GitHub Actions secrets configured
- [ ] HTTPS enabled on hosting platform

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-16 | 1.0 | Initial security policy created |

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
