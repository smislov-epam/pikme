# REQ-107: Hardening & Reliability Improvements

## 1) Metadata
- **ID**: REQ-107
- **Title**: Application Hardening & Reliability Improvements
- **Owner**: Engineering
- **Status**: In Progress
- **Target Release**: Q1 2026
- **Depends On**: REQ-100 (Firebase Infrastructure)
- **User Surfaces**: App (all pages)

## 2) Problem → Outcome

- **Problem (now)**: The application lacks error boundaries causing full app crashes on React errors. Cloud Function calls have no retry logic for transient failures. Several async operations silently swallow errors making debugging difficult. No protection against Cloud Function abuse.

- **Outcome (users can)**: Users experience graceful error handling with recovery options. Transient network failures automatically retry. Developers can debug issues with proper error logging. Cloud Functions are protected from abuse.

- **Definition of Done (DoD)**:
  - React errors are caught by error boundaries and show recovery UI
  - Cloud Function calls retry with exponential backoff on transient failures
  - No silent error swallowing - all errors logged appropriately
  - Async operations properly clean up on unmount (no memory leaks)
  - Cloud Functions protected with App Check (Phase 2)

## 3) Scope

### In Scope
- Add React Error Boundaries at route level
- Create retry wrapper for Cloud Function calls
- Fix all silent `catch` blocks with proper logging
- Add `AbortController` / `isMounted` cleanup to async hooks
- Consolidate repeated Firebase dynamic imports
- Add unit tests for retry logic and error handling

### Out of Scope / Explicit Non-Goals
- Splitting `useWizardState.ts` (1308 lines) - **deferred to REQ-108**
- Creating shared types package between frontend/functions - **deferred to REQ-109**
- Structured logging with correlation IDs in Cloud Functions - **deferred to REQ-110**
- Firebase App Check integration - **deferred to Phase 2 of this REQ**

## 4) Behavioral Spec (Testable)

### 4.1 Error Boundaries

**Behavior**:
- When a React component throws during render, the error boundary catches it
- User sees a friendly error message with "Try Again" button
- Clicking "Try Again" resets the error state and re-renders
- Error is logged to console (and analytics in future)

**Placement**:
- Wrap each route component (`WizardPage`, `SessionJoinPage`, `RegistrationPage`, etc.)
- Wrap critical components like `CreateSessionDialog`, `GuestPreferencesView`

**UI**:
```
┌────────────────────────────────────────┐
│  ⚠️ Something went wrong              │
│                                        │
│  We encountered an unexpected error.   │
│  Please try again or refresh the page. │
│                                        │
│  [Try Again]  [Go Home]               │
│                                        │
│  ▼ Technical Details (collapsed)       │
└────────────────────────────────────────┘
```

### 4.2 Cloud Function Retry Logic

**Behavior**:
- Transient errors (network, 503, 429) trigger automatic retry
- Retry with exponential backoff: 1s, 2s, 4s (max 3 attempts)
- Non-retryable errors (400, 401, 403, 404) fail immediately
- User sees loading state during retries
- Final failure shows actionable error message

**Retryable conditions**:
- Network errors (`TypeError: Failed to fetch`)
- HTTP 429 (Too Many Requests)
- HTTP 503 (Service Unavailable)
- HTTP 500 (Internal Server Error) - with caution

**Non-retryable**:
- HTTP 400 (Bad Request) - client error
- HTTP 401/403 (Auth errors)
- HTTP 404 (Not Found)
- Business logic errors (e.g., "Session is full")

### 4.3 Silent Error Fixes

**Affected locations**:
| File | Current Behavior | New Behavior |
|------|------------------|--------------|
| `useSessionJoinActions.ts` | Empty catch, logs warning | Log error, show toast if critical |
| `useSessionReadyStatus.ts` | Silent catch in polling | Log warning, continue polling |
| `useSessionResultsNotification.ts` | Silent catch | Log warning, continue polling |
| `useActiveSessions.ts` | Silent catch | Log warning, use cached data |

