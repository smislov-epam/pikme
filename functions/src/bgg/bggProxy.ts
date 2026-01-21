/**
 * BGG API Proxy Cloud Function (REQ-109)
 *
 * Proxies requests to BoardGameGeek API to avoid CORS issues.
 * The BGG API (api.geekdo.com) doesn't include CORS headers,
 * so browser requests from pikme.online are blocked.
 *
 * This function forwards requests server-side where CORS doesn't apply.
 * It uses a server-side BGG API key from Firebase secrets, so users
 * don't need to configure their own key.
 */

/* global URL, fetch */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

/**
 * BGG API key stored in Firebase secrets.
 * Set via: firebase functions:secrets:set BGG_API_KEY
 */
const bggApiKeySecret = defineSecret('BGG_API_KEY');

/**
 * BGG API base URL
 */
const BGG_API_BASE = 'https://api.geekdo.com/xmlapi2';

/**
 * Allowed BGG endpoints for security (whitelist)
 */
const ALLOWED_ENDPOINTS = [
  'search',
  'thing',
  'collection',
  'hot',
  'plays',
  'user',
];

/**
 * Request payload for BGG proxy
 */
interface BggProxyRequest {
  /** BGG API endpoint (e.g., 'search', 'thing', 'collection') */
  endpoint: string;
  /** Query parameters as key-value pairs */
  params: Record<string, string>;
}

/**
 * Response from BGG proxy
 */
interface BggProxyResponse {
  /** XML response from BGG API */
  xml: string;
  /** HTTP status code from BGG */
  status: number;
}

/**
 * Proxy requests to BGG API.
 *
 * This is a callable function that can be invoked from the web app.
 * It handles CORS automatically and forwards requests to BGG.
 * Uses a server-side API key so users don't need to configure one.
 */
export const bggProxy = onCall<BggProxyRequest, Promise<BggProxyResponse>>(
  { secrets: [bggApiKeySecret] },
  async (request) => {
    const { data } = request;

    // Validate required fields
    if (!data?.endpoint) {
      throw new HttpsError('invalid-argument', 'Missing required field: endpoint');
    }

    // Security: Only allow whitelisted endpoints
    if (!ALLOWED_ENDPOINTS.includes(data.endpoint)) {
      throw new HttpsError(
        'invalid-argument',
        `Invalid endpoint: ${data.endpoint}. Allowed: ${ALLOWED_ENDPOINTS.join(', ')}`
      );
    }

    // Build URL with query parameters
    const url = new URL(`${BGG_API_BASE}/${data.endpoint}`);
    if (data.params) {
      for (const [key, value] of Object.entries(data.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'application/xml',
      'User-Agent': 'PikMeApp/1.0 (Firebase Functions)',
    };

    // Use server-side API key from Firebase secrets
    const apiKey = bggApiKeySecret.value();
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    const xml = await response.text();

    // Handle BGG-specific status codes
    if (response.status === 202) {
      // BGG is queuing the request - client should retry
      return {
        xml: '',
        status: 202,
      };
    }

    if (response.status === 429) {
      throw new HttpsError('resource-exhausted', 'BGG API rate limit exceeded');
    }

    if (response.status === 401) {
      throw new HttpsError('unauthenticated', 'BGG API authentication failed');
    }

    if (!response.ok) {
      throw new HttpsError(
        'internal',
        `BGG API error: ${response.status} ${response.statusText}`
      );
    }

    return {
      xml,
      status: response.status,
    };
  } catch (error) {
    // Re-throw HttpsError as-is
    if (error instanceof HttpsError) {
      throw error;
    }

    // Wrap other errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to fetch from BGG: ${message}`);
  }
});
