/**
 * Firebase Services (REQ-100)
 *
 * Public API for Firebase integration.
 * All Firebase features are gated by the VITE_FEATURE_FIREBASE flag.
 */

export {
  getFirebaseFeatureConfig,
  getFirebaseProjectConfig,
  isFirebaseAvailable,
  type FirebaseFeatureConfig,
  type FirebaseProjectConfig,
} from './config';

export {
  initializeFirebase,
  getAuthInstance,
  getFirestoreInstance,
  getFunctionsInstance,
  getFirebaseAppInstance,
  getFirebaseInitError,
  isFirebaseInitialized,
} from './init';

// Auth utilities (REQ-101)
export {
  getCurrentUser,
  signInWithEmail,
  createAccountWithEmail,
  signOut,
  onAuthStateChange,
  type AuthUser,
} from './auth';

// Functions client (REQ-101)
export {
  redeemRegistrationInvite,
  getRegistrationErrorCode,
  RegistrationErrorCodes,
} from './functions';
