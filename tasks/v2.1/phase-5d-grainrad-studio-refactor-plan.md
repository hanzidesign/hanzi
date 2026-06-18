# Phase 5D Grainrad Studio Refactor Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status:** Implemented and verified on 2026-06-18.

**Goal:** Rebuild only `/studio` to match Grainrad's editor architecture, UI layout, and compact effect-controller language while preserving Hanzi Studio's current character selector and current configured font stack.

**Architecture:** Replace the current Mantine AppShell/accordion workbench with a route-local, terminal-like Studio shell modeled on Grainrad: fixed desktop sidebars, full-height center preview, compact collapsible sections, mobile bottom tabs, and a mobile settings bottom sheet. Keep light mode as the default, but support both light and dark `/studio` themes through the same controller primitives. Keep the active rendering target ASCII-only: selected Hanzi SVG -> true 3D/ASCII preview -> ASCII settings and export. Remove old non-ASCII visual effect UI and state instead of preserving backward compatibility.

**Tech Stack:** Next.js App Router, React, Mantine where it does not fight the target UI, CSS Modules, Zustand, Three.js, `@react-three/fiber`, Vitest.

---

## Reference Analysis

Reference inspected on 2026-06-18: https://grainrad.com/

Desktop structure:

- Root is a `100dvh` app, not a page with a marketing header.
- Layout is a horizontal editor: left sidebar `18rem`, center preview flexes, right sidebar `22rem`.
- Left sidebar contains brand, `Input`, `Effects`, `Presets`, and small footer links.
- Center preview is plain dark canvas space with top-right icon tools, top-center renderer status, centered empty/loading state, and bottom zoom/pan HUD.
- Right sidebar contains `Settings`, collapsed `Processing`, collapsed `Post-Processing`, and `Export`.
- Panels are dense and square: 1px borders, no cards, no rounded panel chrome, no decorative gradients.
- Section headers use explicit `+` / `-` disclosure symbols.
- Effect choices use `●` / `○` markers instead of card rows.
- Controls are compact rows: label, numeric value, range/select/input, optional reset.
- Export formats use a two-column bordered grid and one full-width export command.

Mobile structure:

- Root is `100dvh` flex column.
- Top header is short and only carries the brand.
- Center preview owns most vertical space.
- Active bottom content panel is capped around `40vh`.
- Bottom tab bar switches `Input`, `Effects`, `Presets`, and `Export`.
- Settings is a floating circular action button that opens a themed bottom sheet over an overlay.
- The settings sheet is capped around `85vh`, scrolls internally, and keeps section rows dense.

Visual tokens to mirror:

- Dark route background: near `#0a0a0a`.
- Dark panel background: near `#0f0f0f`.
- Dark border: near `#222`.
- Dark text tiers: dim `#555`, normal `#888`, bright `#ccc`.
- Light theme is the default and must keep the same layout and controller language, using quiet light neutrals rather than returning to the old colorful/light Mantine panel style.
- No Grainrad font import. Preserve this repo's current font setup from `theme/font.ts`.

Theme behavior:

- `/studio` defaults to light.
- `/studio` supports light and dark with route-local tokens, for example `data-studio-theme="dark"` and `data-studio-theme="light"`.
- Theme choice can persist in the new clean Studio store if it does not affect `/`.
- The top-right preview action cluster should include a compact theme toggle/control inspired by Grainrad's theme button, but it must switch between Hanzi Studio light/dark tokens.
- Effect controllers, export controls, tabs, disclosures, and mobile settings sheet must use the same component primitives in both themes.

## Scope Locks

