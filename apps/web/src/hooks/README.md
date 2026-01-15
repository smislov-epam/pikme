# Hooks

This folder contains custom React hooks for the PIKME application.

## Structure

```
hooks/
├── useWizardState.ts          # Original monolithic hook (legacy, being phased out)
├── useWizardStateComposed.ts  # New composer hook using sub-hooks
├── useGameNotesCount.ts       # Game notes counter hook
└── wizard/                    # Composable wizard sub-hooks
    ├── index.ts               # Exports with architecture docs
    ├── types.ts               # Shared TypeScript interfaces
    ├── useFiltersState.ts     # Filter configuration
    ├── useGamesState.ts       # Game collection management
    ├── usePlayersState.ts     # User management
    ├── usePreferencesState.ts # User preference rankings
    ├── useRecommendationState.ts # Borda count scoring
    ├── useSavedNightsState.ts # Night persistence
    └── __tests__/
        └── fixtures.ts        # Shared test data
```

## Architecture

The wizard state has been refactored from a monolithic 1,289-line hook into
focused, single-responsibility hooks following the composition pattern:

```
useWizardStateComposed (composer)
  ├── usePlayersState     - User add/remove/organizer
  ├── useGamesState       - Game collection & session management
  ├── useFiltersState     - Filter configuration
  ├── usePreferencesState - User preference rankings
  ├── useRecommendationState - Borda count scoring
  └── useSavedNightsState - Night persistence
```

### Key Patterns

1. **Dependency Injection**: Each hook receives dependencies as parameters
2. **Direct Setters**: Hooks expose setters for cross-hook coordination
3. **Callbacks**: Async coordination via onUserAdded, onNeedsApiKey callbacks
4. **Pure Logic**: Business logic extracted to `services/` for testability
5. **Colocated Tests**: Each hook has a `.test.ts` file alongside it

### Data Flow

1. **Players** → adds users, triggers game loading via onUserAdded callback
2. **Games** → manages collection, session subset, exclusions
3. **Filters** → derives `filteredGames` from `sessionGames` + filters
4. **Preferences** → user rankings applied to `filteredGames`
5. **Recommendation** → computes Borda scores from preferences
6. **Saved Nights** → persists/restores complete sessions

## Testing

Run all hook tests:
```bash
npm run test -- --run hooks/
```

Each hook has its own test file with comprehensive coverage.
Shared mock data is in `wizard/__tests__/fixtures.ts`.

## Adding Features

When adding new wizard functionality:

1. Identify which domain the feature belongs to
2. Add state/actions to the appropriate hook
3. Export new types from `types.ts`
4. Wire up in `useWizardStateComposed` if cross-cutting
5. Add tests alongside the hook
6. Keep files under 180 lines (split if needed)
