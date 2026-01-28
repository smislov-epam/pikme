/**
 * BGG HTML Proxy Cloud Function (REQ-109 extension)
 *
 * Fetches and returns HTML from BoardGameGeek game pages for scraping.
 * This solves CORS issues when allorigins.win or other public proxies fail.
 *
 * Unlike the XML API proxy, this doesn't require authentication and simply
 * forwards the HTML page content to allow client-side extraction.
 */

/* global URL, fetch */

import { onCall, HttpsError } from 'firebase-functions/v2/https';

/**
 * Request payload for BGG HTML proxy
 */
interface BggHtmlProxyRequest {
  /** BGG game ID to fetch HTML for */
  bggId: number;
}

/**
 * Response from BGG HTML proxy
 */
interface BggHtmlProxyResponse {
  /** HTML content from BGG game page */
  html: string;
  /** HTTP status code from BGG */
  status: number;
}

/**
 * Proxy requests to fetch BGG game page HTML.
 *
 * This is a callable function that can be invoked from the web app.
 * It handles CORS automatically and returns the raw HTML for client-side scraping.
 */
export const bggHtmlProxy = onCall<BggHtmlProxyRequest, Promise<BggHtmlProxyResponse>>(
  async (request) => {
    const { data } = request;

    // Validate required fields
    if (!data?.bggId || typeof data.bggId !== 'number') {
      throw new HttpsError('invalid-argument', 'Missing or invalid required field: bggId');
    }

    // Build URL
    const url = `https://boardgamegeek.com/boardgame/${data.bggId}`;

    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'text/html',
      'User-Agent': 'PikMeApp/1.0 (Firebase Functions)',
    };

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const html = await response.text();

      // Handle specific status codes
      if (response.status === 404) {
        throw new HttpsError('not-found', 'BGG game not found');
      }

      if (response.status === 429) {
        throw new HttpsError('resource-exhausted', 'BGG rate limit exceeded');
      }

      if (!response.ok) {
        throw new HttpsError(
          'internal',
          `BGG error: ${response.status} ${response.statusText}`
        );
      }

      return {
        html,
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
  }
);