- Only `/studio` is in scope. Do not redesign `/`.
- Keep the current character selector as the Studio input. Do not add Grainrad's file uploader as the primary input.
- Keep current Hanzi font configuration. Do not import or switch to Grainrad's IBM Plex Mono / JetBrains Mono stack.
- Default `/studio` to light locally, while supporting light/dark Studio theme tokens. Do not change global homepage color behavior unless the user separately asks.
- Remove old non-ASCII effect design, controls, and state from the active `/studio` surface. Do not keep compatibility paths for Morph Stack, Pattern Layers, Surface Shader Layers, Randomize, or legacy Phase 5B visual controls unless a piece is directly needed by ASCII.
- Keep ASCII-related renderer code and controls: `CharacterAsciiCanvas`, ASCII material/shader controls, mesh auto-rotation, camera/interaction, ASCII style, post/CRT finishing if panel-backed.
- Use existing dependencies. Do not introduce Tailwind just because Grainrad uses utility classes.
- Do not run Prettier. Use targeted formatting, tests, typecheck, build, lint, and `git diff --check`.

## Target `/studio` Information Architecture

Desktop:

- Left sidebar:
  - Brand row: `Hanzi Studio`.
  - `Input`: current `CharacterPanel` selector, rethemed to the Grainrad panel density.
  - `Effects`: ASCII is the only active effect row. Do not show fake non-ASCII effects as usable controls.
  - `Presets`: ASCII-only presets if they are real and wired; otherwise collapsed empty state.
- Center preview:
  - Full-height ASCII canvas stage.
  - Top-right compact icon buttons for light/dark theme, camera/interaction if retained, and fullscreen.
  - Top-center status such as `ASCII [WEBGL]` or actual renderer mode.
  - Center status only for empty/error/loading.
  - Bottom zoom/reset HUD matching Grainrad's `- 100% + | Reset 100%` layout.
- Right sidebar:
  - `Settings`: ASCII scale, spacing/density, output width if supported, charset/style, brightness/contrast, color/background, and intensity.
  - `Processing`: ASCII-related mesh/animation/pointer behavior only.
  - `Post-Processing`: ASCII-related CRT/bloom/scanline/grain/chromatic controls only.
  - `Export`: supported real exports only. Prefer PNG first; add text export only if the renderer can produce meaningful ASCII text.
  - Every effect/controller row must use the Grainrad-like controller shape: label, current value, compact control, optional reset, no expanded cards.

Mobile:

- Header: brand-only.
- Main preview: same canvas and HUD behavior.
- Bottom tabs: `Input`, `Effects`, `Presets`, `Export`.
- Active tab panel: max `40vh`, scrollable, section-styled.
- Floating settings button: opens bottom sheet for `Settings`, `Processing`, and `Post-Processing`.
- Settings sheet: overlay, rounded top only if needed for mobile parity, internal scroll, close affordance.

## State And Data Model Direction

- Create a clean Studio storage key for this Grainrad/ASCII direction, for example `hanzi-studio-grainrad-ascii-v1`.
- Keep persisted state compact:
  - `character`
  - `ascii`
  - `mesh` / interaction values used by `CharacterAsciiCanvas`
  - `rendererMode`
  - `view`: active mobile tab, expanded sections, zoom/pan, settings sheet open state, Studio theme, Studio background
  - `export`: selected format and quality flags if implemented
- Remove persisted non-ASCII state from the new active store shape:
  - `morphStack`
  - `surfaceShaders`
  - `shaderLayers`
  - `patternLayers`
  - `postFx` entries that are not ASCII finishing
  - `randomSeed`
  - old panel compatibility mapping
- Do not migrate old v2.1 state. This refactor intentionally starts clean.

## Component Refactor Direction

Primary files to replace or heavily rewrite:

- `components/studio/StudioShell.tsx`
- `components/studio/StudioShell.module.css`
- `components/studio/StudioControls.tsx`
- `components/studio/StudioControls.module.css`
- `components/studio/PanelPrimitives.tsx`
- `components/studio/StudioCanvas.tsx`
- `app/studio/studio-store.ts`
- Studio layout and panel contract tests under `components/studio/*contract.test.ts`
- Studio store tests under `app/studio/*test.ts`

Likely new files:

- `components/studio/TerminalSection.tsx`
- `components/studio/TerminalRows.tsx`
- `components/studio/StudioLeftPanel.tsx`
- `components/studio/StudioRightPanel.tsx`
- `components/studio/StudioMobileTabs.tsx`
- `components/studio/StudioSettingsSheet.tsx`
- `components/studio/StudioExportPanel.tsx`
- `components/studio/StudioThemeToggle.tsx`
- `components/studio/studio-terminal-layout-contract.test.ts`
- `components/studio/studio-terminal-controls-contract.test.ts`

