/**
 * Firebase Feature Configuration (REQ-100)
 *
 * Reads environment variables to determine Firebase behavior.
 * All Firebase features are DISABLED by default.
 */

export interface FirebaseFeatureConfig {
  /** Master flag: if false, Firebase SDK is never initialized */
  enabled: boolean;
  /** Connect to local emulators instead of production */
  useEmulators: boolean;
  /** Emulator host (default: localhost) */
  emulatorHost: string;
  /** Auth emulator port (default: 9099) */
  authPort: number;
  /** Firestore emulator port (default: 8080) */
  firestorePort: number;
  /** Functions emulator port (default: 5001) */
  functionsPort: number;
}

export interface FirebaseProjectConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * Parse a string env var as boolean (1/true/yes → true, else false)
 */
function parseBoolEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes'].includes(value.toLowerCase());
}

/**
 * Parse a string env var as integer with a default
 */
function parseIntEnv(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get Firebase feature configuration from environment variables.
 * Safe to call even when Firebase is disabled.
 */
export function getFirebaseFeatureConfig(): FirebaseFeatureConfig {
  return {
    enabled: parseBoolEnv(import.meta.env.VITE_FEATURE_FIREBASE),
    useEmulators: parseBoolEnv(import.meta.env.VITE_FIREBASE_USE_EMULATORS),
    emulatorHost: import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1',
    authPort: parseIntEnv(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT, 9098),
    firestorePort: parseIntEnv(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT, 8081),
    functionsPort: parseIntEnv(import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT, 5001),
  };
}

/**
 * Get Firebase project configuration from environment variables.
 * Returns null if required fields are missing.
 */
export function getFirebaseProjectConfig(): FirebaseProjectConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Require at least these three for a valid config
  if (!apiKey || !authDomain || !projectId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  };
}

/**
 * Check if Firebase is enabled AND properly configured.
 */
export function isFirebaseAvailable(): boolean {
  const featureConfig = getFirebaseFeatureConfig();
  if (!featureConfig.enabled) return false;
  return getFirebaseProjectConfig() !== null;
}
