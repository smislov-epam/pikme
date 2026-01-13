# Agent instructions (pikme)

## Project snapshot
- This repo currently contains product/design documentation for a **local-first Board Game Night Game Selector called PIKME**.
- Implementation code lives in `apps/web`; treat the docs in `Requirements/` as the source of truth.

## Source-of-truth docs (start here)
- Product scope + UX flow: `Requirements/Product Requirements.md`
  - 4-step wizard: **Players → Filters → Preferences → Result**
  - Sticky bottom CTA, mobile-first layout, per-user tabs, drag/drop preferences, local "Save game night".
- Architecture expectations: `Requirements/Solution Architecture Guidelines.md`
  - Target stack called out in-doc: React 19 + MUI + Dexie + `fast-xml-parser` + `dnd-kit`.
  - Key constraints: BGG 202 polling, local-first persistence, possible BGG CORS limitations.

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


## Conventions for changes
- Prefer updating the canonical docs under `Requirements/` (the root `Product Requirements.md` is a pointer).
- When adding any implementation later, keep it aligned with the wizard-first UX and local-first constraints described above (don't invent new flows not present in the PRD).
- If something is unclear, reference the specific section in the PRD/architecture doc and propose a minimal clarification rather than guessing.
- ALWAYS refer to Requirements for scope
- ALWAYS refer to Solution Architecture Guidelines for technical approach
- Always assure proper testing is in place

## Conventions for changes
- Make sure to update README.md with any new setup or usage instructions.
