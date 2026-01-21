/**
 * Firebase Initialization (REQ-100)
 *
 * This module handles lazy initialization of Firebase services.
 * Firebase is only loaded when the feature flag is enabled.
 */

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import {
  getFirebaseFeatureConfig,
  getFirebaseProjectConfig,
  isFirebaseAvailable,
} from './config';

// Singleton instances
let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let functions: Functions | null = null;
let initPromise: Promise<boolean> | null = null;
let initError: Error | null = null;

/**
 * Initialize Firebase (called once, idempotent).
 * Returns true if Firebase is ready, false if disabled or failed.
 */
export async function initializeFirebase(): Promise<boolean> {
  // Return cached result if already attempted
  if (initPromise) return initPromise;

  initPromise = doInitialize();
  return initPromise;
}

async function doInitialize(): Promise<boolean> {
  // Check feature flag first (no imports if disabled)
  if (!isFirebaseAvailable()) {
    return false;
  }

  const projectConfig = getFirebaseProjectConfig();
  if (!projectConfig) {
    console.warn('[Firebase] Missing project configuration');
    return false;
  }

  const featureConfig = getFirebaseFeatureConfig();

  try {
    // Dynamic import to avoid bundling when disabled
    const { initializeApp } = await import('firebase/app');
    const { getAuth, connectAuthEmulator } = await import('firebase/auth');
    const { getFirestore, connectFirestoreEmulator } = await import(
      'firebase/firestore'
    );
    const { getFunctions, connectFunctionsEmulator } = await import(
      'firebase/functions'
    );

    // Initialize app
    firebaseApp = initializeApp(projectConfig);

    // Initialize services
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    functions = getFunctions(firebaseApp);

    // Connect to emulators if enabled
    if (featureConfig.useEmulators) {
      const host = featureConfig.emulatorHost;

      connectAuthEmulator(auth, `http://${host}:${featureConfig.authPort}`, {
        disableWarnings: true,
      });

      connectFirestoreEmulator(
        firestore,
        host,
        featureConfig.firestorePort
      );

      connectFunctionsEmulator(
        functions,
        host,
        featureConfig.functionsPort
      );
    }

    return true;
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error));
    console.error('[Firebase] Initialization failed:', initError.message);
    return false;
  }
}

/**
 * Get Firebase Auth instance (null if not initialized).
 */
export function getAuthInstance(): Auth | null {
  return auth;
}

/**
 * Get Firestore instance (null if not initialized).
 */
export function getFirestoreInstance(): Firestore | null {
  return firestore;
}

/**
 * Get Functions instance (null if not initialized).
 */
export function getFunctionsInstance(): Functions | null {
  return functions;
}

/**
 * Get Firebase App instance (null if not initialized).
 */
export function getFirebaseAppInstance(): FirebaseApp | null {
  return firebaseApp;
}

/**
 * Get the initialization error if any.
 */
export function getFirebaseInitError(): Error | null {
  return initError;
}

/**
 * Check if Firebase has been successfully initialized.
 */
export function isFirebaseInitialized(): boolean {
  return firebaseApp !== null && initError === null;
}
