# Agent instructions (pikme)

## Project snapshot
- This repo currently contains product/design documentation for a **local-first Board Game Night Game Selector called PIKME**.
- Implementation code lives in `apps/web`; treat the docs in `Requirements/` as the source of truth.

## Source-of-truth docs (start here)
- Product scope + UX flow: start in `Requirements/`
  - 4-step wizard: **Players → Filters → Preferences → Result**
  - Sticky bottom CTA, mobile-first layout, per-user tabs, drag/drop preferences, local "Save game night".
- Technical expectations: see the architecture guidance in `Requirements/`
  - Target stack: React 19 + MUI + Dexie + `fast-xml-parser` + `dnd-kit`.
  - Key constraints: BGG 202 polling, local-first persistence, possible BGG CORS limitations.
- UI/UX consistency guidelines: `ui-ux-guidelines.md`
  - Treat this as the canonical source for visual/interaction consistency rules.
- **User journey flows**: `Requirements/user-journeys.md`
  - Identity model (local owner vs organizer vs Firebase UID)
  - First-time setup, registration, guest joining flows
  - Session creation with preference sharing
  - Includes ASCII diagrams and implementation checklist
  - **Always consult and update** when modifying identity or session flows.

## Requirements sources
- The original inputs are stored as DOCX in `Requirements/`.
- A helper script exists to extract plain text for review/diffing:
  - `tools/extract_docx_text.py`
  - It outputs `Requirements/_extracted_*.txt`.

## Common workflow in this repo
- Updating requirements:
  - create new requirements page using Requirements/requirements_template.md
  - prepare implementation plan
  - Update high level in `Requirements/*.md`.


## Development workflow
- **BGG API Key optional**: App works without it (add games via BGG links). For search/auto-import, register at https://boardgamegeek.com/applications
- Install deps: `npm --prefix "apps/web" install`
- Run dev server: `npm --prefix "apps/web" run dev -- --host`
- Build: `npm --prefix "apps/web" run build`
- Lint: `npm --prefix "apps/web" run lint`
- Run tests: `npm --prefix "apps/web" run test`

## Frontend folder structure (keep consistent)
- `apps/web/src/pages` (route-level screens, e.g. `WizardPage`)
- `apps/web/src/components` (shared UI components)
- `apps/web/src/services` (BGG API, caching, scoring helpers)
- `apps/web/src/store` (wizard state management)
- `apps/web/src/db` (Dexie schema + DB helpers)
- `apps/web/src/theme` (MUI theme)

## Consistency (hard guideline)
- Always strive for consistency across the whole wizard:
  - Same component patterns across steps (e.g., game tiles, action icon placement, empty states).
  - Same terminology and labels (avoid synonyms for the same concept).
  - Same interaction rules (e.g., Undo patterns, confirmation patterns, loading/error states).
- Prefer reusing existing components/styles over creating near-duplicates.
- When making UI changes, ensure they align with `ui-ux-guidelines.md`.
- When introducing import/export or other file formats:
  - Version the format and keep filenames/headers stable.
  - Define deterministic merge/replace rules.
  - Provide the same flows and safeguards everywhere (preflight summary, progress, actionable errors).

## Testing & quality bar
- Always keep the 4-step wizard flow working end-to-end.
- Add targeted tests when you introduce non-trivial pure logic (filters/scoring/polling/backoff).
- Do not introduce new flows beyond the PRD without proposing a doc change.

## Atomic files (hard guideline)
- Keep files small and focused: do not exceed **180 lines of code** per file.
- If a file approaches the limit, split it (extract subcomponents, hooks, services, or pure helpers).
- Prefer pure logic in `apps/web/src/services` with unit tests; keep UI components lean.

## Code reuse (hard guideline)
- **Preferences UI**: The `PreferencesStepContent` component (`apps/web/src/components/steps/preferences/`) is the single source of truth for preference management UI. Any context needing preferences (wizard, guest session, etc.) must reuse this component - do not duplicate preferences logic.
- **Session components**: Components in `apps/web/src/components/session/` are designed for both host and guest flows. Extract shared subcomponents to `createSessionDialog/` or similar subfolders.
- **Hooks**: Prefer existing hooks in `apps/web/src/hooks/wizard/` for state management (usePreferencesState, useGamesState, etc.) rather than creating parallel state logic.
- Before creating a new component, search for existing ones that can be extended or composed.


## Conventions for changes
- Prefer updating the canonical docs under `Requirements/`.
- When adding any implementation later, keep it aligned with the wizard-first UX and local-first constraints described above (don't invent new flows not present in the PRD).
- If something is unclear, propose a minimal clarification in the Requirements docs rather than guessing.
- Always use Requirements as the source of scope and constraints.
- Always assure proper testing is in place

## Conventions for changes
- Make sure to update README.md with any new setup or usage instructions.
