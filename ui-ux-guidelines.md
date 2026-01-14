# PIKME UI/UX Guidelines (Consistency First)

Status: Draft (2026-01-13)

These guidelines define visual and interaction consistency rules for the PIKME wizard (Players → Filters → Preferences → Result). They are intentionally prescriptive so implementation can be consistent across the app.

## 1) Design principles
- Consistency beats novelty: same components and interaction rules across steps.
- Desktop-first ergonomics with mobile-first clarity: primary target is desktop use; mobile remains fully supported and must be understandable without extra text.
- Fast scanning: emphasize selected states and primary actions.
- Safe actions: destructive/overwriting actions must be clearly labeled and confirmable.

## 2) Color and state semantics
PIKME uses a blue base with a warm yellow/sand accent.

### 2.1 State colors (semantic)
- **Selected / active**: warm yellow accent (high visibility)
- **Unselected but selectable**: muted blue
- **Disabled**: neutral gray
- **Destructive**: red

### 2.2 Contrast
- Text on colored backgrounds must meet WCAG AA (4.5:1 for normal text).

## 3) Component consistency rules

### 3.1 Toggle choices (e.g., “BGG User” vs “Local Player”)
- Selected toggle must be visually obvious:
  - Background: yellow accent
  - Text: dark/high-contrast
  - Border/outline: stronger than unselected
- Unselected toggles use muted blue styling.

### 3.2 Dropdowns (Select)
- Dropdown controls must be clearly visible and readable:
  - Outline/border must be pronounced (not blending into background)
  - Dropdown arrow icon must be visible
  - Focus ring must be obvious

### 3.3 Panels and selectable lists
- Panels that act like selectable items must follow consistent rules:
  - Unselected: muted blue background/border
  - Selected: yellow accent background/border
  - Hover: slight elevation/border intensification
- “Add games for local players” and similar panels must use the same selectable panel pattern.

### 3.4 Actions and links
- “Select all”, “Clear”, “Reset”, “Undo” must be visually distinguishable as actions:
  - Use buttons (text buttons are OK) with consistent placement
  - Never look like plain static text
- Close/X, delete/trash, and “remove” icons must use a relaxing red (error palette) to distinguish destructive/exit actions from blue positive actions (add/edit/create) while keeping contrast.

### 3.5 Tile density toggle (Standard vs Simplified)
Some steps need a compact, fast-scanning list. Provide a consistent, global toggle where game lists are shown.

Rules:
- Provide a single “Layout” toggle button (icon-only on narrow widths) that switches between:
  - **Standard tiles**: current rich rectangular tile/card.
  - **Simplified tiles**: compact row/list style similar to the collection list.
- The toggle must be consistent across steps where it appears (icon, tooltip/label, placement).
- Persist the last chosen layout locally (per device/browser) so users don’t need to re-toggle each time.
- Simplified tiles must never hide key actions (exclude/edit/dislike) and must keep hit targets >= 44px.

### 3.6 Stat / metadata pills (players, time, rating, weight)
- Use the warm yellow/sand accent as the pill background with dark/navy text and icons for readability.
- Prefer filled chips (no gray outline); keep height consistent and compact.
- Apply the same style across all surfaces that show these stats (rich tiles, rows/compact lists, details dialogs) to avoid mixed gray/yellow treatments.

## 4) Layout and density (desktop-first)

### 4.1 Reduce wasted space
- Main step content should use a larger max width on desktop.
- Avoid large empty margins; use consistent content widths across steps.

### 4.2 Wizard progress clarity
- The stepper (Players → Filters → Preferences → Result) must be clearly visible and feel “flowing”.
- Under the step labels, show small indicators that help the user understand progress (examples):
  - Players: number of users
  - Filters: number of eligible games
  - Preferences: number of ranked/top picks (active user)
  - Result: top pick ready / alternatives count

### 4.3 Responsive simplification (narrow widths)
On narrow widths (portrait phones), prefer removing redundant explanatory text and compressing navigation.

