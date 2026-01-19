import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeGoogleAnalytics, trackPageView } from './services/analytics/googleAnalytics'

// Handle dynamic import failures (typically after deployment when chunks have new hashes)
// This prevents "Failed to fetch dynamically imported module" errors from breaking the app
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('Failed to fetch dynamically imported module') ||
    event.message?.includes('Unable to preload CSS') ||
    event.message?.includes('Loading chunk') ||
    event.message?.includes('Loading CSS chunk')
  ) {
    console.warn('[App] Detected stale module error, reloading page...')
    // Avoid infinite reload loop by checking sessionStorage
    const reloadKey = 'pikme_chunk_reload'
    const lastReload = sessionStorage.getItem(reloadKey)
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString())
      window.location.reload()
    }
  }
})

// Also catch unhandled promise rejections for dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || String(event.reason)
  if (
    reason?.includes('Failed to fetch dynamically imported module') ||
    reason?.includes('Unable to preload CSS') ||
    reason?.includes('Loading chunk') ||
    reason?.includes('Importing a module script failed')
  ) {
    console.warn('[App] Detected stale module error (promise), reloading page...')
    const reloadKey = 'pikme_chunk_reload'
    const lastReload = sessionStorage.getItem(reloadKey)
    const now = Date.now()
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, now.toString())
      window.location.reload()
    }
  }
})

// Keep a single canonical origin in production.
// IndexedDB is scoped per-origin, so `www.pikme.online` and `pikme.online` would otherwise have separate local DBs.
const canonicalHost = (import.meta.env.VITE_CANONICAL_HOST as string | undefined) || undefined
if (
  import.meta.env.PROD &&
  canonicalHost &&
  window.location.hostname === `www.${canonicalHost}`
) {
  const url = new URL(window.location.href)
  url.hostname = canonicalHost
  window.location.replace(url.toString())
}

initializeGoogleAnalytics()
trackPageView('Pikme - Board Game Selector')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
