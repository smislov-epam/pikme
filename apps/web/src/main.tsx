import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeGoogleAnalytics, trackPageView } from './services/analytics/googleAnalytics'

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
