/**
 * Registration Service (REQ-111)
 *
 * Client-side service for registration-related Cloud Function calls.
 */

import { callFunctionNoRetry } from './firebase/callFunction';

/**
 * Request payload for registration invite request.
 */
export interface RequestRegistrationInviteData {
  email: string;
  displayName: string;
  message?: string;
  recaptchaToken?: string;
}

/**
 * Response from registration invite request.
 */
interface RequestRegistrationInviteResponse {
  ok: boolean;
  requestId: string;
}

/**
 * Submit a registration request.
 *
 * This is an unauthenticated endpoint - anyone can submit a request.
 *
 * @param data - Request data (email, displayName, optional message)
 * @returns Request ID on success
 * @throws Error with specific code on failure
 */
export async function requestRegistrationInvite(
  data: RequestRegistrationInviteData
): Promise<string> {
  const result = await callFunctionNoRetry<
    RequestRegistrationInviteData,
    RequestRegistrationInviteResponse
  >('requestRegistrationInvite', data);

  if (!result.ok) {
    throw new Error('Request submission failed');
  }

  return result.requestId;
}