Rules:
- Stepper may switch to a compact mode:
  - Show current step name only (e.g., “Players”) and a small circular badge indicating eligible game count.
  - Preserve Back/Next behavior; avoid layout shifts when changing steps.
- Remove/condense long helper paragraphs in step headers when the content is already obvious.
- Keep icons + short labels over long sentences.

## 5) Scrolling
- Scrollbars must be styled consistently across the app (where browser permits).
- Scrollable panels should look intentional (padding + consistent scrollbar styling).

## 6) Preferences step guidelines

### 6.1 User tabs visibility
- Active user tab must be clearly highlighted (yellow accent or strong underline).
- Inactive tabs must still be readable.

### 6.2 Internal panel shape consistency
- Internal panels should match the game tile shape language.
- If game tiles are rectangular with subtle rounding, internal panels must not be “extra rounded”.

### 6.3 Ranking placement
- Rank indicators (numbers) must appear on the **right** side of ranked items.
- Drag handles and key actions must be consistent in placement.

### 6.4 Preferences quick actions
If “quick actions” are present, they must not compete with primary preference interactions.

Rules:
- Prefer a single layout toggle (Standard/Simplified) over multiple one-off action buttons.
- Avoid placing secondary actions in a way that pushes primary drag/drop content below the fold on mobile.

## 7) Result (Winning game) presentation
- The winning game should be presented as a strong hero tile:
  - Game image is visible within the tile.
  - Add a subtle “liquid/material” overlay (e.g., gradient or glass effect) to improve readability of text on top of imagery.
  - Maintain consistent tile shape (rectangular, subtle rounding).

### 7.1 Promoting alternatives
Alternative results are exploratory; selecting one should feel safe and reversible.

Rules:
- Clicking a Top Alternative may promote it to “Tonight’s pick” in-place.
- The UI must clearly reflect the promoted state (hero tile updates, selection highlight).
- Any Save action must save the currently promoted “Tonight’s pick”.

## 8) Non-functional UI requirements
- Touch targets >= 44px for key actions.
- Action icons must never be covered by neighboring tiles.
- Loading states are required for operations taking >300ms.
- Error messages must be actionable.

## 9) Add new games entry (Players step)
Adding games manually should be discoverable but not visually noisy.

Rules:
- Provide an “Add New Games to Collection” action directly under the “Show games from collection” action.
- Style: same component style as “Show games from collection” (including an icon), but using the yellow/sand accent to differentiate.
- The “Add new games” panel must be hidden by default and only expand/open when the user clicks the action.
- When expanded, it must use the same selectable panel/card pattern (see 3.3), with clear cancel/close.

## 10) Implementation notes (guidance)
- Prefer implementing these via MUI theme overrides (ToggleButton, Tabs, Select, Paper/Card) and shared small components (e.g., SelectablePanel, GameTileActionBar).
- Avoid one-off styles per step; changes should apply globally where possible.

## 11) Small-screen copy rules (narrow widths)
When screen real estate is constrained, hide redundant “celebration” and explanatory copy.

Rules:
- Result step may hide large header/subheader copy (e.g., “Your recommendation is ready!”) on narrow widths.
- “What’s the vibe?” control must switch to icon-first presentation on narrow widths (icon + short label under it; no long phrases like “Work together”).

## 12) Help / walkthrough formatting
Help content must be skimmable and non-intimidating.

Rules:
- Avoid numbered lists for major sections; use clear headers.
- Prefer rendering each topic as a small dedicated tile/card with a header and short bullets.

## 13) Related requirements
- Requirements/REQ-030 UI UX Improvements & Game Tile Consistency.md
- Requirements/REQ-040 CSV Import & Export (Backup Restore).md
- Requirements/REQ-050 In-App Help Walkthrough Dialog.md
- Requirements/REQ-060 Usability Improvements & Responsive Enhancements.md
