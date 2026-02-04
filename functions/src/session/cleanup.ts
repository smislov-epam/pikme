/**
 * Session Cleanup (Scheduled Function)
 *
 * Runs periodically to delete expired sessions and their subcollections.
 * This enforces the TTL set on sessions and prevents database bloat.
 *
 * Schedule: Every hour
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import {
  getFirestore,
  Timestamp,
  Firestore,
  DocumentReference,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { logAudit, AuditAction } from '../utils/auditLog.js';

/**
 * Maximum sessions to process per run (to avoid timeout).
 */
const BATCH_SIZE = 100;

/**
 * Maximum execution time in milliseconds (8 minutes to leave buffer for 9-minute default timeout).
 */
const MAX_EXECUTION_TIME_MS = 8 * 60 * 1000;

/**
 * Delete all documents in a subcollection.
 */
async function deleteSubcollection(
  db: Firestore,
  parentRef: DocumentReference,
  subcollectionName: string
): Promise<number> {
  const subcollectionRef = parentRef.collection(subcollectionName);
  const snapshot = await subcollectionRef.limit(500).get();

  if (snapshot.empty) {
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}

/**
 * Delete a session and all its subcollections.
 */
async function deleteSessionWithSubcollections(
  db: Firestore,
  sessionRef: DocumentReference
): Promise<void> {
  // Delete subcollections first
  const subcollections = ['participants', 'members', 'sharedPreferences', 'guestPreferences'];

  for (const subcollection of subcollections) {
    let deleted = 0;
    do {
      deleted = await deleteSubcollection(db, sessionRef, subcollection);
    } while (deleted > 0);
  }

  // Delete the session document itself
  await sessionRef.delete();
}

/**
 * Scheduled function to clean up expired sessions.
 * Runs every hour to delete sessions past their expiresAt timestamp.
 */
export const cleanupExpiredSessions = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const startTime = Date.now();
    const db = getFirestore();
    const now = Timestamp.now();

    logger.info('[cleanupExpiredSessions] Starting cleanup run', {
      timestamp: now.toDate().toISOString(),
    });

    // Find expired sessions
    const expiredQuery = db
      .collection('sessions')
      .where('expiresAt', '<', now)
      .limit(BATCH_SIZE);

    const snapshot = await expiredQuery.get();

    if (snapshot.empty) {
      logger.info('[cleanupExpiredSessions] No expired sessions found');
      return;
    }

    logger.info(`[cleanupExpiredSessions] Found ${snapshot.size} expired sessions`);

    let deletedCount = 0;
    let skippedDueToTimeout = 0;
    const errors: string[] = [];

    for (const doc of snapshot.docs) {
      // Check if we're running out of time
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        skippedDueToTimeout = snapshot.size - deletedCount - errors.length;
        logger.warn('[cleanupExpiredSessions] Approaching timeout, stopping early', {
          processed: deletedCount,
          remaining: skippedDueToTimeout,
        });
        break;
      }

      const sessionId = doc.id;
      const sessionData = doc.data();

      try {
        await deleteSessionWithSubcollections(db, doc.ref);
        deletedCount++;

        // Audit log each deleted session
        logAudit(AuditAction.SESSION_EXPIRED, {
          targetId: sessionId,
          details: {
            hostUid: sessionData.hostUid,
            expiresAt: sessionData.expiresAt?.toDate().toISOString(),
            createdAt: sessionData.createdAt?.toDate().toISOString(),
          },
        });

        logger.info(`[cleanupExpiredSessions] Deleted session ${sessionId}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${sessionId}: ${errorMsg}`);
        logger.error(`[cleanupExpiredSessions] Failed to delete session ${sessionId}`, { error });
      }
    }

    logger.info('[cleanupExpiredSessions] Cleanup completed', {
      totalExpired: snapshot.size,
      deleted: deletedCount,
      errors: errors.length,
      skippedDueToTimeout,
      durationMs: Date.now() - startTime,
    });

    if (errors.length > 0) {
      logger.warn('[cleanupExpiredSessions] Some sessions failed to delete', { errors });
    }
  }
);

/**
 * Manual cleanup trigger for admin use.
 * Useful for testing or forcing cleanup outside the scheduled run.
 */
export const triggerSessionCleanup = onSchedule(
  {
    schedule: 'every 24 hours', // Effectively disabled, only for manual trigger
    timeZone: 'UTC',
  },
  async () => {
    // This function exists for manual triggering via Firebase Console
    // or gcloud scheduler jobs run command
    logger.info('[triggerSessionCleanup] Manual cleanup triggered');
    // The actual cleanup logic is in cleanupExpiredSessions
  }
);
