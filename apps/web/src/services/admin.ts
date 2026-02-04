/**
 * Admin Service (REQ-111)
 *
 * Client-side service for admin-related Cloud Function calls.
 */

import { callFunction } from './firebase/callFunction';

// ============================================================================
// Types
// ============================================================================

export type InviteRequestStatus = 'pending' | 'approved' | 'rejected';

export interface InviteRequest {
  requestId: string;
  email: string;
  displayName: string;
  message: string;
  status: InviteRequestStatus;
  requestedAt: string;
  processedAt: string | null;
  processedByUid: string | null;
  rejectionReason: string | null;
}

export interface RegistrationInvite {
  inviteId: string;
  token: string | null;
  maxUses: number;
  uses: number;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
  forEmail: string | null;
  email?: string | null;
  displayName?: string | null;
  isExpired: boolean;
  isActive: boolean;
  usedAt: string | null;
}

export interface RegisteredUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  invited: boolean;
  disabled: boolean;
  createdAt: string | null;
}

// ============================================================================
// Admin Status
// ============================================================================

/**
 * Check if the current user is an admin.
 */
export async function checkAdminStatus(): Promise<boolean> {
  const result = await callFunction<Record<string, never>, { isAdmin: boolean }>(
    'checkAdminStatus',
    {}
  );
  return result.isAdmin;
}

// ============================================================================
// Invite Requests
// ============================================================================

/**
 * List invite requests.
 */
export async function listInviteRequests(
  status: InviteRequestStatus | 'all' = 'pending'
): Promise<InviteRequest[]> {
  const result = await callFunction<
    { status: InviteRequestStatus | 'all' },
    { requests: InviteRequest[] }
  >('listInviteRequests', { status });
  return result.requests;
}

/**
 * Approve an invite request.
 */
export async function approveInviteRequest(
  requestId: string
): Promise<{ inviteId: string; inviteLink: string; email: string }> {
  return callFunction<
    { requestId: string },
    { ok: boolean; inviteId: string; inviteLink: string; email: string }
  >('approveInviteRequest', { requestId });
}

/**
 * Reject an invite request.
 */
export async function rejectInviteRequest(
  requestId: string,
  reason: string
): Promise<{ email: string }> {
  return callFunction<
    { requestId: string; reason: string },
    { ok: boolean; email: string }
  >('rejectInviteRequest', { requestId, reason });
}

// ============================================================================
// Registration Invites
// ============================================================================

/**
 * List registration invites.
 */
export async function listRegistrationInvites(
  filter: 'active' | 'all' = 'active'
): Promise<RegistrationInvite[]> {
  const includeExpired = filter === 'all';
  const result = await callFunction<
    { includeExpired: boolean },
    { invites: RegistrationInvite[] }
  >('listRegistrationInvites', { includeExpired });
  return result.invites;
}

/**
 * Create a new registration invite for a specific user.
 */
export async function createRegistrationInvite(
  email: string,
  displayName: string,
  expiresInDays = 7
): Promise<RegistrationInvite> {
  const result = await callFunction<
    { email: string; displayName: string; expiresInDays: number },
    { ok: boolean; invite: RegistrationInvite }
  >('createRegistrationInvite', { email, displayName, expiresInDays });
  return result.invite;
}

/**
 * Revoke a registration invite.
 */
export async function revokeRegistrationInvite(inviteId: string): Promise<void> {
  await callFunction<{ inviteId: string }, { ok: boolean }>(
    'revokeRegistrationInvite',
    { inviteId }
  );
}

// ============================================================================
// Users
// ============================================================================

/**
 * List registered users.
 */
export async function listUsers(
  filter: 'all' | 'active' | 'disabled' = 'all'
): Promise<RegisteredUser[]> {
  const result = await callFunction<
    { filter: 'all' | 'active' | 'disabled' },
    { users: RegisteredUser[] }
  >('listUsers', { filter });
  return result.users;
}

/**
 * Revoke user access.
 */
export async function revokeUserAccess(uid: string): Promise<void> {
  await callFunction<{ uid: string }, { ok: boolean }>('revokeUserAccess', { uid });
}

/**
 * Restore user access.
 */
export async function restoreUserAccess(uid: string): Promise<void> {
  await callFunction<{ uid: string }, { ok: boolean }>('restoreUserAccess', { uid });
}
