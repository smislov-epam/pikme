# Services

Business logic and side-effectful code for the PIKME application.

## Structure

```
services/
├── backup/           # CSV import/export (REQ-040)
│   ├── backup.ts     # Export to .zip
│   ├── restore.ts    # Import from .zip
│   ├── parseTables.ts
│   └── types.ts
├── bgg/              # BoardGameGeek API integration
│   ├── bggService.ts # Main façade: collection, thing, search
│   ├── bggScraper.ts # HTML scraping fallback
│   ├── backoff.ts    # Exponential backoff for 202 polling
│   ├── errors.ts     # Error classes
│   ├── parseCollectionXml.ts
│   ├── parseThingXml.ts
│   └── normalizePlayTime.ts
├── db/               # Dexie database service layer
│   ├── index.ts      # Main exports
│   └── userIdService.ts
├── filtering/        # Game filtering logic
│   ├── applyGameFilters.ts
│   └── filterConstants.ts  # DEFAULT_FILTERS, isCoopGame
├── http/             # HTTP utilities
│   └── rateLimiter.ts
├── preferences/      # Preference rules
│   └── preferenceRules.ts
├── recommendation/   # Scoring algorithm
│   ├── computeRecommendation.ts  # Borda count scoring
│   └── promotePick.ts
├── savedNights/      # Night reuse detection
│   └── findReusableNight.ts
├── storage/          # UI preferences persistence
│   ├── uiPreferences.ts
│   └── wizardStateStorage.ts
├── toast/            # Notification service
│   └── toastService.ts
└── ui/               # UI helpers
    └── playerCountChipTone.ts
```

## Key Modules

### bgg/
BGG API integration with 202 polling support. Handles:
- Collection fetching with `own=1`, `stats=1`
- Thing endpoint for game details
- Exponential backoff for queued requests
- XML parsing to typed objects

### recommendation/
Pure scoring functions extracted from hooks:
- **computeRecommendation.ts** - Borda count algorithm with veto logic
- **promotePick.ts** - Alternative promotion to top pick

### filtering/
- **applyGameFilters.ts** - Applies filter criteria to games
- **filterConstants.ts** - DEFAULT_FILTERS, coop game detection

### backup/
CSV-based backup/restore (REQ-040):
- Export all tables to a `.zip` file
- Import with Replace or Merge modes
- Schema versioning for format evolution

## Testing

Each module has colocated tests (`.test.ts` files).
Run: `npm run test -- services/`