Keep and adapt:

- `components/studio/CharacterPanel.tsx`
- `components/studio/CharacterAsciiCanvas.tsx`
- `components/studio/character-ascii-material.ts`
- ASCII panel logic that maps directly to the new Settings, Processing, or Post-Processing rows.

Delete or disconnect from active `/studio`:

- Old accordion ownership in `StudioControls`.
- Old Phase 5B effect panels that are not ASCII-related.
- Old light panel primitives.
- Tests that assert the Efecto/Mantine accordion structure after new Grainrad contracts replace them.

## Implementation Phases

### Phase 0: Approval Gate

- Review this plan with the user.
- Resolve open questions before implementation:
  - Which export formats are required for the first pass: PNG only, PNG plus text, or all currently possible formats?
  - Should the `Effects` panel display only active ASCII, or show Grainrad-like disabled future rows?
  - Should footer links exist in the left sidebar, and if so should they link to `/`, docs, or be omitted?

### Phase 1: Terminal Shell Contract

- Write failing structure tests for the new `/studio` shell:
  - desktop has left aside, center main, right aside, no Mantine AppShell header
  - mobile has header, main preview, bottom tabs, floating settings button
  - light is the default Studio theme and light/dark are both represented by route-local tokens
  - `/` files are not touched
- Rewrite `StudioShell.tsx` and `StudioShell.module.css`.
- Add route-local light and dark terminal tokens with light as default.
- Add a compact theme toggle/control in the preview action cluster.
- Verify focused layout test and `git diff --check`.
- Stop for review.

### Phase 2: Input And Navigation Panels

- Write failing tests that `Input` uses `CharacterPanel` and that the old `Selected Text`/Efecto headings are gone.
- Retheme `CharacterPanel` through terminal primitives while preserving country/year/TC-SC behavior.
- Replace accordion controls with `TerminalSection` disclosure behavior.
- Implement left desktop panels and mobile bottom tab panels.
- Verify focused panel tests and character selector store tests.
- Stop for review.

### Phase 3: ASCII Settings Mapping

- Write failing tests for the right sidebar Settings rows, effect-controller primitives, and their store mappings.
- Move ASCII controls into Grainrad-like row groups:
  - ASCII
  - Adjustments
  - Color
- Implement shared controller primitives for numeric rows, range rows, select rows, color rows, reset actions, and two-column option grids.
- Ensure all effect/controller UI supports both light and dark themes through the same primitives.
- Keep current fonts; use current type variables in terminal CSS.
- Remove or disconnect non-ASCII panel imports from `StudioControls`.
- Verify focused ASCII panel/material tests and TypeScript.
- Stop for review.

### Phase 4: Preview Stage And Mobile Settings Sheet

- Write failing tests for preview HUD/status/floating actions and mobile settings sheet state.
- Update `StudioCanvas` to match Grainrad's preview hierarchy:
  - themed preview root
  - top-center renderer status
  - top-right tools
  - center status only for loading/error
  - bottom zoom/reset HUD
- Implement settings FAB and bottom sheet on mobile.
- Verify focused layout tests and manual `/studio` desktop/mobile checklist.
- Stop for review.

### Phase 5: Store Simplification And Old Effect Removal

- Write failing store fixture tests for the new clean storage key and reduced persisted shape.
- Remove old non-ASCII state from active store and sanitizers.
- Delete or isolate old Phase 5B panel code that is no longer imported.
- Update tests so they assert active behavior, not old file presence.
- Verify focused store tests, full `pnpm test`, and `pnpm exec tsc --noEmit`.
- Stop for review.

### Phase 6: Export And Presets

- Write failing tests for supported export UI and command availability.
- Implement only real export formats:
  - PNG export from the rendered canvas first.
  - Text export only if ASCII text extraction is available or added in this phase.
