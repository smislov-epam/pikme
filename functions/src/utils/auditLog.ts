/**
 * Audit Logging Utilities (Security Enhancement)
 *
 * Provides structured logging for security-relevant actions.
 * Logs are written to Cloud Logging for searchability in Google Cloud Console.
 *
 * Usage:
 *   import { logAudit, AuditAction } from '../utils/auditLog.js';
 *   logAudit(AuditAction.SESSION_CREATED, { sessionId, hostUid });
 */

import { logger } from 'firebase-functions';

/**
 * Audit action types for categorized logging.
 */
export enum AuditAction {
  // Session lifecycle
  SESSION_CREATED = 'session.created',
  SESSION_CLOSED = 'session.closed',
  SESSION_DELETED = 'session.deleted',
  SESSION_EXPIRED = 'session.expired',

  // Guest actions
  GUEST_JOINED = 'guest.joined',
  GUEST_REMOVED = 'guest.removed',
  GUEST_READY = 'guest.ready',

  // Registration
  INVITE_REQUESTED = 'invite.requested',
  INVITE_APPROVED = 'invite.approved',
  INVITE_REJECTED = 'invite.rejected',
  INVITE_CREATED = 'invite.created',
  INVITE_REVOKED = 'invite.revoked',
  INVITE_REDEEMED = 'invite.redeemed',

  // User management
  USER_REGISTERED = 'user.registered',
  USER_ACCESS_REVOKED = 'user.access_revoked',
  USER_ACCESS_RESTORED = 'user.access_restored',

  // Admin actions
  ADMIN_ACCESS_DENIED = 'admin.access_denied',
  ADMIN_ACTION = 'admin.action',
}

/**
 * Severity levels for audit logs.
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Audit log entry structure.
 */
interface AuditLogEntry {
  action: AuditAction;
  severity?: AuditSeverity;
  actorUid?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  details?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Log an audit event to Cloud Logging.
 *
 * @param action - The audit action type
 * @param data - Additional context for the audit entry
 */
export function logAudit(
  action: AuditAction,
  data: Omit<AuditLogEntry, 'action' | 'timestamp'> = {}
): void {
  const entry: AuditLogEntry = {
    action,
    timestamp: new Date().toISOString(),
    ...data,
  };

  const severity = data.severity || AuditSeverity.INFO;

  // Use appropriate log level based on severity
  switch (severity) {
    case AuditSeverity.ERROR:
      logger.error('[AUDIT]', entry);
      break;
    case AuditSeverity.WARNING:
      logger.warn('[AUDIT]', entry);
      break;
    default:
      logger.info('[AUDIT]', entry);
  }
}

/**
 * Log a security-relevant warning.
 *
 * @param message - Description of the security event
 * @param data - Additional context
 */
export function logSecurityWarning(
  message: string,
  data: Record<string, unknown> = {}
): void {
  logger.warn('[SECURITY]', {
    message,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

/**
 * Log admin access denial for security monitoring.
 *
 * @param uid - The UID that was denied
 * @param action - The action that was attempted
 */
export function logAdminAccessDenied(uid: string, action: string): void {
  logAudit(AuditAction.ADMIN_ACCESS_DENIED, {
    severity: AuditSeverity.WARNING,
    actorUid: uid,
    details: { attemptedAction: action },
  });
}
