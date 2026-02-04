/**
 * reCAPTCHA v3 Service (REQ-111)
 *
 * Provides spam protection for registration requests.
 * Gracefully degrades if not configured.
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

/**
 * Check if reCAPTCHA is configured and loaded.
 */
export function isRecaptchaConfigured(): boolean {
  return Boolean(RECAPTCHA_SITE_KEY) && typeof window.grecaptcha !== 'undefined';
}

/**
 * Execute reCAPTCHA v3 and get token.
 * Returns empty string if not configured (graceful fallback to IP-based rate limiting).
 *
 * @param action - The action name for analytics (e.g., 'request_access')
 * @returns Promise resolving to the reCAPTCHA token or empty string
 */
export async function getRecaptchaToken(action: string): Promise<string> {
  if (!RECAPTCHA_SITE_KEY) {
    // reCAPTCHA not configured - rely on server-side IP rate limiting
    return '';
  }

  if (typeof window.grecaptcha === 'undefined') {
    console.warn('[reCAPTCHA] Script not loaded, skipping verification');
    return '';
  }

  return new Promise((resolve) => {
    window.grecaptcha!.ready(async () => {
      try {
        const token = await window.grecaptcha!.execute(RECAPTCHA_SITE_KEY, { action });
        resolve(token);
      } catch (error) {
        console.error('[reCAPTCHA] Execution failed:', error);
        resolve('');
      }
    });
  });
}
