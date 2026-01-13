# PIKME UI/UX Guidelines (Consistency First)

Status: Draft (2026-01-13)

These guidelines define visual and interaction consistency rules for the PIKME wizard (Players → Filters → Preferences → Result). They are intentionally prescriptive so implementation can be consistent across the app.

## 1) Design principles
- Consistency beats novelty: same components and interaction rules across steps.
- Desktop-first ergonomics: primary target is desktop use; mobile remains supported.
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

## 7) Result (Winning game) presentation
- The winning game should be presented as a strong hero tile:
  - Game image is visible within the tile.
  - Add a subtle “liquid/material” overlay (e.g., gradient or glass effect) to improve readability of text on top of imagery.
  - Maintain consistent tile shape (rectangular, subtle rounding).

## 8) Non-functional UI requirements
- Touch targets >= 44px for key actions.
- Action icons must never be covered by neighboring tiles.
- Loading states are required for operations taking >300ms.
- Error messages must be actionable.

## 9) Implementation notes (guidance)
- Prefer implementing these via MUI theme overrides (ToggleButton, Tabs, Select, Paper/Card) and shared small components (e.g., SelectablePanel, GameTileActionBar).
- Avoid one-off styles per step; changes should apply globally where possible.

## 10) Related requirements
- Requirements/REQ-030 UI UX Improvements & Game Tile Consistency.md
- Requirements/REQ-040 CSV Import & Export (Backup Restore).md