- Add ASCII presets only if each preset maps to real ASCII state changes.
- Keep unsupported formats hidden or disabled with no fake success path.
- Verify export tests and manual export smoke.
- Stop for review.

### Phase 7: Cleanup And Final Verification

- Remove obsolete code paths and obsolete tests that only support old non-ASCII design.
- Confirm no old Mantine panel colors or shell styles remain in active `/studio` CSS.
- Confirm no Grainrad font imports were added.
- Confirm `/` still renders the existing homepage.
- Run final verification:
  - `pnpm test`
  - `pnpm exec tsc --noEmit`
  - `pnpm lint`
  - `pnpm build`
  - `git diff --check`
- Provide manual QA checklist for the user instead of auto-running visual browser QA unless requested.

## Acceptance Criteria

- `/studio` desktop layout visually follows Grainrad's editor architecture: left `18rem`, center preview, right `22rem`, full `100dvh`, terminal-style panels with light as default and dark support.
- `/studio` mobile layout follows Grainrad's architecture: brand header, preview, bottom tabs, floating settings button, settings bottom sheet.
- `/studio` effect/controller UI follows Grainrad's compact row, disclosure, range, select, and option-grid design language.
- Current character selector remains the input mechanism.
- Current configured fonts remain in use.
- `/` homepage is unchanged.
- Old non-ASCII effect panels are not visible in active `/studio`.
- ASCII renderer still displays the selected character and responds to ASCII settings.
- Light mode is the default for `/studio`, and dark mode is supported without changing `/`.
- No compatibility migration for old v2.1 persisted state is required.

## Manual QA Checklist For User

After implementation phases are approved and completed, ask the user to open `/studio` and verify:

- Desktop: left input/effects/presets, center preview, right settings/export match the Grainrad structure.
- Desktop: no old light Mantine header or accordion shell remains.
- Desktop: changing country/year in Input updates the ASCII character.
- Desktop: ASCII Settings rows visibly affect the renderer.
- Desktop: light/dark Studio theme toggle switches controller surfaces without changing the homepage.
- Desktop: old non-ASCII Morph/Pattern/Shader Layer controls are gone.
- Mobile: bottom tabs switch Input/Effects/Presets/Export.
- Mobile: settings floating button opens a bottom sheet.
- Mobile: no overlapping text or controls at 390px width.
- Homepage `/` still looks like the existing homepage.

## Implementation Review - 2026-06-18

- Implemented route-local `/studio` terminal shell with desktop left `18rem`, center preview, right `22rem`, and `100dvh` layout.
- Kept the existing `CharacterPanel` as Input and rethemed it to the compact terminal UI.
- Added light/dark Studio theme tokens with light as default and a preview action theme toggle.
- Added shared `TerminalSection` and `TerminalRows` primitives for compact disclosures, ranges, selects, colors, toggles, and option grids.
- Rebuilt active panels as ASCII-only: `StudioLeftPanel`, `StudioRightPanel`, `StudioMobileTabs`, `StudioSettingsSheet`, `StudioExportPanel`, and `StudioThemeToggle`.
- Added Grainrad-like mobile bottom tabs and settings bottom sheet.
- Simplified active persistence under `hanzi-studio-grainrad-ascii-v1` to character, ASCII, mesh, renderer, view, and export state.
- Updated ASCII shader controls for brightness, saturation, hue rotation, sharpness, gamma, foreground/background color, and color intensity.
- Fixed the WebGL canvas to fill the preview stage and preserve its drawing buffer for PNG export.
- Live Grainrad comparison confirmed the reference structure and operation model: left 288px sidebar, center preview, right 352px sidebar, compact sections/rows, bottom mobile tabs, and settings sheet.
- Local browser verification passed at desktop and 390px mobile: canvas filled preview, theme toggle worked, presets expanded/applied, charset select changed to `matrix`, export panel was visible, mobile tabs worked, and settings sheet opened.
- Automated verification passed: Phase 5D focused tests, full `pnpm test` (40 files / 165 tests), `pnpm exec tsc --noEmit`, and `pnpm run build`.