### 4.4 Async Cleanup

**Pattern to apply**:
```typescript
useEffect(() => {
  let isMounted = true;
  const controller = new AbortController();
  
  const fetchData = async () => {
    try {
      const result = await someAsyncOp({ signal: controller.signal });
      if (isMounted) {
        setState(result);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && isMounted) {
        console.error('Fetch failed:', err);
      }
    }
  };
  
  fetchData();
  
  return () => {
    isMounted = false;
    controller.abort();
  };
}, [deps]);
```

## 5) Data & Contracts

### 5.1 Error Types

```typescript
/** Categorized Firebase function error */
interface CloudFunctionError {
  code: string;           // Firebase error code
  message: string;        // Human-readable message
  isRetryable: boolean;   // Whether retry might succeed
  originalError?: Error;  // Underlying error
}

/** Retry configuration */
interface RetryConfig {
  maxAttempts: number;    // Default: 3
  baseDelayMs: number;    // Default: 1000
  maxDelayMs: number;     // Default: 10000
  retryableErrors: string[]; // Error codes to retry
}
```

### 5.2 Error Boundary Props

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface FallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}
```

## 6) Implementation Plan

### Step 1: Add ErrorBoundary component
- Create `apps/web/src/components/ErrorBoundary.tsx`
- Wrap routes in `App.tsx`
- Test with intentional error throw

### Step 2: Create retry wrapper
- Create `apps/web/src/services/firebase/retryWrapper.ts`
- Add unit tests for retry logic
- Apply to all functions in `sessionService.ts`

### Step 3: Fix silent error handling
- Update `useSessionJoinActions.ts`
- Update `useSessionReadyStatus.ts`
- Update `useSessionResultsNotification.ts`
- Update `useActiveSessions.ts`

### Step 4: Add async cleanup
- Add `isMounted` refs to polling hooks
- Verify no memory leak warnings in dev tools

### Step 5: Consolidate imports
- Cache `httpsCallable` import in `sessionService.ts`
- Verify no bundle size regression

### Step 6: Testing
- Unit tests for `retryWrapper`
- Unit tests for `ErrorBoundary`
- Integration test for retry behavior

## 7) Future Phases

### Phase 2: Firebase App Check
- Enable App Check in Firebase Console
- Add App Check initialization to `init.ts`
- Configure Cloud Functions to require valid tokens
- Add rate limiting per-user

### REQ-108: Split useWizardState.ts
- Extract `usePlayersState` (~200 lines)
- Extract `useFiltersState` (~150 lines)
- Extract `usePreferencesState` (~300 lines)
- Extract `useRecommendationState` (~200 lines)
- Keep coordinator hook for cross-concern logic

### REQ-109: Shared Types Package
- Create `packages/types/` workspace
- Move shared interfaces (Session, Game, Preferences)
- Generate types from Firestore schema
- Update imports in frontend and functions

### REQ-110: Structured Logging
- Add correlation ID to all Cloud Function calls
- Use structured JSON logging
- Add log level configuration
- Integrate with Cloud Logging

## 8) Testing Requirements

### Unit Tests Required
- `retryWrapper.test.ts`: Retry behavior, backoff timing, error categorization
- `ErrorBoundary.test.tsx`: Error catching, reset behavior, fallback rendering

### Integration Tests
- Cloud Function call with simulated network failure
- Error boundary recovery flow

## 9) Acceptance Criteria

1. [ ] Error boundaries catch React errors and show recovery UI
2. [ ] Cloud Functions retry 3 times on transient failures with exponential backoff
3. [ ] No silent `catch {}` blocks remain in session-related hooks
4. [ ] All polling hooks have proper cleanup on unmount
5. [ ] `httpsCallable` import is cached (not repeated per function)
6. [ ] Unit tests pass for retry wrapper and error boundary
7. [ ] No memory leak warnings in React DevTools during testing
