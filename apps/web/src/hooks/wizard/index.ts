/**
 * Wizard Hooks - Composable state management for the wizard flow.
 * 
 * This folder contains focused, single-responsibility hooks that together
 * manage the entire wizard state. The main `useWizardState` hook in the
 * parent folder composes these hooks and exposes a unified interface.
 * 
 * ## Architecture
 * 
 * ```
 * useWizardState (composer)
 *   ├── usePlayersState     - User add/remove/organizer
 *   ├── useGamesState       - Game collection & session management
 *   ├── useFiltersState     - Filter configuration
 *   ├── usePreferencesState - User preference rankings
 *   ├── useRecommendationState - Borda count scoring
 *   └── useSavedNightsState - Night persistence
 * ```
 * 
 * ## Data Flow
 * 
 * 1. **Players** → adds users, triggers game loading
 * 2. **Games** → manages collection, session subset, exclusions
 * 3. **Filters** → derives `filteredGames` from `sessionGames`
 * 4. **Preferences** → user rankings applied to `filteredGames`
 * 5. **Recommendation** → computes Borda scores from preferences
 * 6. **Saved Nights** → persists/restores complete sessions
 * 
 * ## Testing
 * 
 * Each hook has its own test file. Shared test fixtures are in
 * `__tests__/fixtures.ts` for consistent mock data across tests.
 * 
 * ## Adding Features
 * 
 * When adding new wizard functionality:
 * 1. Identify which domain the feature belongs to
 * 2. Add state/actions to the appropriate hook
 * 3. Export new types from `types.ts`
 * 4. Wire up in `useWizardState` composer if cross-cutting
 * 5. Add tests alongside the hook
 */

// Types
export * from './types'

// Hooks
export { useFiltersState } from './useFiltersState'
export { usePreferencesState } from './usePreferencesState'
export { useGamesState } from './useGamesState'
export { usePlayersState } from './usePlayersState'
export { useSavedNightsState } from './useSavedNightsState'
export { useRecommendationState } from './useRecommendationState'
