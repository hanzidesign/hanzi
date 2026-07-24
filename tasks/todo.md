# Hanzi Studio Current Task State

Active implementation package: `tasks/v2.1/phase-5d-studio-effects-refactor-plan.md`.
Direct development branch for v2.1 architecture: `v2.1`.
Current status: Phase 5M now has all 15 Effects implemented as independent renderers with effect-specific reference editor Settings and rendering logic. The shared Character Model panel is implemented below Character, no Effect falls through ASCII or remains marked unimplemented, and scope stays route-local to `/studio`; homepage `/` is not redesigned. Preserve the current character selector and 3D motion panel as Input, and use `data/Generated image 1.png` as the authoritative UI-layout reference.

Keep this file as current-state tracking only. Historical phase logs belong in the superseded task docs or git history, not here.

## Pixel Sort GPU Preview And Direction Expansion - 2026-07-20

User contract:

- Remove CPU Worker sorting, GPU readback, and replacement texture upload from interactive Pixel Sort preview while preserving exact CPU sorting for export.
- Add effect-local Direction values: Horizontal, Vertical, 45°, -45°, and Radial. Horizontal remains the default.
- Keep Model, 3D Motion, Processing/Post, theme persistence/reset, export sizing, and every non-Pixel-Sort renderer unchanged.

Plan:

- [x] Replace per-preview-frame CPU sorting with a bounded GPU presentation approximation and demand-driven source rendering.
- [x] Extend schema, settings, runtime packing, exact CPU line traversal, persistence, and reset contracts to all five directions.
- [x] Serialize exact export generations and acknowledge only the current exact result after presentation.
- [x] Complete full tests, TypeScript, ESLint, production build, production-browser verification, diff hygiene, and final review.

Review:

- Interactive preview now samples the source render target directly in a bounded GPU pass. Production-browser instrumentation confirmed `0` Worker constructions and `0` GPU readbacks while previewing.
- Exact PNG export remains Worker-backed and generation-guarded. Production-browser instrumentation confirmed `1` Worker construction and `1` GPU readback, followed by a successful 2048×2048 download acknowledgement.
- Direction presents exactly Horizontal, Vertical, 45°, -45°, and Radial. Production screenshots for 45°, -45°, and Radial produced distinct image hashes with no console or page errors.
- Shadow visibility correction maps preview colors across directional streak position instead of the mostly bright source luminance. Browser color-swap verification changed `38.8%` of foreground pixels, confirming Shadow now has a material visual contribution.
- Final review caught and closed React Strict Mode coordinator disposal and stale pending-ack races; all invalidation paths now clear both the pending acknowledgement and last requested generation without permanently disabling the coordinator.
- Verification passed: full Vitest (`115` files / `746` tests), TypeScript, full ESLint, production build, production Playwright smoke, and `git diff --check`.

## Export Tooltip UX Correction - 2026-07-14

Plan:

- [x] Replace the disabled export format's native browser tooltip with Mantine `Tooltip`.
- [x] Preserve the hoverable wrapper required by disabled buttons and keep unavailable reasons accessible.
- [x] Run the focused contract test, TypeScript, ESLint, and diff hygiene; document the result.

Review:

- Export format restrictions now use Mantine `Tooltip` with an arrow and a short open delay instead of the browser-native `title` popup.
- The wrapper remains hoverable when its button is disabled, and the unavailable reason remains the button's accessible label.
- Verification passed: focused Vitest (`5` tests), TypeScript, focused ESLint, and `git diff --check`.

## Crosshatch Line-Only Correction - 2026-07-14

User contract:

- Crosshatch must not render a solid model-color fill over the selected Character.
- Dark Character regions must remain visibly crosshatched; the darkest source tone cannot collapse into a flat Line Color silhouette.
- Hatch lines may extend outside the Character and across the Background field; do not clip the pattern to the model mask.
- Background hatch lines have a subtle time-driven phase drift while Character hatch lines remain stable; the motion follows shared 3D Motion play/speed/time so it can pause and export consistently.
- Crosshatch rendering logic must remain effect-local. Updates to another Effect must not alter its source, shader, controls, or renderer route through shared implementation leakage.
- Crosshatch Line Width stores/uploads `0.01..0.5` with default `0.08`, while the UI multiplies by `100` and presents `1..50` with default `8`.
- Crosshatch Adjustments Brightness UI defaults to Dark `4` and Light `-15`. Canonical state/runtime defaults remain Dark `-4` and Light `-15`.
- Preserve source-luminance/hatch-density rendering. Dark reverses the UI sign (`99 → -99`, `-99 → 99`); Light uses the canonical sign (`99 → 99`, `-99 → -99`) because its black-on-white palette has the opposite polarity. In both themes, raising the displayed value makes hatch lines lighter.
- Brightness must affect the background hatch in both slider directions; darkening may reduce its density, but the field must never collapse to a solid Background color.
- Every control for all 15 Effects, including Settings, Processing, and Post-Processing, is stored independently for Light and Dark themes. Theme switching replaces the complete active control set; edit and Reset affect only the active theme.
- Preserve Crosshatch controls, shared Model/3D Motion, Processing/Post, export, and every other Effect.

Plan:

- [x] RED: reproduce the solid-fill failure in the CPU oracle and shader contract with a focused regression.
- [x] Audit renderer/store/export imports and recent history for cross-effect coupling; add an isolation contract at the real boundary.
- [x] Remove the darkest-tone solid-fill path while preserving tone-mapped hatch layers and Line Color/Background roles.
- [x] Preserve the unmasked tonal hatch field while removing only the solid model-fill path.
- [x] Add subtle background-only hatch phase motion without masking, recoloring, or moving the Character hatch.
- [x] Restore canonical Brightness to source luminance/hatch density and remove the incorrect final-color adjustment.
- [x] Add a theme-aware UI display scale: Light `1`, Dark `-1`, with ordered bounds and a positive step.
- [x] Make the nonzero background hatch floor respond to canonical Brightness instead of masking the darkening half of the range.
- [x] Verify displayed defaults Dark `4` / Light `-15` and both displayed slider directions in the actual preview.
- [x] Align Line Width schema, scaled UI presentation, CPU validation, runtime/store sanitization, and tests to stored `0.01..0.5` / displayed `1..50`.
- [x] Align Crosshatch Brightness schema/oracle/material/runtime/reset to Dark `-4` and Light `-15`, and migrate only the old persisted default.
- [x] Generalize theme state from color-only buckets to complete per-theme Effect control sets, preserving the current theme's legacy values and initializing the other theme from its own defaults.
- [x] Verify CPU/material/color-role suites, TypeScript, ESLint, build, and diff hygiene.
- [x] Review the final output contract and document root cause and evidence here.

Review result:

- Root cause: a broad multi-effect color-role correction inverted the Crosshatch source polarity while the shader still promoted the darkest tone to a solid fill. Removing only that solid fill restores visible hatch lines while intentionally preserving lines outside the Character.
- Brightness keeps the original source-luminance/hatch-density behavior. Generic range presentation uses Light scale `1` and Dark scale `-1`; displayed defaults are Light `-15` and Dark `4`, with no persistence rewrite required.
- The background phase advances by `.08` hatch cells per shared animation second and is blended only over raw white source pixels. Character hatch remains stable; shared 3D Motion Speed/play/time pauses and exports the motion through the existing timeline.
- Crosshatch stays on its dedicated canvas/material route. A routing contract now verifies every dedicated Effect renderer imports only its own material, and store tests prove edits/resets in another Effect cannot mutate Crosshatch.
- All Settings, Processing, and Post-Processing controls for all 15 Effects now have complete independent Light and Dark buckets. Theme switching swaps the complete control set; edits and Reset affect only the active theme. Shared Model and 3D Motion remain shared.
- Crosshatch Line Width is stored as `0.01..0.5`, displayed as `1..50`, and defaults to stored `0.08` / displayed `8`. Brightness defaults to Dark `-4` and Light `-15`.
- Production browser verification confirmed Dark default `4`, Light default `-15`, bounds `-100..100`, step `1`, and no console/page errors. Background hatch remained non-solid at both extremes. Dark Background average luminance rose `3.01 → 7.64 → 72.17` for displayed `-99 / 0 / 99`; Light rose `185.46 → 253.38 → 254.78`, confirming higher displayed values make lines lighter in both themes while the hatch remains source-driven.
- Verification passed: full Vitest `105` files / `658` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.

## Pixel Sort Website-Parity Correction - 2026-07-14

User contract:

- Supersede both the current implementation and the proposed patch to its source mask/span logic.
- Pixel Sort requires an independent effect renderer and independent render pipeline; the current shared effect-render framework cannot produce the target behavior.
- Treat the pipeline as two explicit stages: render the complete 3D Hanzi scene to a 2D frame, then pass that frame to a separate 2D Pixel Sort renderer. Pixel Sort must not run as a mesh/material effect inside the 3D stage.
- Match the website reference's Pixel Sort identity: coherent directional scanline runs, threshold-gated streak construction, and visibly reordered/displaced source pixels rather than repeated 3D slabs.
- The supplied 2D target locks long horizontal grayscale streaks, black threshold gaps, hard scanline-local starts/ends, and independently sorted rows as the primary visual signature.
- Keep the selected Hanzi as the local input and preserve the existing user-facing Pixel Sort controls unless the new renderer requires an explicitly documented contract correction.
- Every visible controller must affect the correct stage: Model/3D Motion change the captured source frame; Pixel Sort settings change the independent 2D sorter; Processing/Post change the completed sorted frame exactly once.
- Preserve shared Model, 3D Motion, export, and non-Pixel-Sort effects through adapters at the renderer boundary; do not force Pixel Sort back through an incompatible generic effect pipeline.

Plan (approved and completed):

- [x] Specify an independent Pixel Sort renderer: source capture, occupancy/luminance buffers, scanline-run construction, output composition, animation, resize, disposal, and export adapter.
- [x] Build deterministic CPU and routing regressions that distinguish coherent directional scanline sorting from duplicated extruded silhouettes.
- [x] Replace the current Pixel Sort canvas/material/oracle with the independent renderer without changing other effect renderers.
- [x] Verify controls, Model/3D Motion integration, Processing/Post ownership, hidden-square export, focused/full tests, TypeScript, ESLint, production build, diff hygiene, and `/studio` visual output.
- [x] Review visual parity against the supplied reference and document the root cause and final evidence here.

Review result:

- Root cause: the former Pixel Sort path was a 3D/fullscreen shader approximation that sampled a limited span independently for each fragment. It could duplicate displaced model silhouettes, but it could not perform a coherent one-to-one permutation of complete 2D scanline runs.
- Pixel Sort now owns a two-stage renderer: a complete lit 3D Hanzi scene is captured into RGBA, then a dedicated Worker performs exact threshold-gated 2D scanline sorting before a minimal presentation pass. The old Pixel Sort effect material was removed.
- The CPU renderer preserves RGBA pixel provenance, constructs deterministic horizontal/vertical/diagonal runs, honors all nine Pixel Sort controls, and runs outside the main UI thread. Preview work is resolution/rate bounded; export uses the requested exact dimensions and acknowledges only after the sorted texture is presented.
- Model and 3D Motion feed the source capture. Pixel Sort Settings feed the Worker. Shared Processing/Post remains outside the dedicated renderer and is applied once to the finished sorted frame.
- Browser verification on `/studio` confirmed a visible horizontal 2D streak result on black, no runtime exceptions, and a visibly different output after toggling Reverse. A texture-resize defect found during QA was fixed by replacing the `DataTexture` when dimensions change instead of mutating a previously uploaded 1x1 texture.
- Verification passed: full Vitest `105` files / `654` tests, TypeScript, full ESLint, production build, and `git diff --check`. The existing environment warning remains Node 24.18.0 while the repository requests Node 22.x.

## Pixel Sort Color Variation Proposal - 2026-07-14

Design contract for approval before implementation:

- Keep `Original` as the default so the accepted monochrome Pixel Sort result and exact source-pixel permutation do not change.
- Add color as an effect-local stage inside the dedicated Pixel Sort Worker; do not route Pixel Sort back through the generic effect material framework.
- Prefer a compact palette system over independent RGB correction sliders: `Color Mode`, `Palette`, `Mapping`, `Mix`, and conditional custom palette colors.
- Proposed modes:
  - `Original`: untouched sorted RGBA.
  - `Palette`: recolor from a three-stop palette while retaining source luminance and black threshold gaps.
- Proposed mappings:
  - `Tone`: palette position from sorted pixel luminance; stable posterized/duotone character.
  - `Streak`: palette position from the pixel's normalized position inside its sorted run; makes every streak visibly directional.
  - `Scanline`: palette position from scanline index plus deterministic per-line phase; creates horizontal/vertical color bands without temporal noise.
- Proposed presets: `Thermal` (violet/magenta/amber), `Signal` (cyan/blue/violet), `Acid` (lime/yellow/red), and `Custom` (three theme-scoped color pickers).
- Interpolate the three-stop palette in OKLCH using the shorter hue path, then gamut-map to sRGB for the Worker output; this avoids muddy gray midpoints while preserving intentional luminance structure.
- Apply `Mix` after palette mapping and before existing Brightness/Contrast. Processing/Post remains outside and still executes exactly once.

Implementation plan (awaiting approval):

- [ ] Lock schema/defaults/conditional controls and theme-scoped preset/custom-color behavior with focused tests.
- [ ] Extend Worker settings and scanline metadata without changing `Original` output bytes.
- [ ] Implement Tone, Streak, and Scanline mapping plus OKLCH interpolation/gamut mapping.
- [ ] Prove black gaps remain untouched, mappings are deterministic, every new controller is observable, and Original preserves the current provenance invariant.
- [ ] Verify focused/full tests, TypeScript, ESLint, build, diff hygiene, export, and browser screenshots for all mappings.

## Settings Static Arrow Cleanup - 2026-07-14

Plan:

- [x] Lock the Settings group-title contract: static headings must not show a disclosure arrow.
- [x] Remove only the non-interactive arrow markup and its unused styling.
- [x] Run the focused regression test, TypeScript, and diff hygiene; review the final scope.

Review:

- Removed the static `⌄` from Settings group headings; real dropdown controls retain their interactive open/close indicator.
- Removed the now-unused group-chevron styling and added a focused affordance regression.
- Verification passed: focused Vitest (`1` test), TypeScript, focused ESLint, and `git diff --check`.

## Character Popover Bottom Scroll Fix - 2026-07-14

User contract:

- When a Character list contains more options than the popover can display, every Character row, including the final row, must scroll fully into view.
- Use one shared vertical scroll area for both Country and Year/Character content; do not create independent column scrollbars.
- Keep the `Country` and `Year` headings fixed at the top of the popover while the two content columns scroll together.
- Keep the portal-backed Character selector, its current content, and its viewport-contained behavior.

Plan:

- [x] Reproduce the clipping from the current popover/list height contracts and lock it with a focused regression assertion.
- [x] Restructure the popover into a fixed two-column header and one shared two-column scrollport that consumes the remaining height.
- [x] Verify the focused contract test, TypeScript, ESLint, and `git diff --check` without disturbing the existing working-tree changes.
- [x] Review the final diff for the smallest layout-only fix and document the result here.

Review:

- Root cause: each column owned a 552px scrollport while the padded popover exposed at most 494px for list content, so the popover's `overflow: hidden` clipped the bottom of both independent scrollports.
- The popover now has a fixed header row containing `Country`, `Year`, and TC/SC, plus one shared two-column scroll row. Only the shared row scrolls, and every final Character option can enter its visible area completely.
- Verification passed: focused Character layout/control tests (`2` files / `6` tests), TypeScript, ESLint, and `git diff --check`. Node reports the existing version warning (`24.18.0`; repository requests `22.x`).
- Follow-up: moved the shared scrollbar flush to the popover's right border while preserving 10px content spacing inside the fixed header and scrollport.
- Follow-up: reduced the shared popover scrollbar to the user-selected 3px in WebKit browsers while retaining the thin Firefox scrollbar.
- Correction: scoped Firefox's `scrollbar-width: thin` fallback behind `@supports not selector(::-webkit-scrollbar)` because modern Chromium otherwise overrides the exact 3px WebKit scrollbar width.
- Screenshot correction: moved `scrollbar-color` into the same Firefox-only fallback so Chromium no longer retains the wide standard scrollbar instead of the requested 3px WebKit scrollbar.
- Final scrollbar width selection: 4px after confirming the WebKit styling is active.
- Final interaction correction: use a 3px scrollbar, keep its thumb transparent until the shared list is hovered, and show the fully opaque thumb only while hovering the thumb itself; Firefox receives the closest standard-property fallback.
- Screenshot correction: derive the hover thumb from `--studio-text-bright` at 55%/85% instead of the dim border token, and use `background-color`, so the 3px thumb is visibly revealed on the dark Studio background.
- Interaction correction: replace the CSS-only list hover trigger with explicit pointer enter/leave state on the shared scroll region; the data state reveals the thumb, leaving hides it, and thumb hover retains the higher-opacity state.
- Motion follow-up: animate the 3px thumb opacity over 160ms for list enter/leave and thumb hover; add a matching `scrollbar-color` transition to the Firefox fallback.
- Screenshot correction: WebKit ignored thumb `opacity` and left its solid background visible. Animate `background-color` from transparent to 55%/85% over 160ms instead, preserving the explicit list enter/leave state.
- Character trigger follow-up: replace collapsed/expanded `v` / `^` with `+` / `−` to match the Studio disclosure convention.

## Studio Panel And Theme UX Follow-up - 2026-07-14

User contract:

- Add a right-aligned `reset` action to both `Model` and `3D Motion`; each action resets every control in its own group and must not reset the other group.
- Render the Character dropdown list in a portal-backed popover so opening it never creates horizontal overflow in the left panel.
- Use `+` for collapsed Studio sections and `−` for expanded sections.
- Store every Effect control separately for light and dark Studio themes. Clicking the Theme toggle must immediately switch the complete active Effect control set to the selected theme's saved values.
- Inventory every color setting across all 15 Effects. Every color picker plus Dithering Custom Palette and Voronoi Edge Color must define both a light default and a dark default.
- Keep `/studio` fixed to the viewport with no document-level vertical scroll or trailing blank area. Desktop/mobile panels may retain their own intended internal scrolling.
- Keep the existing Studio visual language, effect renderers, panel widths, and route-local scope.

Implementation plan — completed:

- [x] RED: add contract/store tests for group-local reset-all, portal Character popover, `+` / `−` section symbols, route-local fixed viewport layout, and theme-scoped complete Effect controls.
- [x] Add compact label rows for `Model` and `3D Motion`, each with the existing terminal-style `reset` action aligned at the right.
  - `Model reset` restores Extrude, Thickness, Bevel, Twist, Taper, and Bend only.
  - `3D Motion reset` restores X/Y/Z rotation and Speed only.
  - Keep per-row reset behavior unchanged and prove the two reset-all actions do not cross-reset.
- [x] Move the Character selector list through a React portal popover anchored to the existing trigger.
  - Preserve Country, Year, TC/SC, active states, outside-click close, Escape close, and selection close.
  - Position/flip within the viewport and remove the wide absolute child from the left panel scroll container.
  - Do not introduce a second visual system or change the Character selector content.
- [x] Replace Studio accordion glyphs with the explicit state mapping: collapsed `+`, expanded `−`; update the matching source-contract tests.
- [x] Add theme-scoped complete Effect control state for Settings, Processing, and Post-Processing.
  - Preserve `studioEffect.controls` as the active resolved controls used by all existing renderers.
  - Add persisted, sanitized light/dark color buckets containing every theme-sensitive color value.
  - Give each schema color control explicit light and dark defaults; light defaults must retain readable dark-on-light contrast and dark defaults readable light-on-dark contrast while preserving effect-specific color intent.
  - Cover every color picker plus Dithering Custom Palette and Voronoi Edge Color; do not special-case only ASCII Foreground and Background.
  - Editing a color updates only the active theme bucket and the active resolved controls.
  - Toggle to `light`: immediately replace every active effect color with its saved light color set.
  - Toggle to `dark`: immediately replace every active effect color with its saved dark color set.
  - Theme switching must update the complete Settings, Processing, Post-Processing, and Canvas state in the same transition; shared Model and 3D Motion remain effect-independent.
  - Reset Settings restores the selected Effect only for the active theme and leaves the other theme's custom controls intact.
  - Keep ASCII `foregroundColor` / `backgroundColor` synchronized with its active resolved reference editor controls on edit, reset, migration, and theme switch.
  - Make the preview fallback background theme-aware for effects without an explicit Background color control.
- [x] Bump persisted Studio state version and implement a sequential migration.
  - Preserve the existing ASCII `original` to `mono` migration.
  - Treat the user's existing persisted colors as the current persisted theme's values; initialize the other theme from schema defaults.
  - Reject invalid values, unknown Effects, and unknown control ids from persisted theme buckets.
- [x] Lock `/studio` to the viewport with route-local fixed positioning (`inset: 0`) instead of changing global `body` behavior; preserve internal desktop/mobile panel scrolling.
- [x] GREEN: run focused Studio contract/store/runtime tests, then `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, and `git diff --check`.
- [x] Elegance review: confirm theme color synchronization is centralized in store helpers/actions, no renderer receives theme-specific branching, and no duplicated reset logic can drift.
- [x] Provide a manual `/studio` browser checklist and wait for the user's report instead of running automated visual browser QA.

Review — implementation complete:

- Added independent persisted light/dark sets for every control across all 15 Effects, including Settings, Processing, and Post-Processing. Theme toggle atomically replaces the complete active Effect control set while shared Model and 3D Motion remain independent.
- Version 3 persistence migrates legacy colors into the theme active at save time and initializes the other theme from its explicit schema defaults. Invalid and unknown persisted color values do not enter active controls.
- Added group-local Model and 3D Motion reset-all actions, a portal-backed Character popover, `+` / `−` section glyphs, theme-aware Canvas fallback, and a route-local fixed Studio viewport.
- Verification passed after the final exhaustive color-set regression: 89 test files / 588 tests, TypeScript, ESLint, production build, and diff hygiene.
- Manual `/studio` visual verification remains for the user: check all Effect colors across both themes, theme round-trip restoration, Character popover overflow, both reset-all actions, section glyphs, and absence of page-level y-scroll.

## Phase 5M Studio Effect Architecture Correction - 2026-07-13

### Shared Model Panel addition - 2026-07-13

User contract:

- Add a dedicated `Model` panel directly below `Character` in Input.
- SVG Extrude is the baseline model operation.
- Add explicit model-deformation controllers; do not mix geometry controls into `3D Motion`.
- Every 3D Character effect renderer must consume the same model geometry state.

Implementation plan:

- [x] RED→GREEN: extend the public Character geometry helper with Extrude, Thickness, Bevel, Twist, Taper, and Bend behavior.
- [x] RED→GREEN: persist and sanitize the new model params with effect-independent reset behavior.
- [x] Add a compact `Model` panel below Character; move Depth out of `3D Motion` and expose geometry controls with per-row reset.
- [x] Route the shared geometry params into ASCII, Dithering, and every newly implemented renderer.
- [x] Verify visible geometry changes in browser and preserve the generated-image three-column proportions.
- [x] Run focused/full tests, TypeScript, ESLint, build, and diff hygiene; record review evidence.

### Halftone vertical slice

- [x] Verify the live reference editor Halftone UI and current public bundle schema/runtime equations.
- [x] Correct Halftone defaults, ranges, options, conditional colors, and renderer discriminator with RED→GREEN schema tests.
- [x] Add the deterministic Halftone CPU oracle one behavior at a time.
- [x] Add the independent Halftone shader material and shared Processing/Post stages.
- [x] Add `CharacterHalftoneCanvas` using the shared 3D Character Model source.
- [x] Prove selected-only reset, persistence, sanitization, and cross-effect isolation.
- [x] Browser-test Halftone output and dynamic controls; verify every visible setting through CPU/material value mappings and inspect console/WebGL errors.
- [x] Run full verification and record the remaining 12-effect queue.

Review result:

- `Model` now sits directly below Character and owns Extrude, Thickness, Bevel, Twist, Taper, and Bend. `3D Motion` contains only X/Y/Z rotation and Speed. The shared geometry helper creates real bevel geometry and CPU-applies twist, taper, and bend before UV/bounds calculation.
- ASCII, Dithering, and Halftone all consume the same persisted/sanitized Model state. Browser pixel checks changed for every Model controller on ASCII and for Bend on Dithering; routing/geometry tests cover the same contract for Halftone.
- Halftone now has an independent CPU oracle, shader material, offscreen 3D Character source, explicit renderer route, exact reference editor schema, selected-only reset, conditional Mono colors, and shared Processing/Post-Processing stages.
- Live browser verification caught and fixed a real Three.js shader helper collision (`luminance`). After renaming the local helper, Halftone renders the Character correctly; Shape, Invert, Mode, Foreground, and Background visibly change output, Original hides Mono-only colors, and no new shader errors appear after the fix. Range semantics are covered by the CPU/material tests because the in-app browser wrapper does not dispatch React range changes reliably.
- Verification passed: full Vitest `52` files / `266` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining Phase 5M queue: Matrix Rain, Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

Detailed specification: `tasks/v2.1/phase-5n-model-halftone.md`.

### Matrix Rain vertical slice

- [x] Audit the placeholder schema/runtime and verify current reference editor Matrix Rain UI, defaults, character sets, WGSL, atlas, and uniform packing.
- [x] RED→GREEN: correct Matrix Rain schema, renderer discriminator, Custom Chars visibility, ranges, defaults, and effect-local runtime units.
- [x] Add a deterministic Matrix Rain CPU oracle proving every visible Settings row changes output.
- [x] Add an independent Matrix glyph atlas and Matrix Rain shader material with shared Processing/Post stages.
- [x] Add `CharacterMatrixRainCanvas` using the shared 3D Character Model source and explicit route.
- [x] Prove selected-only reset, persistence, sanitization, custom fallback, and cross-effect/Model isolation.
- [x] Browser-test Matrix Rain output, directions/time, conditional Custom Chars, shared Model behavior, and console/WebGL errors.
- [x] Run full verification and record the remaining 11-effect queue.

Detailed specification: `tasks/v2.1/phase-5o-matrix-rain.md`.

Matrix Rain review — 2026-07-13:

- Matrix Rain now has an explicit independent renderer route, deterministic CPU oracle, fixed 16-column `20×32` glyph atlas, exact built-in/custom charset behavior, and its own shader/material lifecycle. It does not import or fall through ASCII, Dithering, or Halftone.
- Settings match the current reference editor contract: exact groups/order, defaults, ranges, Custom Chars visibility, direction IDs, runtime units, threshold/background/head-glow behavior, shared Processing/Post stages, and selected-only reset/sanitization/persistence.
- Browser verification rendered the selected 3D Character with Matrix glyphs, verified CUSTOM text and LEFT direction interactions, and found no console errors or shader compilation errors. Range changes remain covered by deterministic CPU/material/store tests because the in-app browser wrapper does not dispatch React range changes reliably.
- Verification passed: focused Matrix suites `7` files / `64` tests, full Vitest `56` files / `309` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Dots vertical slice

- [x] Audit the Dots placeholder and verify the current reference editor Dots UI, defaults, uniform packing, shader equations, and quirks.
- [x] Write the detailed Dots specification before application-code implementation.
- [x] RED→GREEN: correct Dots schema, renderer discriminator, exact options/ranges/defaults, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Dots CPU oracle proving every functional Dots Setting changes output and locking the reference editor's Dot Color no-op.
- [x] Add an independent Dots material and `CharacterDotsCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no ASCII/Dithering/Halftone/Matrix fallback and full Model/animation wiring.
- [x] Browser-test Dots selects/toggle/conditional colors, representative output, shared Model wiring, and console/WebGL errors; range semantics use deterministic CPU/material/store tests because the browser wrapper does not dispatch range input.
- [x] Run full verification and record the remaining 10-effect queue.

Detailed specification: `tasks/v2.1/phase-5p-dots.md`.

Dots review — 2026-07-13:

- Dots now has an explicit independent renderer route, deterministic CPU oracle, direct uniform mapping, exact square/offset-row hex lattice, strict Circle/Square/Diamond boundaries, and its own shader/material lifecycle. It does not import or fall through ASCII, Dithering, Halftone, or Matrix Rain.
- Settings match the current production bundles: exact group/row order, options, defaults, ranges, `/100` adjustment units, conditional Mono colors, selected-only reset, sanitization, persistence, and full shared Model/animation wiring.
- Production quirks are locked instead of silently corrected: UI Mono maps to grayscale shader mode `1`, so Dot Color is a visible no-op; Background still affects Original while hidden; Invert reverses luminance/radius but not Original RGB; Dots ignores shared Processing and only Post runs after the effect.
- Browser verification rendered the selected 3D Character with Dots, visibly changed Shape, Grid Type, Invert, Mode, and Background state, exposed Mono-only color rows, and found no console or shader errors. Numeric range behavior and Dot Color no-op are proven by CPU/material/store tests because the in-app browser wrapper does not dispatch React range input reliably.
- Verification passed: focused Dots integration `6` files / `43` tests, full Vitest `59` files / `329` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Contour vertical slice

- [x] Audit the Contour placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Contour specification before application-code implementation.
- [x] RED→GREEN: correct Contour schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Contour CPU oracle proving every functional setting and production quirk/no-op.
- [x] Add an independent Contour material and `CharacterContourCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Contour selects/toggle/conditional colors, representative output, Model wiring, and console/WebGL errors; range semantics use CPU/material/store tests because the browser wrapper does not dispatch range input.
- [x] Run full verification and record the remaining 9-effect queue.

Detailed specification: `tasks/v2.1/phase-5q-contour.md`.

Contour review — 2026-07-13:

- Contour now has an explicit independent renderer route, deterministic CPU oracle, direct material uniforms, exact midpoint band quantization and four-neighbor contour classification, and its own 3D Character canvas/resource lifecycle. It does not import or fall through any prior effect.
- Settings match the current production bundles: exact group/row order, options, defaults, slider ranges, enum IDs, `/100` adjustment units, conditional Mono colors, selected-only reset, sanitization, persistence, and shared Model/animation wiring.
- Production quirks are locked: Invert affects only center luminance while neighbors remain uninverted; Line Thickness is sample distance rather than geometric stroke width; Original is still RGB midpoint-quantized; hidden Line Color/Background remain functional in their applicable contexts; Processing is a Contour no-op and Post runs after the effect.
- Browser verification rendered the selected 3D Character, changed Filled Bands to Lines Only, toggled Invert, exposed and changed Mono Line Color/Background, visibly reproduced the all-contour Invert bug, and found no console or shader errors. Numeric ranges are proven by CPU/material/store tests because the browser wrapper does not dispatch range input reliably.
- Verification passed: focused Contour integration `6` files / `47` tests, full Vitest `62` files / `351` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Pixel Sort vertical slice

- [x] Audit the Pixel Sort placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Pixel Sort specification before application-code implementation.
- [x] RED→GREEN: correct Pixel Sort schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Pixel Sort CPU oracle proving every functional setting and production no-op/limit.
- [x] Add an independent Pixel Sort material and `CharacterPixelSortCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Pixel Sort controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 8-effect queue.

Pixel Sort review — 2026-07-13:

- Pixel Sort now has an explicit independent renderer route, deterministic CPU oracle, exact two-sided span search, fixed 24-sample cap, luminance bubble sort, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior effect.
- Settings match the current production bundles: exact group/row order, options, defaults, slider ranges, enum IDs, raw streak units, `/100` adjustment units, selected-only reset, sanitization, persistence, and shared Model/animation wiring.
- Production quirks are locked: UI mode names map to black/white/bright span predicates, all modes sort by Rec.601 luminance, terminal non-span/OOB distance is included, diagonal steps use normalized component-wise pixels, Processing is a no-op, and Post runs last.
- Browser verification rendered the selected extruded Character, exposed the exact Pixel Sort rows, changed Direction to Vertical, Sort Mode to Hue, toggled Reverse, and produced no shader/runtime errors; the terminal showed only the existing Three.js Clock deprecation warning. Numeric ranges and Model wiring are proven by CPU/material/store/routing tests because the browser wrapper does not reliably dispatch range input.
- Verification passed: focused Pixel Sort integration `6` files / `51` tests, full Vitest `65` files / `375` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Blockify vertical slice

- [x] Audit the Blockify placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Blockify specification before application-code implementation.
- [x] RED→GREEN: correct Blockify schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Blockify CPU oracle proving every functional setting and production no-op/limit.
- [x] Add an independent Blockify material and `CharacterBlockifyCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Blockify controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 7-effect queue.

Blockify review — 2026-07-13:

- Blockify now has an explicit independent renderer route, deterministic CPU oracle, exact block-center linear-clamp sampling, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior effect.
- Settings match the current production bundles: exact groups/order, Style and Color IDs, defaults, ranges, steps, raw pixel units, `/100` adjustment units, Border Color visibility when Border Width is positive, selected-only reset, sanitization, persistence, and shared Model/animation wiring.
- Production quirks are locked: the source is sampled once at each block center rather than averaged; Shaded uses the fixed radial multiplier; Outline uses strict comparisons and raw Border Color; border controls are contextual no-ops outside Outline; partial blocks clamp to the source edge; Processing is ignored and Post runs last.
- Browser verification rendered the selected extruded Character, changed Style to Outline, Mode to Grayscale, and Border Color to red. The output visibly showed the expected screen-space block borders, and the terminal reported no shader/runtime errors; only the existing Three.js Clock deprecation warning remained. Numeric range and Model behavior are covered by schema/core/material/store/routing tests because the browser wrapper does not reliably dispatch range input.
- Verification passed: focused Blockify integration `6` files / `50` tests, full Vitest `68` files / `396` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Threshold vertical slice

- [x] Audit the Threshold placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Threshold specification before application-code implementation.
- [x] RED→GREEN: correct Threshold schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Threshold CPU oracle proving every functional setting and production no-op/limit.
- [x] Add an independent Threshold material and `CharacterThresholdCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Threshold controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 6-effect queue.

Threshold review — 2026-07-13:

- Threshold now has an explicit independent renderer route, deterministic CPU oracle, exact Bayer 4×4 dithering, strict binary threshold and multi-level posterize branches, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior effect.
- Settings match current production: exact groups/order, defaults, ranges, steps, custom/color IDs, `/100` adjustment units, conditional Mono colors, selected-only reset, sanitization, persistence, and shared Model/animation wiring.
- Production quirks are locked: equality is dark; Dither changes the decision/posterization input; two-level Original returns undithered adjusted color for light pixels and black for dark pixels; Threshold Point is a visible no-op above two levels; multi-level Mono uses posterized Rec.601 luminance as the Background→Foreground tint; Processing is ignored and Post runs last.
- Browser verification rendered the selected extruded Character, toggled Dither and Invert, switched Mode to Original, hid Mono-only colors, and visibly produced the expected thresholded output. The terminal reported no shader/runtime errors, only the existing Three.js Clock deprecation warning. Numeric ranges and Model behavior are covered by schema/core/material/store/routing tests because the browser wrapper does not reliably dispatch range input.
- Verification passed: focused Threshold integration `6` files / `60` tests, full Vitest `71` files / `425` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Edge Detection vertical slice

- [x] Audit the Edge Detection placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Edge Detection specification before application-code implementation.
- [x] RED→GREEN: correct Edge Detection schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Edge Detection CPU oracle proving every functional setting and production no-op/limit.
- [x] Add an independent Edge Detection material and `CharacterEdgeDetectionCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Edge Detection controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 5-effect queue.

Edge Detection review — 2026-07-14:

- Edge Detection now has an explicit independent renderer route, deterministic CPU oracle, nested Gaussian sampling, exact coarse/fine Sobel/Prewitt/Laplacian detector behavior, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior effect.
- Settings match current production: exact groups/order, algorithm and color IDs, defaults, ranges, steps, raw Line Width/Threshold units, `/100` adjustments, conditional Mono colors, selected-only reset, sanitization, persistence, and shared Model/animation wiring.
- Production quirks are locked: Line Width scales sampling radius; fine Prewitt deliberately uses Sobel; combined magnitude uses `max(coarse, fine*.7)`; mask softness is `threshold*.3`; Original still mixes against hidden Background and ignores Edge Color; Contrast `-100` flattens adjusted RGB to `.5`; Processing is ignored and Post runs last.
- Browser verification rendered the selected extruded Character, changed Algorithm to Laplacian, toggled Invert, switched to Original, hid Mono-only colors, and confirmed the dedicated canvas was ready. No shader/page errors occurred; only React dev, Three.js Clock deprecation, headless GL readback performance, and teardown context-loss warnings appeared.
- Verification passed: focused Edge Detection integration `6` files / `54` tests, full Vitest `74` files / `446` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Crosshatch vertical slice

- [x] Audit the Crosshatch placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Crosshatch specification before application-code implementation.
- [x] RED→GREEN: correct Crosshatch schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Crosshatch CPU oracle proving every functional setting and production no-op/limit.
- [x] Add an independent Crosshatch material and `CharacterCrosshatchCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Crosshatch controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 4-effect queue.

Crosshatch review — 2026-07-14:

- Crosshatch now has an explicit independent renderer route, deterministic CPU oracle, exact hash/value-noise wobble, six cumulative tonal-art-map patterns, layer collapse/weights/solid fill, and its own 3D Character canvas/material lifecycle. It does not reuse Dithering's Crosshatch sub-algorithm or any prior effect material.
- Settings match current production: exact groups/order, defaults, ranges, steps, radians/raw packing, `/100` adjustments, black-on-white palette, selected-only reset, sanitization, persistence, and shared Model/animation wiring.
- The production Line Width mismatch is preserved end-to-end: reset/store/material keep `0.15` despite UI min `0.5`; the UI displays `0.1` with a thumb left of the track, and the first slider interaction clamps into the valid range. Generic hydration now preserves intentional out-of-range production defaults without allowing other invalid values.
- Production quirks are locked: Density is inverse visual density/spacing; luma uses red coefficient `.2326`; Line Width is raw and can saturate patterns; Layers control luminance-gated TAM directions; Randomness is deterministic phase wobble; B/C and Invert affect the mask rather than palette; Processing is ignored and Post runs last.
- Browser verification rendered the selected extruded Character with the default crosshatch, proved the negative slider-thumb position and `0.1` display, moved Line Width to `0.5`, toggled Invert, changed Line Color, and found no shader/page errors. Only React dev, Three.js Clock deprecation, headless GL readback, and teardown context-loss warnings appeared.
- Verification passed: focused Crosshatch integration `6` files / `61` tests, full Vitest `77` files / `472` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Wave Lines, Noise Field, Voronoi, and VHS.

### Wave Lines vertical slice

- [x] Audit the Wave Lines placeholder and verify current reference editor UI, defaults, uniforms, shader equations, Processing/Post behavior, and quirks.
- [x] Write the detailed Wave Lines specification before application-code implementation.
- [x] RED→GREEN: correct Wave Lines schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Wave Lines CPU oracle proving every functional setting and production no-op/limit.
- [x] Add an independent Wave Lines material and `CharacterWaveLinesCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Wave Lines controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 3-effect queue.

Wave Lines review — 2026-07-14:

- Wave Lines now has an explicit independent renderer route, deterministic CPU oracle, exact horizontal/vertical base-cell sine displacement, strict hard line boundary, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior effect renderer.
- Settings match current production: exact groups/order, options, defaults, ranges, steps, raw pixel/amplitude units, `/100` adjustments, conditional Mono colors, selected-only reset, persistence, sanitization, and full shared Model/animation wiring.
- Production mismatches are preserved: Line Thickness resets to `0.4` below the UI minimum `0.5` and displays a left-of-track thumb; the first dispatched slider change clamps into range. Mono uploads shader mode `1`, so Line Color remains an unconditional no-op; hidden Background remains functional in Original; Animate OFF freezes effect time at zero without removing the spatial sine.
- Browser verification rendered the selected extruded Character, showed the default `0.4` custom thumb at `left: calc(-4% - 4px)`, changed thickness through a native input event, switched Direction to Vertical, disabled Animate, exposed Mono-only colors, and found no console/page/shader errors. Only the existing Three.js Clock and headless GL readback warnings occurred during the default capture.
- Verification passed: focused Wave Lines integration `6` files / `55` tests, full Vitest `80` files / `495` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Noise Field, Voronoi, and VHS.

### Noise Field vertical slice

- [x] Audit the Noise Field placeholder and verify current reference editor UI, defaults, uniform ABI, shader equations, Processing/Post behavior, WebGL fallback, and quirks.
- [x] Write the detailed Noise Field specification before application-code implementation.
- [x] RED→GREEN: correct Noise Field schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Noise Field CPU oracle proving all functional settings and contextual no-ops.
- [x] Add an independent Noise Field material and `CharacterNoiseFieldCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Noise Field controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining 2-effect queue.

Noise Field review — 2026-07-14:

- Noise Field now has an explicit independent renderer route, deterministic CPU oracle, exact production value-noise/Simplex-approximation/Worley branches, unnormalized FBM, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior renderer.
- Settings match current production: exact groups/order, Noise Type IDs, defaults, ranges, steps, raw Scale/Intensity/Speed/Octaves units, `/100` adjustments, selected-only reset, persistence, sanitization, and shared Model/global animation clock wiring.
- Production behavior is locked: Distort Only skips only the overlay while retaining displacement; Animate OFF freezes local time but Speed remains visible and becomes a contextual no-op; the second displacement axis is the same FBM offset by `[100,100]`; B/C run after displaced clamp sampling and before positive-only overlay; UV edges clamp; Processing is ignored and Post runs last.
- Browser verification rendered the selected extruded Character with the dedicated Noise Field canvas, exposed the exact nine rows/defaults, switched Perlin to Worley, disabled Animate, enabled Distort Only, and found no console/page/shader errors. Numeric controls and every formula branch are covered by schema/core/material/store tests.
- Verification passed: focused Noise Field integration `6` files / `68` tests, full Vitest `83` files / `524` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Voronoi and VHS.

Detailed specification: `tasks/v2.1/phase-5x-noise-field.md`.

### Voronoi vertical slice

- [x] Audit the Voronoi placeholder and verify current reference editor UI, defaults, uniform ABI, shader equations, Processing/Post behavior, WebGL fallback, and quirks.
- [x] Write the detailed Voronoi specification before application-code implementation.
- [x] RED→GREEN: correct Voronoi schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Voronoi CPU oracle proving all functional settings and contextual no-ops.
- [x] Add an independent Voronoi material and `CharacterVoronoiCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test Voronoi controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and record the remaining VHS queue.

Voronoi review — 2026-07-14:

- Voronoi now has an explicit independent renderer route, deterministic CPU oracle, exact correlated hash, 3×3 closest/second-closest ownership search, and its own 3D Character canvas/material lifecycle. It does not import or fall through any prior renderer.
- Settings match current production: exact groups/order, defaults, ranges, `.05` steps, explicit `"0".."2"` control-boundary enum IDs, raw Cell Size/Edge Width/Randomize packing, `/100` adjustments, selected-only reset, persistence, sanitization, and shared Model wiring.
- Production quirks are locked: Cell Average is a fixed 25-sample square stencil rather than a polygon average; Center and Gradient sample nominal unrandomized lattice centers; Gradient caps current-source contribution at 50%; Darkened is `cellColor*.3`; Edge Width is cell-space; B/C runs after edge composition; Processing is ignored and Post runs last.
- Browser verification rendered the selected extruded Character with the dedicated Voronoi canvas, exposed the exact seven rows/defaults, switched Edge Color to Darkened and Color Mode to Gradient, and found no console/page/shader errors. Range semantics and all geometry/color branches are covered by schema/core/material/store tests.
- Verification passed: focused Voronoi integration `6` files / `66` tests, full Vitest `86` files / `549` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: VHS.

Detailed specification: `tasks/v2.1/phase-5y-voronoi.md`.

### VHS vertical slice

- [x] Audit the VHS placeholder and verify current reference editor UI, defaults, uniform ABI, shader equations, time behavior, Processing/Post, WebGL fallback, and quirks.
- [x] Write the detailed VHS specification before application-code implementation.
- [x] RED→GREEN: correct VHS schema, renderer discriminator, exact controls, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic VHS CPU oracle proving all functional settings, temporal branches, and unconditional VHS grading.
- [x] Add an independent VHS material and `CharacterVhsCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no prior-effect fallback and full Model/animation/resource lifecycle.
- [x] Browser-test VHS controls, representative output, Model wiring, and console/WebGL errors.
- [x] Run full verification and the final all-effects completion audit.

VHS review — 2026-07-14:

- VHS now has an explicit independent renderer route, deterministic CPU oracle, exact value-noise time branches, and its own 3D Character canvas/material lifecycle. Tracking bands/jumps, three-part tape warp, RGB bleed/five-tap smear, scanlines, static bands/rolling bar, unconditional VHS grading/vignette, and final B/C all follow production order.
- Settings match current production: exact groups/order, defaults, `.05` steps, raw effect units, `/100` adjustments, selected-only reset, persistence, sanitization, shared Model wiring, and continuous accumulated time with no invented Animate/Speed controls.
- A real state-corruption bug was removed: effect-local numeric Scanlines now uses `vhs-scanlines`, while shared Post keeps boolean `scanlines`. Dedicated schema/runtime/store/material tests prove both values remain independent and can intentionally stack.
- Browser verification rendered the selected extruded Character with the dedicated VHS canvas, exposed the exact seven rows including VHS Scanlines `0.3`, and found no console/page/shader errors. CPU/material tests lock every temporal branch, the strict `>0.01` gates, warped-UV vignette, unconditional all-zero VHS treatment, and Post ordering.
- Verification passed: focused VHS integration `6` files / `76` tests, full Vitest `89` files / `582` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.

Detailed specification: `tasks/v2.1/phase-5z-vhs.md`.

### Final all-effects completion audit — 2026-07-14

- [x] All 15 definitions publish independent renderer discriminators equal to their Effect IDs; none uses `unimplemented`.
- [x] All visible effect-local control IDs are disjoint from shared Processing/Post IDs.
- [x] `StudioCanvas` explicitly routes all 15 Effects to dedicated canvases/materials with no ASCII fallback.
- [x] Browser-switched all 15 Effects in one session: every dedicated canvas existed, all 14 stateful canvases reported `ready`, ASCII rendered, no not-implemented view appeared, and no console/page/shader errors occurred.
- [x] Full regression suite, TypeScript, ESLint, production build, and `git diff --check` pass after the audit.

User correction:

- Only ASCII has completed Settings behavior.
- Every other Effect currently has the wrong Settings and is incorrectly treated as ASCII.
- reference effects have different parameter sets and different rendering logic; parity must be proven one Effect and one setting change at a time.

Selected first vertical slice: **Dithering**.

Plan checkpoint before implementation:

- [x] Capture the reference editor's desktop three-column layout, section hierarchy, spacing, borders, typography, canvas toolbar, and export panel.
- [x] Confirm `data/sample.jpg` is the reference-only behavior probe and that the local app remains Character-only. Browser upload is not exposed by the available browser-control API, so manual reference editor upload remains the visual checkpoint.
- [x] Record every Dithering Settings row, control type, default, min/max/step/options, reset behavior, conditional visibility, and runtime change logic.
- [x] Audit `studio-effects.ts`, `studio-effect-runtime.ts`, store persistence/reset/sanitization, `StudioRightPanel`, and the active renderer path to locate the shared-ASCII coupling.
- [x] Generate and inspect a reference editor-aligned `/studio` reference image before implementation, using the external site as the visual source of truth.
- [x] Check this plan with the user before modifying application code; approved on 2026-07-13.

Implementation checklist after plan approval:

- [x] Add failing tests that require an explicit Effect discriminator and forbid non-ASCII Effects from using ASCII-only controls/runtime.
- [x] Add Dithering-specific catalogue/schema/defaults/sanitization/reset behavior.
- [x] Add a Dithering-specific renderer/runtime compiler whose every visible control changes output.
- [x] Rebuild `/studio` shell to the generated-image layout while retaining the existing Character selector and 3D Motion panel in Input.
- [x] Keep ASCII on its dedicated glyph-atlas renderer and route Dithering to its own pipeline.
- [x] Verify Dithering setting mappings, conditional visibility, reset isolation, algorithms, color modes, palette/custom palette, modulation, chromatic, Processing, and Post-Processing behavior with pure-oracle/material/runtime tests; use `data/sample.jpg` only for the reference-behavior research checkpoint.
- [x] Run focused Vitest, full Vitest, TypeScript, lint, build, `git diff --check`, and browser console checks.
- [x] Record the implementation review, evidence, remaining deltas, and the next Effect slice.

Acceptance criteria:

- Selecting Dithering never shows ASCII-only Character Set, Scale, Spacing, Output Width, or ASCII color-mode controls.
- Dithering Settings match the reference editor's labels, order, control types, defaults, ranges/options, and reset behavior.
- Every visible Dithering setting has a tested mapping to a Dithering renderer parameter and causes the intended visible change.
- Switching ASCII ↔ Dithering preserves effect-local settings without cross-contamination.
- `/studio` matches the reference editor's desktop architecture and UI layout, except Input uses the existing Character selector and 3D Motion panel.
- `/studio` visual placement, density, and component proportions match `data/Generated image 1.png`, which is the authoritative UI-layout reference.
- The local app accepts only the existing Character input; `data/sample.jpg` is never exposed as a local input or persisted in local state.

Review result:

- Removed every non-ASCII branch from the ASCII shader. `StudioCanvas` now routes by explicit renderer discriminator: ASCII → `CharacterAsciiCanvas`, Dithering → `CharacterDitheringCanvas`, and the other 13 effects → an explicit not-implemented state.
- Dithering now has an independent offscreen 3D Character source scene and full-screen shader material. Its tests cover 16 algorithms, ordered/error-diffusion oracle behavior, Clustered Dot, Crosshatch, adjustments, all color modes, 11 built-in palettes plus a 64-color custom palette, modulation modes, RGB split, chromatic displacement, shared Processing, and shared Post-Processing.
- Effect state is local to the selected effect. Settings Reset resets only that effect, storage uses a dedicated effects key, and dynamic controls follow `visibleWhen` conditions.
- `/studio` now matches `data/Generated image 1.png` at the reference 1586×992 viewport: measured columns are exactly 329 / 843 / 414px, with 50px top and 60px bottom rails, collapsed Character trigger/popover, Input → Effects → Presets, compact right rows, and the 4×2 Export grid.
- Browser verification on `https://localhost:3100/studio` passed: Character popover opens/closes, Dithering becomes active, its independent canvas mounts, Algorithm/Intensity are present, all eight Export cells render, and console/page errors are empty. Screenshot: `.codex/visualizations/2026/07/13/019f5b7d-b520-77f0-8100-297099448021/studio-dithering.png`.
- Verification passed: full Vitest 48 files / 237 tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is the repository's Node 22 requirement while this shell runs Node 24.18.0.
- Remaining Phase 5M work: implement the other 13 effects one vertical slice at a time. The next recommended slice is Halftone; no remaining effect is allowed to reuse ASCII as a fallback.

## Simplify Commit 462878dff484a3122 - 2026-06-18

Scope:

- Review commit `462878dff484a3122` for local simplifications without changing the `/studio` public behavior.
- Keep the active reference editor `/studio` UI and current typography intact.
- Prefer small, testable cleanup over deleting broad legacy code in this pass.

Implementation checklist:

- [x] Remove the single-use mobile tabs marker prop and keep the mobile layout contract explicit.
- [x] Dispose ASCII glyph atlas textures together with their `ShaderMaterial`.
- [x] Clear removed Pattern Layer runtime data and stale loaded textures.
- [x] Run focused tests, full tests/type/build checks, and record the result.

Review result:

- `StudioMobileTabs` now owns its `data-studio-mobile-tabs` marker directly, and `StudioShell` no longer carries a one-off marker prop.
- ASCII shader materials now use `disposeAsciiShaderMaterial()` so the generated glyph atlas texture is released with the material.
- Removing a Pattern Layer now clears its session-only uploaded data, and stale loaded Pattern Layer textures are disposed when the layer list changes.
- Removed dead persisted-state sanitizer wrappers and unused imports exposed by lint, while keeping the active layer sanitizers used by current actions.
- Verification passed: focused Vitest (`5` files, `32` tests), full Vitest (`43` files, `194` tests), `pnpm exec tsc --noEmit --pretty false`, `pnpm run lint`, `git diff --check`, and `pnpm build`.

## Phase 5L ASCII Color Mode Default / Reset Correction - 2026-06-18

User correction:

- ASCII `Color / Mode` should default to `mono`.
- The right Settings `Reset` should also switch `Color / Mode` back to `mono`.

Implementation direction:

- Change only ASCII `color-mode`; keep other effects' color-mode defaults unchanged.
- Make the effect catalogue default `mono` so initial state and `resetSelectedEffectControls()` share the same behavior.
- Make the right Settings panel fallback `mono` so missing/stale controls do not display `original`.
- Migrate the v1 persisted old default from `original` to `mono` once, without preventing users from choosing `Original` again later.

Implementation checklist:

- [x] Record the correction in `tasks/lessons.md`.
- [x] Add failing tests for catalogue/runtime default, store initial/reset, and UI fallback.
- [x] Implement ASCII `color-mode` default/fallback as `mono`.
- [x] Verify focused tests, full tests, type/build checks, and browser default behavior.

Review result:

- ASCII `Color / Mode` now defaults to `mono` in the reference editor effect catalogue, so fresh initial state and `resetSelectedEffectControls()` both restore `mono`.
- `StudioRightPanel` now falls back to `mono` if ASCII `color-mode` is missing.
- Store persistence version moved to `2`; v1 persisted ASCII `color-mode: original` is migrated to `mono` once so old default state does not override the corrected default.
- Verification passed: focused red/green tests, full Vitest (`43` files, `191` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser check passed on `http://localhost:3002/studio`: hydrated UI shows `Mode` as `Mono`, and browser console errors are empty. Direct click automation for the dropdown/reset was blocked by the in-app browser wrapper, so reset behavior is covered by the store action test.

## Phase 5K ASCII Output Width Range Correction - 2026-06-18

User correction:

- `Output Width` values above `600` no longer create a useful visible change, so the control range should be `0..600`.

Implementation direction:

- Keep `Output Width` semantics as output columns, not pixels.
- Keep `0` as automatic/manual `Scale`.
- Clamp all direct entry points to `0..600`: effect catalogue metadata, right Settings slider, persisted store sanitization, runtime compiler output, and shader fallback.

Implementation checklist:

- [x] Record the correction in `tasks/lessons.md`.
- [x] Add failing tests for store clamping, runtime clamping, effect metadata, and shader fallback.
- [x] Implement the `0..600` range across UI/catalogue/runtime/shader.
- [x] Verify focused tests, full tests, type/build checks, and browser slider range.

Review result:

- `Output Width` now uses a shared `ASCII_OUTPUT_WIDTH_MAX = 600` for the reference editor effect catalogue and right Settings slider.
- Store sanitization clamps persisted/direct `output-width` values to `0..600`; `0` still means automatic/manual `Scale`.
- Runtime compile output clamps `effectValues[2]` to `0..600`, and the ASCII shader also clamps `u_effectC` as a fallback before computing `canvasWidth / outputColumnCount`.
- Verification passed: focused red/green tests, full Vitest (`43` files, `188` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser check passed on `http://localhost:3002/studio`: `Output Width` slider reports `min=0`, `max=600`, `step=1`, `value=0`; browser console errors are empty.

## Phase 5J ASCII Foreground Color Correction - 2026-06-18

User correction:

- ASCII `Color` needs a `Foreground` control in addition to `Mode`, `Background`, and `Intensity`.

Implementation direction:

- Add `Foreground` to the ASCII `Color` group in the reference editor effect catalogue and the right Settings panel.
- Map `Foreground` into the ASCII runtime as `effectColorA`.
- Use `Foreground` as the glyph/ink color in mono-style ASCII output while preserving `Mode: original` behavior.

Implementation checklist:

- [x] Record the correction in `tasks/lessons.md`.
- [x] Add failing tests for the visible `Foreground` row, catalogue control, runtime color mapping, and shader color path.
- [x] Implement UI/catalogue/runtime/shader changes.
- [x] Verify focused tests, full tests, type/build checks, and browser load state.

Review result:

- ASCII `Color` now includes `Foreground` between `Mode` and `Background` in the right Settings panel.
- The reference editor ASCII effect catalogue now includes a `foreground` color control, and the runtime maps it to `effectColorA`; `background` remains mapped to `effectColorB`.
- The ASCII shader now uses `effectColorA/effectColorB` for mono-style glyph/background output while preserving `Mode: original` with the existing source/palette color path.
- Verification passed: focused Foreground tests, full Vitest (`43` files, `187` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser load check passed on `http://localhost:3002/studio`: the `Color` group shows `Mode`, `Foreground`, `Background`, and `Intensity`; browser console errors are empty.

## Phase 5I ASCII Scale / Spacing / Output Width Semantics - 2026-06-18

User correction:

- `Scale` means ASCII cell/space size from `1` to `20`; `1` is the smallest cell and `20` should approach roughly `64px`.
- `Spacing` changes the glyph size inside each ASCII cell; `0` fills the cell, `1` shrinks the glyph to one quarter of the cell.
- `Output Width` should have a real rendering meaning instead of duplicating `Scale`.

Implementation direction:

- Define `Scale` as the UI-facing cell-size control. Map it linearly to renderer `cellSize` so `1 -> 1px` and `20 -> 64px`, then remove the shader's extra `u_effectA` scale multiplication.
- Define `Spacing` as glyph inset. In shader, remap cell UV around center using `glyphScale = mix(1.0, 0.25, spacing)`, clip outside the shrunken glyph box, and keep alpha/intensity independent from spacing.
- Define `Output Width` as ASCII output column count. `0` means automatic/manual `Scale`; any value `>= 1` computes `cellSize = canvasWidth / outputWidth`, matching image-to-ASCII terminology and avoiding another pixel-size slider.

Implementation checklist:

- [x] Record the correction in `tasks/lessons.md`.
- [x] Add failing tests for the corrected shader contract and UI/range metadata.
- [x] Update ASCII UI scale conversion, control ranges, runtime defaults, persisted cell-size clamp, and shader sampling.
- [x] Verify focused tests, type/build checks, and browser smoke for Scale, Spacing, and Output Width.

Review result:

- `Scale` now uses a shared conversion helper: UI `1..20` maps to renderer cell size `1..64px`, and persisted `cellSize: 12` displays as `4.3` to match the `0.1` slider step.
- `Spacing` now means glyph size inside each cell: shader UVs shrink from full-cell at `0` to quarter-cell at `1`, without using spacing as an alpha multiplier.
- `Output Width` now means output columns: `0` keeps manual Scale; values `>= 1` compute cell size from `canvasWidth / outputColumnCount`.
- Verification passed: focused red/green tests, full Vitest (`43` files, `186` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser check passed on `http://localhost:3002/studio`: page loads from the latest production build, ASCII controls show `Scale 4.3`, `Spacing 0`, `Output Width 0`, and browser console errors are empty. The in-app browser automation could not reliably drag native range inputs, so the final effect proof is from shader/runtime tests plus successful page load and control-state inspection.

## Phase 5H Real ASCII Character Set Rendering - 2026-06-18

User correction:

- `Character Set` must visibly change to the corresponding ASCII text characters, not only switch procedural placeholder glyph shapes.
- Required sets:
  - `standard`: `@%#*+=-:. `
  - `blocks`: `█▓▒░`
  - `binary`: `01`
  - `detailed`: ``$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\|()1{}[]?-_+~<>i!lI;:,"^`'. ``
  - `minimal`: `#.`
  - `alphabetic`: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`
  - `numeric`: `0123456789`
  - `math`: `+-*/=<>^%()[]{}|~`
  - `symbols`: ``!@#$%^&*()_+-=[]{}|;':",./<>?`~``
  - `custom`: default `█▓▒░@#%*+=-:. `, overridden by typed `Custom Chars`.

Root cause:

- The previous shader treated `Character Set` as a numeric mode that selected procedural 5x7 placeholder shapes. It did not render the actual selected text characters, so the visual result could change hash without showing the expected ASCII letter/symbol vocabulary.

Implementation checklist:

- [x] Record the correction in `tasks/lessons.md`.
- [x] Add failing tests for concrete character-set strings and glyph-atlas shader sampling.
- [x] Preserve `Custom Chars` text in the Studio runtime so the material can build a real custom glyph atlas.
- [x] Generate an ASCII glyph atlas texture from the selected character string using the current site font variables, with a fallback texture for non-browser tests.
- [x] Update the fragment shader to sample the atlas by brightness, preserving dark-to-light density order and treating trailing spaces as empty glyph cells.
- [x] Browser-smoke `standard`, `blocks`, `binary`, `numeric`, and `custom=01` to prove visible output changes with the selected character vocabulary.

Review result:

- `ASCII_CHARACTER_SETS` now holds the concrete strings above, and `resolveAsciiCharacterSet()` returns the custom text only when `Character Set: custom` has a non-empty value.
- `createAsciiShaderMaterial()` now builds `u_asciiGlyphAtlas`, `u_asciiGlyphCount`, and `u_asciiGlyphColumns`; the shader samples `sampleAsciiGlyphAtlas()` for the active ASCII branch instead of relying on procedural placeholders.
- The atlas canvas uses the existing CSS font variables (`--font-body`, `--font-noto`) with monospace fallback, so this does not change the site's configured typography.
- Verification passed: focused material/runtime tests, full Vitest (`42` files, `182` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser smoke passed on local `/studio`: canvas hashes were distinct for `STANDARD`, `BLOCKS`, `BINARY`, `NUMERIC`, and `CUSTOM` with `01`; browser console errors were empty.

## Phase 5G Studio Setting-Effect Contract Audit - 2026-06-18

User correction:

- Before implementation or rework, the plan must list settings in the same grouped style as reference editor and explain the expected effect of every setting.
- A setting is not complete if changing it only updates state, labels, metadata, or uniforms without a visible/runtime effect.
- For each row below, validation must use at least one of: runtime signature change, shader uniform assertion, representative pixel-hash smoke, export-dimension check, or dynamic-row DOM check.

Audit rules:

- Every visible control id from `components/studio/studio-effects.ts` must appear in this contract.
- Every select option must change either the runtime numeric mode, glyph set, color mode, algorithm branch, or export behavior.
- Dynamic rows must be validated by both UI state and runtime behavior. Example: `Character Set: custom` must show `Custom Chars` and the typed characters must change the glyph hash/count used by the renderer.
- Controls with non-pixel outcomes must have a direct validation target. Example: `Output Width` should affect sampling/export width or be renamed/removed if it cannot honestly do so.
- Shared `Processing` runs after the selected effect. Shared `Post-Processing` runs last. Left `Animation` remains separate and must not be mixed into `Processing`.

Effect: ASCII

Settings:

- `Scale`: changes ASCII glyph/cell size; higher values produce larger blockier characters and lower sampling detail.
- `Spacing`: changes distance between ASCII cells; higher values create a looser grid with more background visible.
- `Output Width`: changes output/sample resolution target; higher values should produce denser output or larger export width, and must be verified by sampling/export behavior rather than label-only state.
- `Character Set`: changes the glyph family used for luminance mapping.
  - `standard`: general ASCII ramp for balanced image detail.
  - `blocks`: block glyphs produce heavier filled-cell shapes.
  - `binary`: restricts glyphs to binary-style marks, producing a two-symbol computer-text texture.
  - `detailed`: uses a longer glyph ramp for finer luminance gradation.
  - `minimal`: uses fewer glyphs for simplified posterized output.
  - `alphabetic`: uses letters as the visible mark vocabulary.
  - `numeric`: uses numbers as the visible mark vocabulary.
  - `math`: uses mathematical symbols as the visible mark vocabulary.
  - `symbols`: uses punctuation/symbol glyphs as the visible mark vocabulary.
  - `custom`: reveals `Custom Chars`; typed characters become the glyph vocabulary and must affect glyph hash/count.

Adjustments:

- `Brightness`: offsets sampled luminance before glyph/color selection.
- `Contrast`: expands or compresses luminance range before glyph/color selection.
- `Saturation`: changes source color saturation when `Mode: original` is active; mono output should not rely on it for color.
- `Hue Rotation`: rotates source hue when original color is preserved.
- `Sharpness`: increases local edge/detail contrast before ASCII sampling.
- `Gamma`: remaps midtones before glyph selection; lower/higher values should visibly alter character density distribution.

Color:

- `Mode: mono`: renders ASCII with a controlled foreground/background treatment instead of preserving source color.
- `Mode: original`: preserves sampled character/source color through the ASCII marks.
- `Background`: changes the background fill behind ASCII marks.
- `Intensity`: blends ASCII effect strength against the underlying shaded character.

Effect: Dithering

Settings:

- `Algorithm`: switches the dither pattern/threshold family and must alter the ordered/error pattern signature.
  - `floyd-steinberg`: fine diffusion-like diagonal noise.
  - `atkinson`: softer diffusion with reduced spread.
  - `jarvis-judice-ninke`: wider diffusion footprint.
  - `stucki`: wide diffusion with stronger local structure.
  - `burkes`: medium-wide diffusion.
  - `sierra`: broad Sierra-style diffusion.
  - `sierra-two-row`: shorter Sierra footprint.
  - `sierra-lite`: compact Sierra footprint.
  - `bayer-2x2`: coarse ordered checker threshold.
  - `bayer-4x4`: medium ordered matrix.
  - `bayer-8x8`: finer ordered matrix.
  - `bayer-16x16`: very fine ordered matrix.
  - `clustered-dot`: clustered print-like dots.
  - `blue-noise`: irregular high-frequency noise pattern.
  - `interleaved-gradient`: screen-door gradient pattern.
  - `crosshatch`: hatch-like threshold texture.
- `Intensity`: blends the dithered result over the source/effect result.
- `Matrix Size`: changes ordered matrix scale; `2x2` is coarse, `4x4` medium, `8x8` fine, `16x16` very fine.
- `Modulation`: changes threshold modulation strength, making the dither pattern more or less aggressive.

Adjustments:

- `Brightness`: shifts luminance before thresholding.
- `Contrast`: changes threshold separation before dithering.
- `Gamma`: changes midtone threshold response.
- `Sharpen`: boosts source detail before thresholding.

Color:

- `Mode: mono`: maps dither to foreground/background colors.
- `Mode: tonal`: keeps tonal steps while retaining dither structure.
- `Mode: palette`: quantizes into a limited palette.
- `Mode: rgb`: dithers channels with RGB-aware treatment.
- `Mode: original`: preserves original color behind the dither pattern.
- `Foreground`: sets high/ink color for mono or palette-like output.
- `Background`: sets low/paper color for mono or palette-like output.

Chromatic Effects:

- `Enabled`: toggles per-channel displacement.
- `Max Displace`: caps channel offset distance.
- `Red Channel`: controls red-channel displacement weight.
- `Green Channel`: controls green-channel displacement weight.
- `Blue Channel`: controls blue-channel displacement weight.

Effect: Halftone

Settings:

- `Shape`: changes screen primitive; `circle`, `square`, `diamond`, and `line` must produce distinct dot/line masks.
- `Dot Scale`: changes primitive size inside each halftone cell.
- `Spacing`: changes distance between halftone cells.
- `Angle`: rotates the screen grid/line pattern.
- `Invert`: flips dot-fill relationship so dark/light regions swap density behavior.

Adjustments:

- `Brightness`: shifts tonal input before dot size calculation.
- `Contrast`: expands/compresses tonal range before dot size calculation.

Color:

- `Mode: mono`: uses foreground/background halftone colors.
- `Mode: original`: preserves sampled source color through halftone primitives.
- `Foreground`: ink color for mono halftone marks.
- `Background`: paper/background color for mono halftone.

Effect: Matrix Rain

Settings:

- `Character Set`: chooses rain glyph vocabulary; supports the same ASCII set options including `custom`.
- `Cell Size`: changes rain glyph cell size and column/row density.
- `Spacing`: changes distance between rain cells.
- `Speed`: changes animated rain travel speed.
- `Trail Length`: changes fade length behind the leading glyph.
- `Direction`: changes travel direction: `down`, `up`, `left`, or `right`.
- `Glow`: increases bloom-like brightness around rain marks.
- `BG Opacity`: changes darkness/visibility of the background layer behind rain.

Adjustments:

- `Brightness`: shifts mask/source brightness before rain visibility is calculated.
- `Contrast`: changes source contrast before rain masking.
- `Threshold`: controls where rain appears based on luminance/mask strength.

Color:

- `Rain Color`: sets the visible rain glyph color.

Effect: Dots

Settings:

- `Shape`: changes dot primitive: `circle`, `square`, or `diamond`.
- `Grid Type`: changes placement lattice; `square-grid` is orthogonal, `hexagonal-grid` offsets alternating rows.
- `Size`: changes dot size inside each grid cell.
- `Spacing`: changes distance between dot cells.
- `Invert`: flips density/visibility relationship between dark and light source regions.

Adjustments:

- `Brightness`: shifts source brightness before dot sizing.
- `Contrast`: changes source contrast before dot sizing.

Color:

- `Mode: mono`: renders dots with controlled mono colors.
- `Mode: original`: preserves sampled source color through dots.

Effect: Contour

Settings:

- `Fill Mode`: `filled-bands` renders tonal bands; `lines-only` renders only band boundaries.
- `Levels`: changes number of contour bands.
- `Line Thickness`: changes boundary thickness in line mode or band edge emphasis.
- `Invert`: reverses contour light/dark mapping.

Adjustments:

- `Brightness`: shifts source values before banding.
- `Contrast`: expands/compresses values before banding.

Color:

- `Mode: mono`: maps bands/lines to mono colors.
- `Mode: original`: preserves sampled source color through contour output.

Effect: Pixel Sort

Settings:

- `Direction`: changes streak direction: `horizontal`, `vertical`, or `diagonal`.
- `Sort Mode`: chooses the sorting key: `brightness`, `hue`, or `saturation`.
- `Threshold`: controls which pixels/cells enter the sorted streak.
- `Streak Length`: changes maximum streak distance.
- `Intensity`: blends sorted streaks against the source/effect result.
- `Randomness`: adds irregular breaks/jitter to streaks.
- `Reverse`: flips sorting direction/order.

Adjustments:

- `Brightness`: shifts source brightness before sort eligibility.
- `Contrast`: changes source contrast before sort eligibility.

Effect: Blockify

Settings:

- `Style`: `full-blocks` makes solid averaged blocks, `shaded` keeps tonal shading per block, `outline` emphasizes block borders.
- `Block Size`: changes pixel/block quantization size.
- `Border Width`: changes outline thickness for border-capable styles.

Adjustments:

- `Brightness`: shifts block color/luminance.
- `Contrast`: changes block contrast.

Color:

- `Mode: preserve-colors`: keeps sampled source colors in blocks.
- `Mode: grayscale`: converts block output to grayscale.
- `Border Color`: sets outline/border color when visible.

Effect: Threshold

Settings:

- `Levels`: changes number of threshold bands.
- `Threshold Point`: shifts the cutoff point between low/high values.
- `Dither`: adds threshold texture instead of hard flat cutoff.
- `Invert`: swaps low/high output sides.

Adjustments:

- `Brightness`: shifts values before thresholding.
- `Contrast`: changes separation before thresholding.

Color:

- `Mode: mono`: uses foreground/background threshold colors.
- `Mode: original`: preserves original color within thresholded regions.
- `Foreground`: high/ink color.
- `Background`: low/paper color.

Effect: Edge Detection

Settings:

- `Algorithm`: changes edge kernel behavior: `sobel`, `prewitt`, or `laplacian`.
- `Threshold`: controls edge visibility cutoff.
- `Line Width`: changes apparent edge thickness.
- `Invert`: swaps edge/background polarity.

Adjustments:

- `Brightness`: shifts source brightness before edge calculation.
- `Contrast`: boosts/reduces edge contrast before calculation.

Color:

- `Mode: mono`: renders edges/background with controlled colors.
- `Mode: original`: preserves source color where edge output allows.
- `Edge Color`: sets edge stroke color.
- `Background`: sets non-edge background color.

Effect: Crosshatch

Settings:

- `Density`: changes hatch line frequency.
- `Layers`: changes number of angled hatch layers used for tonal buildup.
- `Angle`: rotates the hatch base angle.
- `Line Width`: changes hatch stroke thickness.
- `Randomness`: jitters hatch spacing/visibility.
- `Invert`: reverses hatch density over light/dark regions.

Adjustments:

- `Brightness`: displayed values are sign-inverted before shifting source luminance and hatch density.
- `Contrast`: changes tonal separation before hatch density.

Color:

- `Line Color`: sets hatch stroke color.
- `Background`: sets paper/background color.

Effect: Wave Lines

Settings:

- `Line Count`: changes number of waves/scan lines.
- `Amplitude`: changes wave displacement height.
- `Frequency`: changes wave oscillation frequency.
- `Line Thickness`: changes stroke thickness.
- `Direction`: switches line orientation between `horizontal` and `vertical`.
- `Animate`: toggles time-driven wave movement.

Adjustments:

- `Brightness`: shifts source brightness before wave masking.
- `Contrast`: changes source contrast before wave masking.

Color:

- `Mode: mono`: uses mono wave/background treatment.
- `Mode: original`: preserves sampled source color through wave lines.

Effect: Noise Field

Settings:

- `Noise Type`: changes procedural field shape: `perlin`, `simplex`, or `worley`.
- `Scale`: changes noise feature size.
- `Intensity`: changes noise blend/displacement strength.
- `Octaves`: changes layered noise detail count.
- `Speed`: changes animated noise evolution speed.
- `Animate`: toggles time-driven noise movement.
- `Distort Only`: applies noise as distortion without replacing the color/effect result.

Adjustments:

- `Brightness`: shifts source brightness before noise blend.
- `Contrast`: changes source contrast before noise blend.

Effect: Voronoi

Settings:

- `Cell Size`: changes Voronoi cell scale.
- `Edge Width`: changes cell boundary thickness.
- `Edge Color`: changes boundary treatment: `black`, `white`, or `darkened`.
- `Color Mode`: changes cell fill strategy: `cell-average`, `center-sample`, or `gradient`.
- `Randomize`: changes cell seed/layout.

Adjustments:

- `Brightness`: shifts cell/source brightness.
- `Contrast`: changes cell/source contrast.

Effect: VHS

Settings:

- `Distortion`: changes horizontal/vertical signal warping.
- `Noise`: changes analog static/grain amount.
- `Color Bleed`: changes RGB/channel smear amount.
- `Scanlines`: changes horizontal scanline visibility.
- `Tracking Error`: changes rolling offset/glitch band strength.

Adjustments:

- `Brightness`: shifts final VHS brightness.
- `Contrast`: changes final VHS contrast.

Shared Processing:

- `Invert`: flips luminance/color polarity after the selected effect branch.
- `Brightness Map`: remaps brightness through an effect-specific response curve.
- `Edge Enhance`: increases local edge contrast after the selected effect branch.
- `Blur`: softens the selected effect result.
- `Quantize Colors`: reduces color/tonal steps after the selected effect branch.
- `Shape Matching`: biases the processed result back toward the selected Hanzi character mask silhouette.

Shared Post-Processing:

- `Bloom`: adds glow around bright output regions.
- `Grain / Intensity`: controls final film/noise grain visibility.
- `Grain / Size`: controls final grain scale.
- `Grain / Speed`: controls animated grain movement speed.
- `Chromatic`: adds final RGB split/channel offset.
- `Scanlines`: adds final display scanlines independent of VHS effect selection.
- `Vignette`: darkens or focuses screen edges.
- `CRT Curve`: bends/warps final screen coordinates like a CRT display.
- `Phosphor`: adds phosphor/display mask coloration or glow.

Implementation checklist:

- [x] Record the setting-list correction in `tasks/lessons.md`.
- [x] Add this grouped setting-effect contract to `tasks/todo.md`.
- [x] Re-audit `studio-effect-runtime.ts` against every row above before the next shader/UI change.
- [x] Add or tighten tests for settings whose validation was indirect: ASCII `Output Width`, ASCII `Character Set`, ASCII UI uniform wiring, shared `Processing / Blur`, `Pixel Sort / Streak Length`, and MP4 export label.
- [x] Browser-smoke representative controls for ASCII `Character Set`, ASCII `Output Width`, shared `Processing / Blur`, `Pixel Sort / Streak Length`, GIF export gating, and MP4 export gating.

Review result:

- Tightened the runtime contract so ASCII `Output Width` is preserved as a column-count target instead of a pre-divided scalar. The shader now uses it to alter ASCII sampling density.
- Reworked the reference editor ASCII shader branch so `Scale`, `Output Width`, and `Character Set` affect the actual glyph sampling path. The branch now has distinct glyph families for `standard`, `blocks`, `binary`, `detailed`, `minimal`, `alphabetic`, `numeric`, `math`, `symbols`, and `custom`.
- Corrected ASCII UI/runtime wiring: the active branch reads the existing ASCII uniforms that the UI actually updates for `Character Set`, `Background`, and `Intensity`, while keeping `Custom Chars` wired through the Studio runtime glyph hash/count.
- Corrected shared `Processing / Blur` from a grayscale replacement into a softening pass, and corrected `Pixel Sort / Streak Length` so larger values produce longer streaks.
- Export wording now shows `MP4` instead of `Video` while keeping GIF/MP4 gated behind active animation.
- Verification passed: focused Studio runtime/material/export tests, full Vitest (`42` files, `181` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser smoke passed on local `/studio`: playing export formats were `PNG/GIF/MP4`, paused export formats were `PNG` only, and canvas hashes were distinct for baseline ASCII, `BLOCKS`, `Output Width = 512`, `Processing Blur = 12`, Pixel Sort default, and `Streak Length = 300`; browser console errors were empty.

## Phase 5F Studio Runtime Effect Parity - 2026-06-18

User correction:

- Every visible `Settings`, `Processing`, and `Post-Processing` option must have a real visual effect, matching the reference editor's behavior model as closely as possible inside Hanzi's current 3D ASCII character renderer.
- Effect parity is not just UI parity. If a row exists, changing it must alter shader/runtime output or be removed.

Implementation direction:

- Add a runtime compiler module that takes `studioEffect.selectedEffectId` and `studioEffect.controls[selectedEffectId]`, plus shared Processing/Post-Processing controls, and produces stable shader uniforms.
- Keep the current 3D ASCII mesh renderer as the active preview. the reference editor's source is image/video, but Hanzi's intentional input difference remains the selected character mesh.
- Add one shader branch per reference editor effect:
  - `ASCII`: current cell/glyph shader, with `Scale`, `Spacing`, `Output Width`, `Character Set`, `Custom Chars`, adjustments, and `Mode`.
  - `Dithering`: ordered/error-style threshold patterns, matrix size, algorithm seed/style, modulation, mono/tonal/palette/RGB/original coloring, chromatic channel displacement.
  - `Halftone`: circle/square/diamond/line masks driven by dot scale, spacing, angle, invert, mono/original color.
  - `Matrix Rain`: directional animated glyph columns, speed, trail length, glow, background opacity, rain color, threshold.
  - `Dots`: circle/square/diamond dot grids, square/hex grid spacing, size, invert, mono/original color.
  - `Contour`: luminance bands/line-only mode, levels, line thickness, invert.
  - `Pixel Sort`: streak bands by direction/sort-mode/threshold/streak length/intensity/randomness/reverse.
  - `Blockify`: block quantization, full/shaded/outline styles, border width/color, preserve-colors/grayscale.
  - `Threshold`: level quantization, threshold point, dither, invert, mono/original color.
  - `Edge Detection`: sobel/prewitt/laplacian-style edge intensity approximation, threshold, line width, invert, edge/background colors.
  - `Crosshatch`: layered angled hatch lines, density, layers, line width, randomness, invert, line/background colors.
  - `Wave Lines`: horizontal/vertical sine line field, amplitude, frequency, line thickness, optional animation.
  - `Noise Field`: Perlin/Simplex/Worley-style procedural noise variants, scale, intensity, octaves, speed, animate, distort-only.
  - `Voronoi`: cell field, edge width/color, cell-average/center-sample/gradient coloring, randomize.
  - `VHS`: distortion, noise, color bleed, scanlines, tracking error.
- Apply shared `Processing` after the selected-effect branch: invert, brightness map, edge enhance, blur/softening approximation, quantize colors, shape matching.
- Apply shared `Post-Processing` last: bloom, grain intensity/size/speed, chromatic offset, scanlines, vignette, CRT curve, phosphor.

Testing strategy:

- Add unit tests for a new `studio-effect-runtime.ts` compiler:
  - every registered effect id maps to a unique numeric shader id;
  - every visible control id from selected effect + shared Processing/Post-Processing is consumed by runtime mapping;
  - every select option changes the runtime numeric value;
  - `Custom Chars` changes a custom glyph hash/count uniform;
  - shared Processing/Post-Processing controls map to dedicated uniforms.
- Add material tests that require all new uniforms to exist and shader source to contain all effect branch function names.
- Add renderer wiring tests that `CharacterAsciiCanvas` reads `studioEffect` and updates uniforms every frame.
- Browser smoke representative interactions:
  - switching `ASCII -> Dithering -> Halftone -> VHS` changes canvas pixel hash;
  - changing a representative setting inside each family changes canvas pixel hash;
  - Processing/Post-Processing toggles change canvas pixel hash;
  - browser console has no WebGL compile errors.

Implementation checklist:

- [x] Record this correction in `tasks/lessons.md`.
- [x] Write this Phase 5F plan into `tasks/todo.md`.
- [x] Add failing runtime compiler/material/renderer tests.
- [x] Implement `components/studio/studio-effect-runtime.ts`.
- [x] Extend `character-ascii-material.ts` uniforms and shader branches for all 15 effects.
- [x] Wire `CharacterAsciiCanvas` to compile/update Studio runtime uniforms from store state.
- [x] Re-run focused tests, full Vitest, TypeScript, `git diff --check`, and production build.
- [x] Run browser pixel smoke against local `/studio`.
- [x] Update review result in this section.

Review result:

- Added `studio-effect-runtime.ts` as the contract layer between the reference editor UI and shader runtime. It assigns unique shader ids for all 15 effects, maps selected-effect controls, maps shared Processing/Post-Processing controls, converts select options to numeric uniforms, parses colors, and turns `Custom Chars` into glyph hash/count uniforms.
- Added runtime tests proving every visible Settings/Processing/Post-Processing control changes the runtime signature, every select option changes the runtime signature, every effect has a unique shader id, and no visible control is unmapped.
- Added material tests requiring reference editor uniforms and all 15 shader branch function names: ASCII, Dithering, Halftone, Matrix Rain, Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.
- Added renderer wiring contract so `CharacterAsciiCanvas` must read `studioEffect`, compile the selected effect controls, pass `studioRuntime` into `createAsciiShaderMaterial`, and update uniforms via `applyStudioRuntimeUniforms`.
- The active shader now applies the selected effect branch first, then shared Processing (`Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`), then shared Post-Processing (`Bloom`, `Grain`, `Chromatic`, `Scanlines`, `Vignette`, `CRT Curve`, `Phosphor`).
- Verification passed: focused Studio runtime/material/renderer tests, full Vitest (`42` files, `177` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser pixel smoke passed on local `/studio`: ASCII, Dithering, VHS, and Processing Invert produced four distinct canvas hashes, the canvas was nonblank, and console/WebGL/shader errors were empty. A representative Dithering `Intensity` change also produced a distinct pixel hash.

## Phase 5E Studio Effect Dynamics Correction - 2026-06-18

Live reference editor analysis performed on 2026-06-18; desktop DOM inspected before implementation.

User correction:

- Original Hanzi `Processing` rows named `Motion` or `Transform` are animation/mesh controls, not reference editor `Processing`.
- The reference editor `Processing` is the shared image/effect pipeline: `Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`.
- Motion and transform controls belong in the left `Animation` section. They must not appear in the right `Processing` section.

Effect UI/UX model to match:

- Left sidebar owns `Input`, `Effects`, and `Animation`; Hanzi keeps the existing character selector as the only intentional input difference.
- Left `Effects` is a catalogue of 15 selectable effects: `ASCII`, `Dithering`, `Halftone`, `Matrix Rain`, `Dots`, `Contour`, `Pixel Sort`, `Blockify`, `Threshold`, `Edge Detection`, `Crosshatch`, `Wave Lines`, `Noise Field`, `Voronoi`, `VHS`.
- Right `Settings` changes dynamically with the selected effect and has a section-level `Reset`.
- Right `Processing` and `Post-Processing` are common collapsible sections shown after `Settings`, not places for motion/transform controls.
- Right `Export` wording stays simple. Hanzi supports `PNG`; `GIF` and `MP4` are available only when animation is enabled/playing, because they capture an animation loop.
- Theme remains route-local light/dark, with light as default.

Dynamic Settings reference:

| Effect | Settings groups and rows | Dropdown options / dynamic rows |
| --- | --- | --- |
| ASCII | `ASCII`: `Scale`, `Spacing`, `Output Width`, `Character Set`; `Adjustments`: `Brightness`, `Contrast`, `Saturation`, `Hue Rotation`, `Sharpness`, `Gamma`; `Color`: `Mode`, `Foreground`, `Background`, `Intensity` | `Character Set`: `STANDARD`, `BLOCKS`, `BINARY`, `DETAILED`, `MINIMAL`, `ALPHABETIC`, `NUMERIC`, `MATH`, `SYMBOLS`, `CUSTOM`; selecting `CUSTOM` adds `Custom Chars`. `Mode`: `Mono`, `Original`. |
| Dithering | `Dithering`: `Algorithm`, `Intensity`, `Matrix Size`, `Modulation`; `Adjustments`: `Brightness`, `Contrast`, `Gamma`, `Sharpen`; `Color`: `Mode`, `Foreground`, `Background`; `Chromatic Effects`: `Enabled`, `Max Displace`, `Red Channel`, `Green Channel`, `Blue Channel`, `Reset` | `Algorithm`: `Floyd-Steinberg`, `Atkinson`, `Jarvis-Judice-Ninke`, `Stucki`, `Burkes`, `Sierra`, `Sierra Two-Row`, `Sierra Lite`, `Bayer 2x2`, `Bayer 4x4`, `Bayer 8x8`, `Bayer 16x16`, `Clustered Dot`, `Blue Noise`, `Interleaved Gradient`, `Crosshatch`; `Matrix Size`: `2x2 (Coarse)`, `4x4 (Medium)`, `8x8 (Fine)`, `16x16 (Very Fine)`; `Mode`: `Mono`, `Tonal`, `Palette`, `RGB`, `Original`. |
| Halftone | `Halftone`: `Shape`, `Dot Scale`, `Spacing`, `Angle`, `Invert`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode`, `Foreground`, `Background` | `Shape`: `Circle`, `Square`, `Diamond`, `Line`; `Mode`: `Mono`, `Original`. |
| Matrix Rain | `Matrix Rain`: `Character Set`, `Cell Size`, `Spacing`, `Speed`, `Trail Length`, `Direction`, `Glow`, `BG Opacity`; `Adjustments`: `Brightness`, `Contrast`, `Threshold`; `Color`: `Rain Color` | `Character Set` uses the full ASCII set list including `CUSTOM`; `Direction`: `Down`, `Up`, `Left`, `Right`. |
| Dots | `Dots`: `Shape`, `Grid Type`, `Size`, `Spacing`, `Invert`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode` | `Shape`: `Circle`, `Square`, `Diamond`; `Grid Type`: `Square Grid`, `Hexagonal Grid`; `Mode`: `Mono`, `Original`. |
| Contour | `Contour`: `Fill Mode`, `Levels`, `Line Thickness`, `Invert`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode` | `Fill Mode`: `Filled Bands`, `Lines Only`; `Mode`: `Mono`, `Original`. |
| Pixel Sort | `Pixel Sort`: `Direction`, `Sort Mode`, `Threshold`, `Streak Length`, `Intensity`, `Randomness`, `Reverse`; `Adjustments`: `Brightness`, `Contrast` | `Direction`: `Horizontal`, `Vertical`, `Diagonal`; `Sort Mode`: `Brightness`, `Hue`, `Saturation`. |
| Blockify | `Blockify`: `Style`, `Block Size`, `Border Width`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode`, `Border Color` | `Style`: `Full Blocks`, `Shaded`, `Outline`; `Mode`: `Preserve Colors`, `Grayscale`. |
| Threshold | `Threshold`: `Levels`, `Threshold Point`, `Dither`, `Invert`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode`, `Foreground`, `Background` | `Mode`: `Mono`, `Original`. |
| Edge Detection | `Edge Detection`: `Algorithm`, `Threshold`, `Line Width`, `Invert`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode`, `Edge Color`, `Background` | `Algorithm`: `Sobel`, `Prewitt`, `Laplacian`; `Mode`: `Mono`, `Original`. |
| Crosshatch | `Crosshatch`: `Density`, `Layers`, `Angle`, `Line Width`, `Randomness`, `Invert`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Line Color`, `Background` | No select controls in live reference. |
| Wave Lines | `Wave Lines`: `Line Count`, `Amplitude`, `Frequency`, `Line Thickness`, `Direction`, `Animate`; `Adjustments`: `Brightness`, `Contrast`; `Color`: `Mode` | `Direction`: `Horizontal`, `Vertical`; `Mode`: `Mono`, `Original`. |
| Noise Field | `Noise Field`: `Noise Type`, `Scale`, `Intensity`, `Octaves`, `Speed`, `Animate`, `Distort Only`; `Adjustments`: `Brightness`, `Contrast` | `Noise Type`: `Perlin`, `Simplex`, `Worley`. |
| Voronoi | `Voronoi`: `Cell Size`, `Edge Width`, `Edge Color`, `Color Mode`, `Randomize`; `Adjustments`: `Brightness`, `Contrast` | `Edge Color`: `Black`, `White`, `Darkened`; `Color Mode`: `Cell Average`, `Center Sample`, `Gradient`. |
| VHS | `VHS`: `Distortion`, `Noise`, `Color Bleed`, `Scanlines`, `Tracking Error`; `Adjustments`: `Brightness`, `Contrast` | No select controls in live reference. |

Shared sections reference:

- `Processing`: `Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`.
- `Post-Processing`: `Bloom`, `Grain` group with `Intensity`, `Size`, `Speed`, then `Chromatic`, `Scanlines`, `Vignette`, `CRT Curve`, `Phosphor`.

Implementation checklist:

- [x] Record the Processing-vs-Animation correction in `tasks/lessons.md`.
- [x] Re-analyze live reference editor effect settings, dropdown options, and dynamic rows before implementation.
- [x] Write this plan into `tasks/todo.md` before implementation.
- [x] Add failing contracts that `Motion`/`Transform` controls live under left `Animation` and do not appear in right `Processing`.
- [x] Add failing contracts for live reference editor setting names/options: ASCII `CUSTOM`, dynamic `Custom Chars`, `Color` -> `Mode`, and richer per-effect dropdown options.
- [x] Implement left `Animation` transform rows: `Y Rotate`, `X Rotate`, `Depth`, `Scale`, plus a grouped transform reset.
- [x] Implement `CUSTOM` Character Set and `Custom Chars` dynamic row while preserving current font stack and existing character selector input.
- [x] Update effect catalogue metadata to match live reference editor option lists and labels.
- [x] Verify with focused tests, full Vitest, TypeScript, `git diff --check`, production build, and browser operation checks against reference editor.

Review result:

- Reconfirmed live reference editor Settings behavior before implementation: per-effect dynamic rows, full dropdown option lists, ASCII `CUSTOM -> Custom Chars`, and shared Processing/Post-Processing sections.
- Corrected ownership: `Motion` and `Transform` are now left `Animation` groups. `Y Rotate`, `X Rotate`, `Depth`, `Scale`, and `Reset Transform` are visible there on desktop and mobile; right `Processing` has no animation/mesh controls.
- ASCII controls now match the live reference labels: `Character Set` includes `CUSTOM`, selecting it shows `Custom Chars`, and the `Color` group uses `Mode` instead of `Color Mode`.
- Effect metadata now includes the live reference editor dropdown options, including Dithering algorithms, Matrix Size variants, Halftone `Line`, Dots `Hexagonal Grid`, Pixel Sort `Diagonal`, Blockify `Shaded/Grayscale`, Noise Field `Worley`, and Voronoi `Darkened/Center Sample/Gradient`.
- Common `Processing` remains `Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`. Common `Post-Processing` now exposes `Bloom`, `Grain` with `Intensity/Size/Speed`, then `Chromatic`, `Scanlines`, `Vignette`, `CRT Curve`, and `Phosphor`.
- Verification passed: focused reference editor follow-up contract, adjacent ASCII material/state tests, full Vitest (`41` files, `171` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser smoke passed on local `/studio`: desktop and mobile canvases rendered nonblank, `CUSTOM` dropdown produced `Custom Chars`, Dithering dynamic options opened with live option names, Post-Processing showed `Grain`, and browser console errors were empty.

## Phase 5D Follow-Up Studio Parity - 2026-06-18

- [x] Inspect reference editor effect catalogue settings and Character Set dropdown behavior.
- [x] Add failing contracts for the full left Effects catalogue, left Animation panel, removed Presets panel, right Settings reset, the reference editor's ASCII labels, Processing/Post-Processing parity, and gated export formats.
- [x] Implement left `Effects` catalogue with reference editor names and active markers.
- [x] Move animation controls to the left as `Animation`; remove left `Presets`.
- [x] Replace native Character Set select with reference editor-style dropdown and option set: `STANDARD`, `BLOCKS`, `BINARY`, `DETAILED`, `MINIMAL`, `ALPHABETIC`, `NUMERIC`, `MATH`, `SYMBOLS`.
- [x] Add right-side whole-section `Reset` and match ASCII control names to reference editor.
- [x] Match Processing and Post-Processing settings content/structure to reference editor for the selected effect.
- [x] Add GIF and MP4 export options when animation is enabled; keep only PNG when animation is disabled.
- [x] Simplify export wording.
- [x] Verify with focused tests, full tests, typecheck, build, and browser comparison.

Review result:

- The reference editor Character Set dropdown now matches the reference option set and menu behavior: `STANDARD`, `BLOCKS`, `BINARY`, `DETAILED`, `MINIMAL`, `ALPHABETIC`, `NUMERIC`, `MATH`, `SYMBOLS`; Escape/outside click closes the menu.
- `/studio` left panel now uses `Input`, `Effects`, and `Animation`; left `Presets` was removed.
- Right `Settings` has a section-level `Reset`, the reference editor's ASCII labels, selected-effect setting rows, and the live reference editor's Processing/Post-Processing rows.
- Export now shows PNG/GIF/Video only while animation is playing and falls back to PNG-only when animation is paused; export wording is `High quality image`.
- GIF export uses `gifenc` to capture an animated canvas loop; MP4 export uses browser `MediaRecorder` when `video/mp4` is available. Both were live-smoked through browser downloads.
- Verified with full Vitest (`41` files, `170` tests), `tsc --noEmit`, `git diff --check`, `pnpm build`, and Playwright smoke checks on desktop and mobile.

## Phase 5D Studio Refactor Planning - 2026-06-18

- [x] Inspect current `/studio` architecture and dirty worktree without touching implementation files.
- [x] Analyze reference editor desktop layout, mobile layout, dark terminal tokens, panels, and interaction model.
- [x] Capture user correction: do not copy reference editor fonts; preserve the current configured font stack.
- [x] Capture user correction: only `/studio` is in scope; do not redesign `/`.
- [x] Capture user correction: effect controller UI should follow the reference editor's design and support both light/dark themes.
- [x] Capture user correction: `/studio` theme default should be light, with dark still supported.
- [x] Add detailed plan: `tasks/v2.1/phase-5d-studio-effects-refactor-plan.md`.
- [x] User approval checkpoint before implementation.
- [x] Phase 5D implementation in progress: execute all plan items, compare `/studio` operation against reference editor, and keep iterating until aligned except for Character selector input.

Review result:

- The reference editor desktop target verified live on 2026-06-18: `100dvh` editor with left 18rem sidebar, center preview, right 22rem settings/export sidebar, compact `+`/`-` sections, row-based controls, and a terminal-style light/dark color system.
- The reference editor mobile target verified live on 2026-06-18: brand header, center preview, bottom tabs for Input/Effects/Presets/Export, floating settings button, and settings bottom sheet.
- Hanzi adaptation: Input uses the existing `CharacterPanel`/character selector instead of reference editor file upload.
- Hanzi adaptation: active effect surface is ASCII-only; remove old non-ASCII Morph/Pattern/Shader Layer/Randomize UI from active `/studio`.
- Hanzi adaptation: preserve `theme/font.ts` current fonts; no IBM Plex Mono / JetBrains Mono import.
- Hanzi adaptation: effect controllers use reference-style compact sections/rows/ranges/selects/grids, with route-local light default plus dark theme support.
- Implementation added the route-local terminal shell, desktop left/preview/right layout, mobile bottom tabs, mobile settings sheet, light/dark theme toggle, compact controller primitives, ASCII-only presets/effects, right-side Settings/Processing/Post-Processing/Export panels, canvas fill fix, and clean `hanzi-studio-ascii-v1` active persistence.
- Browser operation comparison passed against the reference editor's live layout except for the intended Hanzi character selector input: desktop dimensions matched 288px/flex/352px, theme toggle changed light/dark, presets expanded and applied, charset select changed to `matrix`, export panel was visible, canvas filled the center preview, mobile tabs worked, and settings sheet opened.
- Verification passed: Phase 5D focused tests, full `pnpm test` (40 files / 165 tests), `pnpm exec tsc --noEmit`, and `pnpm run build`.

## Phase 5C True 3D Shader Art Engine Re-Plan - 2026-06-18

- [x] Stop treating the Phase 5B fullscreen Character Surface as the primary solution.
- [x] Research online architecture references for SVG-to-3D geometry, shader uniforms, offscreen render targets, ASCII shader/post-processing, and CRT finishing effects.
- [x] Inspect the repo for reusable true-3D seams: `CharacterMesh`, `character-mesh-geometry`, and mesh `shader-material`.
- [x] Capture the correction in `tasks/lessons.md`.
- [x] Add Phase 5C research/design package: `tasks/v2.1/phase-5c-true-3d-shader-art-engine.md`.
- [x] User correction: narrow Phase 5C's first visible effect to 3D ASCII Effect, using Efecto as the target reference.
- [x] User correction: adopt the Efecto UI layout: left panel for selected text/color/material/interaction, center canvas, right panel for effect/ASCII/style settings/post process.
- [x] User checkpoint: approved starting implementation with Taste Skill for frontend design.
- [x] Add Phase 5C Slice 1 implementation plan: `tasks/v2.1/phase-5c-slice-1-workbench-layout.md`.
- [x] Slice 1 Task 1: add failing workbench layout contract test.
- [x] Slice 1 Task 2: implement three-column `/studio` shell.
- [x] Slice 1 Task 3: split existing controls into left/right ownership groups.
- [x] Slice 1 Task 4: verify focused test, TypeScript, full tests, lint, build, and diff check.
- [x] Add Phase 5C Slices 2-6 implementation plan: `tasks/v2.1/phase-5c-slices-2-6-3d-ascii-renderer.md`.
- [x] Slices 2-6 Task 1: add ASCII store contract and default mesh auto-spin.
- [x] Slices 2-6 Task 2: implement procedural ASCII shader material.
- [x] Slices 2-6 Task 3: replace active center canvas with 3D ASCII mesh renderer.
- [x] Slices 2-6 Task 4: add right-panel ASCII and ASCII Style controls.
- [x] Slices 2-6 Task 5: verify ASCII effect and mesh auto-spin by tests plus manual QA checklist.

Review result:

- Existing Phase 5B work produced a stronger flat surface pipeline but does not satisfy the requested 3D art direction.
- Online research supports a true Three.js scene graph approach: `SVGLoader` -> `Shape[]`/stroke geometry -> `ExtrudeGeometry` -> `useFrame` time/rotation updates -> offscreen color/depth render -> ASCII shader/post effect.
- Efecto's relevant model is 3D input rendered through real-time ASCII shader/post-processing: cell grid, luminance sampling, procedural 5x7 glyphs, ASCII style sets, palette/bloom/CRT finishing.
- Efecto's relevant UI model is a workbench with the canvas in the center and controls split by ownership: source/object controls on the left, effect/ASCII/post controls on the right.
- The repo already has dormant useful seams for SVG extrusion, Y-axis rotation, `u_time`, `u_mouse`, and displacement-aware mesh shaders; these should be salvaged, not restored blindly.
- Slice 1 implementation added the three-column `/studio` workbench shell, split current controls into left/right ownership groups, and kept the current Character Surface renderer active until the 3D ASCII prototype slice.
- Slices 2-6 implementation replaced the active center canvas with `CharacterAsciiCanvas`, added procedural ASCII shader material, persisted ASCII controls, enabled default Y-axis mesh auto-spin, and added right-panel ASCII/ASCII Style controls.
- ASCII verification is code-backed: `StudioCanvas` now mounts `CharacterAsciiCanvas`; `CharacterAsciiCanvas` parses selected SVG with `SVGLoader`, uses `createCharacterMeshGeometries`, applies `createAsciiShaderMaterial`, and updates `groupRef.current.rotation.y` when `mesh.autoRotate` and animation playback are active.
- Verification passed: new ASCII state/material/renderer/panel tests, focused workbench/panel contract tests, `pnpm exec tsc --noEmit`, full `pnpm test`, `pnpm lint` with two existing warnings, `pnpm build`, and `git diff --check`.
- Manual QA next step: open `/studio` and confirm visible ASCII glyph/cell rendering plus Y-axis auto-spin.

## Phase 5B Remaining Slices Execution - 2026-06-18

- [x] Slice 3: Shader Layer stack state with compact row UI and detail surface.
- [x] Slice 4: SDF Relief character effects from derived glyph buffers.
- [x] Slice 5: Print damage effects only through enabled controller-backed rows.
- [x] Slice 6: Chrome/glass/material effects while preserving readability.
- [x] Slice 7: Animation panel with freeze-safe effective time.
- [x] Slice 8: Pattern modulation and Post FX foundation.
- [x] Slice 9: Feedback simulation contract with safe disabled/fallback behavior.
- [x] Slice 10: Coherent seeded Randomize presets and final manual QA checklist.
- [x] Final verification: focused tests, TypeScript, full tests, lint, diff check, and `/studio` browser smoke.

Review result:

- Added persisted `shaderLayers` with enabled/order/intensity/blend/lock/target/effect params and compact Shader panel rows backed by `effect-registry.ts`.
- Added Shader Layer detail surface so params are edited outside compact rows.
- Added SDF relief shader branches for `ink-graphite`, `stone-relief`, `paper-emboss`, `black-lacquer`, `edge-wear`, and `contour-topography`.
- Added print-damage shader branches for `halftone-ink`, `dithered-reveal`, `damaged-sensor`, `scratch-field`, `scanline-mask`, and `technical-hatch`; disabled rows do not compile into active shader uniforms.
- Added chrome/glass/material shader branches for `fluid-chrome`, `frosted-fluted-glass`, `holofoil`, and `watercolor-paper`.
- Added Animation panel and freeze-safe `u_timeEffective`; speed `0` or paused playback freezes time-driven shader branches.
- Added compact Post FX stack foundation with stable and experimental rows. These remain controller-backed data rows, not hidden global effects.
- Added feedback simulation contract module with disabled/fallback/reset/freeze semantics. Heavy render-target simulation remains gated behind explicit experimental contract paths.
- Added coherent seeded Randomize presets: Graphite Relief, Wet Ink Bloom, Carved Lacquer, Digital Slice, Oxidized Metal, Chrome Glass, and Watercolor Paper.
- Verification passed: focused tests, `pnpm exec tsc --noEmit`, full `pnpm test`, `git diff --check`, and `pnpm lint` with warnings only in existing Phase 5 files.
- Browser smoke passed on `https://localhost:3000/studio`: canvas host and canvas were present, Shader/Animation/Post FX/Randomize controls were present, and browser error logs were empty. Existing Three.js Clock deprecation warning remains.
- Manual QA checklist: confirm Shader Layer intensity `0/50/100` changes the character, Randomize same seed reproduces unlocked rows, Animation speed `0` freezes visible animated effects, Post FX rows stay compact, and no print/grid/scanline/hatch marks appear unless an enabled row controls them.

## Phase 5B Slice 2 - Derived Glyph Buffers - 2026-06-18

Implementation plan:

- [x] Add failing tests for deriving a glyph distance pack from mask alpha data: mask, SDF, edge, inside/outside distance, gradient, height, normal, flow, and scatter.
- [x] Add failing tests for runtime resolution caps and fallback behavior when source data is invalid or unavailable.
- [x] Add failing material tests that derived glyph textures bind to stable uniforms with availability and resolution metadata.
- [x] Implement `components/studio/glyph-derived-buffers.ts` with CPU-derived textures and a neutral fallback pack.
- [x] Wire `CharacterSurfaceCanvas` so the current rasterized SVG mask produces a derived glyph pack for the active material.
- [x] Keep visual output unchanged in this slice; derived buffers are data for later tracer effects.
- [x] Verify with focused derived-buffer and surface-material tests, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm lint`, and `git diff --check`.
- [x] Start the dev server and hand off a manual `/studio` smoke checklist.

Review result:

- Added `components/studio/glyph-derived-buffers.ts` with CPU-derived SDF/edge/height/normal/flow/scatter textures from the current rasterized SVG mask alpha.
- Added runtime resolution capping at 512px on the longest side, aspect-ratio-preserving downsampling, and neutral fallback packs for invalid or unreadable mask data.
- Added `components/studio/glyph-derived-buffers.test.ts` for derived sample semantics, texture dimensions, resolution caps, fallback metadata, and disposal.
- `CharacterSurfaceCanvas` now derives a glyph distance pack from the same mask canvas used for the active selected SVG and disposes old derived textures when the mask changes.
- `surface-shader-material.ts` now binds derived glyph textures to stable uniforms: `u_glyphMask`, `u_glyphSdf`, `u_glyphEdge`, `u_glyphHeight`, `u_glyphNormal`, `u_glyphFlow`, `u_glyphScatter`, `u_glyphBufferAvailable`, and `u_glyphBufferResolution`.
- Visual output is intentionally unchanged in this slice; tracer effects consume these buffers in later slices.
- Verification passed: focused derived-buffer tests, focused surface-material tests, `pnpm exec tsc --noEmit`, full `pnpm test`, `git diff --check`, and `pnpm lint` with warnings only in existing Phase 5 files.
- Browser smoke passed on `https://localhost:3000/studio`: Studio canvas host and canvas were present, browser error logs were empty, and the only warning was the existing Three.js Clock deprecation warning.
- Next step: implement Phase 5B Slice 3, Shader Layer Stack State And Compact Detail Surface.

## Phase 5B Slice 1 - Effect Registry And Catalogue Tests - 2026-06-18

Implementation plan:

- [x] Add failing registry contract tests for required effect fields, UI param schemas, defaults, randomize bounds, ports, implementation metadata, animation flags, and component graph semantics.
- [x] Add failing tests for the locked shared GLSL primitive set and Shader Layer primitive declarations.
- [x] Add failing tests for the required Phase 5B candidate effects: `fluid-chrome`, `frosted-fluted-glass`, `watercolor-paper`, `holofoil`, `damaged-sensor`, `dithered-reveal`, `raymarched-interior`, and `shadergpt-sketch`.
- [x] Add failing tests that Experimental and development-only effects are excluded from default randomization.
- [x] Implement `components/studio/effect-registry.ts` as an additive contract registry for Morph, Shader, Pattern, Post, and Animation-capable effects.
- [x] Keep this slice contract-only: do not modify renderer output or Studio panel behavior.
- [x] Verify with focused registry tests, `pnpm exec tsc --noEmit`, `pnpm test`, and `git diff --check`.
- [x] Record the review result and next concrete step.

Review result:

- Added `components/studio/effect-registry.ts` with the Phase 5B effect contract, locked Shader Layer primitive set, candidate effects, component graph metadata, reactivity flags, implementation metadata, and registry validation.
- Added `components/studio/effect-registry.test.ts` covering registry validation, primitive declarations, required Phase 5B candidates, visible-effect UI params/defaults, component graph metadata, and default randomization exclusions.
- Confirmed `shadergpt-sketch` is development-only and registered as `feedback-simulation` because it consumes previous-frame data.
- This slice does not change renderer output, Studio panel state, or persisted store shape.
- Verification passed: focused registry test, `pnpm exec tsc --noEmit`, full `pnpm test`, `git diff --check`, and `pnpm lint` with warnings only in existing Phase 5 files.
- Next step: implement Phase 5B Slice 2, Derived Glyph Buffers.

## Phase 5B Shader-First Effect Engine Planning - 2026-06-17

- [x] Research broader shader/effect engine references beyond the current Phase 5 categories.
- [x] Compare external patterns from ISF, Hydra, Material Maker, LYGIA, glslify, postprocessing, SDF/MSDF tools, and WebGL simulation examples.
- [x] Research ShaderGPT and Shaders.com for additional shader implementation patterns, component graph structure, dynamic params, masking, and preset taxonomy.
- [x] Research additional art-effect confidence references: SDF gradients/bevels, MSDF/TinySDF glyph buffers, ordered/blue-noise dithering, fluid/advection, reaction-diffusion, raymarching, refraction/dispersion, ISF multipass, Hydra function roles, and procedural material node graphs.
- [x] Record the core correction: more isolated shader presets are not enough; the engine needs derived glyph buffers, a catalogue registry, and a fixed render graph.
- [x] Define controller-backed effect rules so no grid, paper, scanline, shadow, feedback, or background mark can render without a panel row.
- [x] Define an Animation panel direction where `Speed = 0` freezes all time-based output.
- [x] Define visible numeric-seed Randomize behavior with family amounts and lock preservation.
- [x] Lock Phase 5B requirements: shared GLSL primitive layer for all Shader Layers, expanded shader catalogue, and component-graph architecture with stacking/nesting/blend/mask/reactive/dynamic/SDF semantics.
- [x] Lock Effect Layer panel UX to compact row UI instead of expanded row UI.
- [x] Add the Phase 5B plan to the v2.1 planning package.
- [x] Update the v2.1 README so Phase 5B was listed as the next overlay at that time and SDF is treated as a derived glyph buffer, not a deferred side topic.
- [x] Rewrite Phase 5B implementation slices around registry-first, derived-buffer-second, and four tracer bullets before broad catalogue expansion.

Review result:

- Added `tasks/v2.1/phase-5b-shader-first-effect-engine-plan.md`.
- The next implementation order is Effect Registry -> Derived Glyph Buffers -> Shader Layer Stack -> Tracer A SDF Relief -> Tracer B Print Damage -> Tracer C Chrome/Glass -> Animation -> Pattern/Post foundation -> Tracer D Experimental Feedback -> coherent Randomize presets.
- Shader expansion should include material, SDF/edge, depth/light, procedural texture, energy/distortion, simulation/feedback, post/screen, and background shade families.
- ShaderGPT research added reusable primitive targets: `u_time`, `u_mouse`, `u_resolution`, FBM/noise, palette, dither, scanline, channel offset, UV refraction, smoke/fire/aurora fields, and raymarching as reference-only.
- Shaders.com research added registry fields: `effectRole`, `inputPorts`, `outputPorts`, `maskSource`, dynamic param drivers, and universal blend/opacity/visibility semantics.
- Additional confidence research narrowed the visual strategy to four tracer bullets: SDF Relief Character, Print Damage Character, Chrome/Glass Character, and Experimental Feedback Character.
- The plan now separates architecture confidence from reference-level visual fidelity risk: direction confidence is 90%, exact one-pass reference match is 78%, and the four tracer bullets should raise practical art-engine confidence to 86% before broad catalogue expansion.
- Phase 5B became tracer-bullet-first instead of broad-catalogue-first. Broad shader expansion waits until SDF relief, print damage, chrome/glass, and experimental feedback paths are inspectable.
- Additional shader candidates added: Fluid Chrome, Frosted/Fluted Glass, Watercolor Paper, Holofoil, Damaged Sensor, Dithered Reveal, Raymarched Interior, and development-only ShaderGPT Sketch.
- User locked the implementation direction: every Shader Layer must compile against the shared GLSL primitive layer, the new shader candidates must be in the registry, and the engine must use component graph metadata for stacking, nesting, blend/mask, reactive props, dynamic props, and SDF/custom SVG shape support.
- User corrected the Effect Layer panel UX: Morph, Shader, Pattern, and Post stacks must use compact rows; advanced params open in a separate detail surface instead of expanding rows.
- LYGIA, glslify, and postprocessing remain implementation helpers. Hanzi Studio's product model remains the selected SVG-driven Character Surface with Morph Stack, Shader Layers, Pattern Layers, Animation, and Randomize controls.
- Next step: implement Phase 5B Slice 1, the Effect Registry and Catalogue Tests, before changing the renderer.

## Phase 5 Finish - Strong Visible Layered Art Runtime - 2026-06-17

- [x] Add failing tests that the default Studio state opens with a complete visible art stack: Morph layers, foreground depth/gradient ink, background paper color, and three Pattern Layers mapped to foreground, background, and Morph Stack.
- [x] Add failing tests that randomizing from an empty Pattern Layer state creates a complete lock-aware art stack instead of leaving Pattern Layers empty.
- [x] Add failing shader contract tests that forbid hidden shader effects without matching Studio panel controllers.
- [x] Implement strong default Morph intensities, Surface Shader styles, and Pattern Layer defaults.
- [x] Implement Randomize art preset generation for Morph/Shaders/Patterns while preserving existing locked-layer behavior.
- [x] Strengthen `CharacterSurfaceMaterial` using only controller-backed effects: foreground depth lighting, Morph Stack deformation, and Pattern Layer blending.
- [x] Verify focused tests, TypeScript, full tests, `git diff --check`, and fresh browser console/UI state.

Review result:

- Default Studio state now opens with a stronger art stack: depth-lit black ink, warm paper background, three Pattern Layers, and non-uniform Morph intensities.
- Randomize now fills an empty Pattern Layer stack and varies shader colors, gradient settings, pattern targets, blend modes, and intensities while preserving locks.
- `CharacterSurfaceMaterial` now uses only controller-backed shader effects. Hidden procedural grid/paper/shadow/trail effects were removed because they did not have matching panel controls.
- Shader panel now includes foreground effect controls for Depth Strength, Highlight, Rim Light, and Edge Softness, wired to material uniforms.
- Browser verification: `/studio` reloads without console errors, and opening the Shader panel shows Depth Strength, Highlight, Rim Light, and Edge Softness controls.
- Automated verification passed: focused tests, TypeScript, and full Vitest suite.

## Phase 5 Runtime Bug Fix - Morph Uniform Vector Shape - 2026-06-17

- [x] Reproduce the browser runtime error from `/studio`: `firstElem.toArray is not a function`.
- [x] Trace root cause to `u_morphLayerParams`, a GLSL `vec4[]` uniform receiving plain nested arrays.
- [x] Add a regression test requiring `u_morphLayerParams` entries to expose `toArray()`.
- [x] Convert Morph runtime params to `Vector4[]` at the `CharacterSurfaceMaterial` uniform boundary.
- [x] Verify focused tests, TypeScript, full tests, `git diff --check`, and dev server browser logs.

Review result:

- Root cause: Three.js flattens `vec4[]` uniform values by calling `firstElem.toArray()`. The Phase 5 Morph runtime compiler correctly produced plain numeric tuples, but `CharacterSurfaceMaterial` passed those tuples directly to the shader uniform.
- Fix: keep the compiler pure, and convert the tuples to `Vector4` objects inside `surface-shader-material.ts`.
- Added a lesson to prevent future `vec4[]` uniforms from using plain nested number arrays.
- Browser verification: a fresh `https://localhost:3000/studio` load produced no console errors and the dev server logged `GET /studio 200`; only the existing Three.js Clock deprecation warning remains.

## Phase 5 Implementation Slice 4 - Reorder And Randomize Family Controls - 2026-06-17

- [x] Add failing tests for family-scoped randomization: Morph, Shaders, Patterns, and Include Experimental.
- [x] Add failing tests for Pattern Layer reorder state.
- [x] Implement `randomizeMorphPreset` family options and `reorderPatternLayer`.
- [x] Add failing tests that Morph and Pattern rows expose reorder controls.
- [x] Add failing tests that a Randomize panel controls seed and family toggles.
- [x] Implement Morph/Pattern row up/down reorder buttons.
- [x] Implement `RandomizePanel` and wire it into Studio controls without creating a new design system.
- [x] Verify with focused tests, TypeScript, full tests, and `git diff --check`.
- [x] Record review result and next implementation slice.

Implementation boundary:

- Reorder uses explicit up/down buttons for this slice. Drag reorder can follow after behavior is proven.
- Randomize family controls scope the existing deterministic generator. Coherent named art presets remain a later refinement.
- Locks continue to protect locked Morph, Shader, and Pattern rows.

Review result:

- `randomizeMorphPreset` now accepts family scopes for Morph, Shaders, and Patterns while preserving the old default of randomizing all families.
- Added `reorderPatternLayer` to match existing Morph reorder behavior.
- Morph and Pattern rows now expose up/down reorder buttons with lock and boundary disabling.
- Added `RandomizePanel` with seed, Next seed, Include Experimental, and Morph/Shaders/Patterns toggles.
- Added `randomize` to the active Studio panel set and wired it into `StudioControls`.
- Verification passed: focused Phase 5 Slice 4 Vitest files, `pnpm exec tsc --noEmit`, `pnpm test`, and `git diff --check`.
- Next step: start manual `/studio` visual QA, then fix any UI overlap, non-visible shader effect, or interaction defects before closing Phase 5.

## Phase 5 Implementation Slice 3 - Morph Stack Runtime And Row Controls - 2026-06-17

- [x] Add failing tests for stable Morph Stack runtime compilation: layer kind, intensity, params, enabled filtering, and cap.
- [x] Bind compiled Morph Stack layers into `CharacterSurfaceMaterial` uniforms.
- [x] Implement shader-side stable Morph effects for coordinate warp, mask compression, pixel grid, and surface-depth lighting.
- [x] Add failing tests that Morph Stack panel is no longer empty and controls active Morph Stack state.
- [x] Implement `MorphStackPanel` with add, enable, intensity, lock, delete, layer type, and visible number/select params.
- [x] Wire `MorphStackPanel` into `StudioControls`.
- [x] Verify with focused tests, TypeScript, full tests, and `git diff --check`.
- [x] Record review result and next implementation slice.

Implementation boundary:

- Stable layer runtime covers `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.
- Experimental `vector-pre-morph`, `pixel-sort-heavy`, and `feedback-advection` stay deferred until the stable visible runtime is inspectable.
- This slice does not add drag reorder UI yet; existing store reorder remains available for a later row interaction pass.

Review result:

- Added `morph-layer-runtime` compiler with fixed eight-layer cap, stable Morph kind mapping, intensity clamping, params packing, disabled-layer filtering, and experimental-layer exclusion.
- `CharacterSurfaceMaterial` now receives `morphLayers`, binds Morph runtime uniforms, and applies stable Morph Stack effects in the active shader.
- Coordinate runtime now covers sine bend, swirl well, curl flow, band slice, and pixelate grid sampling.
- Mask runtime now applies ink compression before alpha composition.
- Surface runtime now applies surface-depth lighting on the foreground layer.
- Added `MorphStackPanel` and wired it into `StudioControls`, replacing the empty Morph Stack panel.
- Morph rows now expose Add, Enabled, Layer type, Intensity, Lock, Delete, and visible number/select params.
- Verification passed: focused Phase 5 Slice 3 Vitest files, `pnpm exec tsc --noEmit`, `pnpm test`, and `git diff --check`.
- Next slice: add reorder controls and Randomize family controls for Morph/Shaders/Patterns, then run manual `/studio` visual QA checklist.

## Phase 5 Implementation Slice 2 - Multi-Pattern Blending And Pattern Panel Rows - 2026-06-17

- [x] Add failing tests for fixed-cap multi-pattern shader uniforms and blend functions.
- [x] Replace the `CharacterSurfaceMaterial` Pattern compatibility adapter with real three-slot foreground/background/morph pattern accumulation.
- [x] Add failing tests that Pattern Layers panel is no longer empty and controls active Pattern Layer state.
- [x] Implement `PatternLayerPanel` with add, enable, target, intensity, blend mode, lock, and delete controls.
- [x] Wire `PatternLayerPanel` into `StudioControls`.
- [x] Verify with focused tests, TypeScript, full tests, and `git diff --check`.
- [x] Record review result and next implementation slice.

Implementation boundary:

- This slice makes multiple Pattern Layers visibly stack in the active Character Surface shader.
- Built-in/local-file source picking remains basic; richer swatch/source browser can follow after row controls are visible.
- Morph Stack runtime deformation controls are not part of this slice.

Review result:

- `CharacterSurfaceMaterial` now binds fixed three-slot Pattern Layer uniforms for foreground, background, and Morph Stack targets.
- Foreground and background Pattern Layers apply ordered blend modes: normal, multiply, screen, overlay, and soft-light.
- Morph Stack Pattern Layers accumulate UV offsets from up to three active pattern textures, scaled by each layer intensity.
- Added `PatternLayerPanel` and wired it into `StudioControls`, replacing the empty Pattern Layers panel.
- Pattern rows now expose Add, Enabled, Target, Blend, Intensity, Lock, Delete, and a compact built-in pattern swatch selector.
- Verification passed: focused Phase 5 Slice 2 Vitest files, `pnpm exec tsc --noEmit`, `pnpm test`, and `git diff --check`.
- Next slice: add Morph Stack visible runtime controls and row intensity UI, then connect Morph layer params to the Character Surface shader.

## Phase 5 Implementation Slice 1 - Layer Contract And Stackable State - 2026-06-17

- [x] Add tests for a shared layer compositing contract: blend modes, phase order, intensity clamping, and active layer caps.
- [x] Implement `components/studio/layer-compositing.ts` as the common contract helper for Morph, Surface Shader, Pattern, and Post Surface rows.
- [x] Add Morph Stack layer `intensity` state with sanitization and lock-aware randomization behavior.
- [x] Add Pattern Layer `enabled`, `intensity`, and `blendMode` state with sanitization.
- [x] Change Pattern Layer texture resolution from first-valid-per-target to ordered active layer accumulation per target.
- [x] Verify with focused tests, TypeScript, and `git diff --check`.
- [x] Record review result and next implementation slice.

Implementation boundary:

- This slice creates the shared behavior foundation for the visible layer-stack UI.
- It does not yet convert Surface Shader into a fully stackable UI panel.
- It does not yet add postprocessing controls to the canvas.
- It does not remove `glslify` yet; decide after the first shader/include implementation slice proves whether it is actually needed.

Review result:

- Added a shared layer compositing helper with the Phase 5 stack caps, blend mode whitelist, intensity clamping, and fixed render phase ordering.
- Added `intensity` to Morph Stack layers with persisted-state sanitization.
- Added `enabled`, `intensity`, and `blendMode` to Pattern Layers with persisted-state sanitization and lock-aware randomization preserving locked rows.
- Pattern texture resolution now returns ordered active texture targets per foreground/background/morph target instead of only the first valid texture.
- `CharacterSurfaceMaterial` now accepts the new Pattern texture target arrays through a compatibility adapter. Full multi-pattern shader blending is the next implementation slice.
- Verification passed: focused Phase 5 Slice 1 Vitest files, `pnpm exec tsc --noEmit`, `pnpm test`, and `git diff --check`.
- Next slice: replace the compatibility adapter with real fixed-cap multi-pattern blending in the Character Surface shader, then expose row controls in the Pattern Layer panel.

## Phase 5 Layer Compositing Feasibility - 2026-06-17

- [x] Inspect the reference image expectation: Morph, Shader, and Pattern effects should stack in visible rows with per-layer strength, lock, order, and blend controls.
- [x] Compare that expectation with current v2.1 state and renderer.
- [x] Record the feasibility boundary: user-visible stackable layers compile into fixed Character Surface render phases.
- [x] Document why arbitrary interleaving across all layer kinds is not the Phase 5 target.
- [x] Add implementation guidelines for shared layer contract, intensity semantics, blend modes, caps, randomization, and Pattern Layer accumulation.

Review result:

- The direction is feasible, but it needs a compositing contract before UI implementation.
- Current Morph Stack state is closest to the target. It needs a global `intensity` field and visible runtime mapping.
- Current Surface Shader state is not yet stackable. Phase 5 should convert it into stackable foreground/background shader layers, or add stackable child layers under fixed foreground/background roots.
- Current Pattern Layers are metadata stacks, but runtime uses the first valid texture per target. Phase 5 must blend all valid Pattern Layers for a target so stacked rows visually accumulate.
- The user-facing model should match the image: separate Morph Stack, Surface Shader Layers, and Pattern Layers panels, each with compact row controls for visibility, order where meaningful, intensity, blend mode where meaningful, lock, and a detail affordance for params.
- The runtime model should remain phase-compiled: pre-raster -> raster mask -> coordinate morph -> mask/morphology -> surface shader stacks -> pattern modulation -> final composite -> optional post surface.
- Keep Pattern Layer max at three for Phase 5 unless texture-slot tests prove a higher cap is safe. The immediate requirement is real stacking/blending of the three layers.
- Added `tasks/v2.1/phase-5-layer-compositing-guidelines.md` as the plan guideline for this correction.

## Phase 5A Package Capability Research - 2026-06-17

- [x] Install or inspect `lygia`, `glslify`, `postprocessing`, and `@react-three/postprocessing` in a contained tooling spike.
- [x] Verify whether `glslify` can resolve LYGIA includes under the current Next/Turbopack setup without brittle custom build steps.
- [x] Map LYGIA modules to Character Surface shape targets: coordinate distortion, generative/noise fields, morphological filters, mask/SDF operations, surface-depth lighting, and color/blend helpers.
- [x] Map LYGIA modules to Character Surface shade targets: foreground gradient/color transforms, depth/rim/highlight lighting, palette/tonemap helpers, and mask-preserving filters.
- [x] Evaluate postprocessing effects for mask-safe enhancement versus risky global blur/crop/distortion.
- [x] Decide package-by-package whether to adopt now, use as reference, or defer with fallback.
- [x] Record which package capabilities become user-facing controls in Morph Stack, Pattern Layers, Shader controls, and Randomize controls.
- [x] Only after this research record is complete, begin production Phase 5 implementation.

Research result:

- Added Phase 5A dependencies: `lygia@1.4.1`, `glslify@7.1.1`, `postprocessing@6.39.1`, and `@react-three/postprocessing@3.0.4`.
- `glslify` does not directly resolve LYGIA's `#include` graph. `#pragma glslify: ... = require('lygia/...')` fails because LYGIA GLSL files do not export glslify symbols, and raw `#include "lygia/..."` is preserved instead of expanded.
- LYGIA's documented GLSL path requires project-side `#include` resolution. A local recursive include-resolver spike successfully expanded `snoise`, `pincushion`, `dilation`, `fresnel`, and `tonemapACES` to one shader string with no remaining `#include`.
- Implementation decision: adopt `lygia` now, but consume GLSL through a local include resolver added to the existing `loaders/glsl-source-loader.cjs` path or a sibling helper. Use `glslify` only as auxiliary tooling for non-LYGIA glslify modules if needed, not as the primary LYGIA resolver.
- Do not adopt `resolve-lygia` now. It is older, Patron-licensed, and primarily mirrors the online resolver path; a tiny local resolver better fits Next/Turbopack and avoids network dependency.
- Adopt `postprocessing` / `@react-three/postprocessing` now for Surface-level enhancement after the Character Surface material. It should not become the primary Morph Stack deformation engine.

Useful LYGIA modules for shape / Morph Stack:

- Coordinate and lens deformation: `distort/pincushion.glsl`, `distort/barrel.glsl`, `space/rotate.glsl`, `space/cart2polar.glsl`, `space/kaleidoscope.glsl`.
- Generative fields: `generative/snoise.glsl`, `generative/fbm.glsl`, `generative/curl.glsl`, `generative/voronoi.glsl`, `generative/worley.glsl`.
- Mask morphology: `morphological/dilation.glsl`, `morphological/erosion.glsl`, `morphological/alphaFill.glsl`. Use for `ink-compression` style mask expansion/compression, with bounded radius controls.
- Surface-depth / edge cues: `filter/edge/sobel.glsl`, `lighting/fresnel.glsl`, `lighting/specular/*`, and `color/tonemap/aces.glsl`.
- Pixel / grid effects: use existing catalogue params plus LYGIA math/space helpers where useful; keep `pixelate-grid` in material shader rather than postprocessing-only so it can remain mask-aware.

Useful LYGIA modules for shade / shader controls:

- Color and blend: `color/blend.glsl`, `color/luma.glsl`, `color/hueShift.glsl`, `color/vibrance.glsl`, `color/brightnessContrast.glsl`.
- Palette / tone: `color/palette/*.glsl`, `color/tonemap/aces.glsl`, `color/tonemap/reinhard.glsl`.
- Lighting: `lighting/fresnel.glsl`, `lighting/specular.glsl`, `lighting/diffuse.glsl` for rim/highlight controls visible on dark foreground colors.
- Mask-preserving filters: edge/Sobel and sharpen can enhance character boundaries when sampled against the character mask. Avoid broad blur as a default because it can damage glyph readability.

Postprocessing fit:

- Adopt as optional Surface/Post enhancement after the Character Surface render: `SMAA`, low-opacity `Noise`, low-granularity `Pixelation`, subtle `Bloom`, `HueSaturation`, `BrightnessContrast`, and mild `Vignette`.
- Mark as Experimental or Randomize-only with conservative bounds: `Glitch`, `ChromaticAberration`, `Scanline`, `ShockWave`, heavy `Pixelation`.
- Avoid using postprocessing for core Morph Stack order semantics because it runs after the material and is global; it cannot preserve per-layer mask-aware ordering as cleanly as the Character Surface shader.
- Keep feedback/advection style effects deferred unless a render-target feedback path is deliberately introduced later.

User-facing control mapping:

- `MorphStackPanel`: expose layer schema controls and route stable layers to material uniforms. Add pattern-modulated intensity for `morph-stack` target.
- `PatternLayerPanel`: built-in pattern source, session-only local file source, target selector, lock, delete, max-three enforcement.
- `ShaderPanel`: foreground/background color controls remain active; add depth/rim/highlight controls only when wired to material output.
- `Randomize`: include seed, regenerate, Include Experimental, lock-aware randomization, and randomized shade + shape combos. Randomization should vary Morph Stack order/params, shader colors/gradient, pattern source/target for unlocked layers, and optional post effects within readable bounds.

Art-effect planning correction:

- Primary goal is a Hanzi art-effect system: character shape effects, character shade effects, pattern/material effects, and background effects.
- LYGIA, glslify, and postprocessing are supplements, not architecture owners. They should reduce low-level shader work and broaden the vocabulary without pulling the product into a package showcase.
- Custom project-owned effects are first-class. Hanzi-specific ink edge, paper bleed, bevel ink, dry-brush contrast, calligraphic deformation, and mask-aware pattern routing can be implemented in repo and may use LYGIA helpers internally.
- Highest-flexibility architecture: catalogue layer -> runtime adapter layer -> shader chunk layer -> pattern routing layer -> post surface layer -> UI layer -> randomize layer.
- Effect families for Phase 5 planning: Calligraphic Deformation, Field Warp, Slice And Glitch, Surface Depth, Pattern Material, Color And Shade, Background Effects, and Experimental Motion/Feedback.
- Background effects are part of Surface Shader, Pattern Layer, or Post Surface handling, but should not become a separate generated-background product direction.
- Randomize should generate coherent art presets across custom and package-backed effects, preserving lock behavior and glyph readability.

Verification:

- `pnpm add lygia postprocessing @react-three/postprocessing glslify`
- local Node spike: `glslify` fails on LYGIA `#pragma glslify` export and does not expand raw `#include`.
- local Node spike: recursive LYGIA include resolver expands representative shape/shade modules with `HAS_INCLUDE false`.
- `pnpm exec tsc --noEmit`

## Phase 5 Library Research - 2026-06-17

- [x] Confirm Phase 5 implementation boundary before coding.
- [x] Review current dependencies for reusable UI, drag, shader, and Three/R3F capabilities.
- [x] Research existing libraries for Morph Stack, shader effects, pattern/effect composition, and Studio controls.
- [x] Decide which libraries to adopt, avoid, or defer.
- [x] Record Phase 5 library decision before implementation.

Review result:

- Use existing `framer-motion` `Reorder` for Morph Stack drag reorder; do not add a new DnD dependency.
- Keep existing Mantine `Accordion`, `Switch`, `Select`, `Slider`, `NumberInput`, `SegmentedControl`, and local `PanelBox`/`PanelLabel` for Studio controls; do not adopt Leva because it would introduce a debug-panel style outside the current Studio visual system.
- Keep existing `react-best-gradient-color-picker` for solid/gradient color UI.
- User confirmed this project is personal research, so LYGIA's noncommercial / trial-oriented license is acceptable for Phase 5.
- Adopt `lygia` as a shader helper source/package for stronger Morph runtime, especially distortion, filter, generative/noise, morphological, color, space, and lighting helpers.
- Adopt `glslify` when it can reduce shader include/manual-copy code. If Turbopack/Next integration is brittle, keep a tested local fallback while still using the same shader structure.
- Adopt `postprocessing` / `@react-three/postprocessing` where it improves Pattern Layer or Morph output quality without breaking Character Surface mask routing.
- Phase 5 is no longer a minimum visible Morph adapter. It should maximally enhance `MorphStackPanel`, `PatternLayerPanel`, `Randomize` controls, and visible Morph runtime while preserving current Studio panel style.

## Foreground Gradient Picker Correction - 2026-06-17

- [x] Confirm UI direction: one reusable gradient picker, Solid/Depth show a single-color bar without nodes, Gradient shows draggable color stops.
- [x] Add failing tests for foreground `gradient` style, gradient stop sanitization, shader uniforms, and Shader panel wiring.
- [x] Implement reusable `GradientColorPicker`.
- [x] Persist and sanitize foreground gradient stops in `surfaceShaders.foreground.params.gradientStops`.
- [x] Wire foreground gradient uniforms into `CharacterSurfaceCanvas` material.
- [x] Replace the foreground color input with the unified gradient picker UI.
- [x] Run focused tests, full verification, and record results.

Review result:

- Added `GradientColorPicker` as the unified color UI. Solid and Depth show a single-color bar without stops; Gradient shows draggable stops.
- Replaced the hand-rolled gradient interaction with `react-best-gradient-color-picker` after user review found the custom UX unusable.
- Foreground style tabs now include `Solid`, `Depth`, and `Gradient`, positioned above the color picker.
- Gradient stops are stored at `surfaceShaders.foreground.params.gradientStops`, clamped to valid hex colors and positions, sorted, capped at six stops, and kept to at least two stops.
- Added CSS color/gradient parsing so the package output is converted back into normalized renderer stops.
- Fixed the second-stop editing bug by preserving the package's draft CSS gradient string while editing instead of rebuilding the picker value from normalized persisted stops on every render.
- Removed the separate Foreground style tab. Solid/Gradient mode now comes from `react-best-gradient-color-picker` itself, so there is only one mode selector.
- Moved the picker into a modal. The panel now shows only a compact color preview button whose background reflects the current solid color or gradient.
- Removed the default modal frame. The color picker is centered as the visible floating UI, the overlay closes on outside click, and a custom X button sits at the picker's top-right corner.
- Fixed a `Maximum update depth exceeded` loop by preventing the picker adapter from writing unchanged mode/color/gradient stop values back into the store.
- Fixed rapid color-slider update loops by keeping high-frequency picker changes local, debouncing store commits, and committing immediately only when the picker closes.
- Changed the default Foreground shader style back to `solid` because `Depth` is no longer exposed by the active picker UI.
- Background remains non-gradient: background style is still sanitized to `solid`.
- The Character Surface shader now samples foreground gradient uniforms only inside the character mask.

Verification passed:

- `pnpm add react-best-gradient-color-picker`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts components/studio/shader-panel-contract.test.ts`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts`
- `pnpm vitest run components/studio/shader-panel-contract.test.ts components/studio/gradient-color-picker.test.ts app/studio/studio-store-v2_1-fixtures.test.ts components/studio/surface-shader-material.test.ts`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts components/studio/shader-panel-contract.test.ts`
- `pnpm vitest run components/studio/gradient-color-picker.test.ts components/studio/surface-shader-material.test.ts components/studio/shader-panel-contract.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`

## Phase 4 UI Correction - 2026-06-17

- [x] Reproduce the mismatch: `ShaderPanel` still controls legacy shader presets while active preview reads `surfaceShaders`.
- [x] Add failing tests for active Surface Shader controls and background non-gradient state.
- [x] Replace the legacy Shader panel body with minimal Surface Shader controllers.
- [x] Force background Surface Shader style to `solid` and remove gradient from current UI surface.
- [x] Run focused tests, full verification, and record results.

Review result:

- Root cause: the visible `ShaderPanel` still updated legacy `shader.selectedPresetId/currentParams`, while the active `CharacterSurfaceCanvas` reads only `surfaceShaders`.
- Replaced the Shader panel with active Surface Shader controls: Foreground color, Foreground `solid`/`depth-lit` style, Foreground lock, Background color, and Background lock.
- Removed the visible legacy shader preset selector from the active panel so users no longer change a control that cannot affect the active renderer.
- Changed default background Surface Shader style back to `solid`.
- Clamped Surface Shader styles so background remains `solid`; stale or attempted `soft-gradient` state is sanitized away for the active store path.
- Kept Foreground style limited to `solid` and `depth-lit`; no gradient controller is exposed.

Verification passed:

- `pnpm vitest run components/studio/shader-panel-contract.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`

Depth style visibility correction:

- Root cause: `depth-lit` only multiplied the foreground base color by lighting, so the default black foreground stayed visually black.
- Updated `depth-lit` to add subtle diagonal highlight and rim light so dark foreground colors also show a visible surface-depth difference.
- Added a regression test that rejects the old pure-multiply depth path.
- Verification passed: `pnpm vitest run components/studio/surface-shader-material.test.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, and `git diff --check`.

## Phase 4 Surface Shader And Pattern Layers Grill - 2026-06-17

- [x] Review Phase 4 task doc, `CONTEXT.md`, Phase 3 store state, Character Surface renderer, and existing pattern texture helpers before asking questions.
- [x] Confirm which Phase 4 decisions are already locked by glossary and current code.
- [x] Collect user answers for the batched Phase 4 design questions.
- [x] Update `CONTEXT.md` only if answers introduce or sharpen domain terms.
- [x] Record the Phase 4 implementation boundary and next gate.

Review result: user approved all Phase 4 recommendations, with Surface Shader Layer completeness clarified as staged across Phase 4, Phase 5, and Phase 6. `CONTEXT.md` did not need changes.

Locked Phase 4 implementation boundary:

- Implement real rendering for Surface Shader Layers and Pattern Layers, but not the full controls UI.
- Phase 4 supports `solid`, `soft-gradient`, and `depth-lit` as the first rendering baseline.
- Phase 5 makes Surface Shader Layers fully user-controllable in the Studio UI.
- Phase 6 adds heavier Experimental renderer/shader capabilities.
- Foreground shader and foreground pattern affect only the rasterized character mask.
- Background shader and background pattern affect only the canvas/background area.
- Pattern target `morph-stack` acts as a pipeline-level input/global modulation, not a per-morph-layer target.
- Support built-in patterns and local-file runtime data; keep uploaded data URLs out of persistence.
- Pattern load failure keeps the last valid texture when possible, otherwise falls back to the first built-in pattern with non-persisted error state.
- `CharacterSurfaceCanvas` should prefer `surfaceShaders.background.color` over legacy `view.backgroundColor` for shader output.

## Phase 4 Implementation Review - 2026-06-17

- Added `components/studio/surface-shader-material.ts` with the Phase 4 rendering baseline: `solid`, `soft-gradient`, and `depth-lit`.
- Wired `CharacterSurfaceCanvas` through the new Surface Shader material, with separate foreground-mask and background-canvas shader uniforms.
- Changed the default Surface Shader styles to foreground `depth-lit` and background `soft-gradient` so Phase 4 has a visible baseline without waiting for Phase 5 controls.
- Added Pattern Layer texture routing for `foreground-shader`, `background-shader`, and `morph-stack`, including runtime local-file data support and non-persisted load-error state.
- Kept uploaded Pattern Layer data URLs runtime-only and preserved Phase 3 lock/randomization behavior.
- Updated the active preview contract test so the Character Surface route is checked through the new material and pattern texture wiring.
- Updated `tasks/v2.1/checkpoints.md` to mark Checkpoint 4 complete.

Verification passed:

- `pnpm vitest run components/studio/surface-shader-material.test.ts components/studio/pattern-layer-texture.test.ts components/studio/character-surface-preview-contract.test.ts app/studio/studio-store.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `git diff --check`

Residual notes:

- `pnpm test` and `pnpm build` still emit the existing Node warning: ``--localstorage-file` was provided without a valid path`; both commands exited successfully.
- Phase 4 intentionally does not add the full controls UI. Manual `/studio` smoke should verify the default surface remains nonblank, centered, and visually shows the new foreground/background baseline. Full user controls move to Phase 5.

## Phase 3 Morph Stack State Grill - 2026-06-17

- [x] Review Phase 3 task doc, existing Studio store, Phase 2 Morph catalogue API, and current panel wiring before asking questions.
- [x] Confirm which Phase 3 decisions are already locked by `CONTEXT.md` and code.
- [x] Collect user answers for the batched Phase 3 design questions.
- [x] Update `CONTEXT.md` only if the answers introduce or sharpen domain terms.
- [x] Record the Phase 3 implementation boundary and next gate.

Review result: user approved all Phase 3 recommendations. `CONTEXT.md` did not need changes because the existing glossary already covers **Morph Stack**, **Surface Shader Layers**, **Pattern Layer**, and **Renderer Mode**.

Locked Phase 3 implementation boundary:

- Implement store state, actions, persistence, and randomization only.
- Do not implement the full Morph Stack panel UI or Character Surface shader rendering in this phase.
- Quarantine old mesh/displacement state so it is no longer active primary state or persisted; do not delete old components until cleanup.
- Change active v2.1 panels to `character`, `morph`, `shader`, and `pattern`.
- Default Morph Stack starts from a three-layer Stable preset generated from seed `0`.
- Manual reorder can move locked Morph layers; randomization must preserve locked Morph layers in place.
- Persist fixed foreground/background Surface Shader Layer state and Pattern Layer metadata.
- Cap Pattern Layers at three and keep uploaded file data/data URLs runtime-only.
- Persist renderer mode as `webgl` or `webgpu-experimental`, defaulting to `webgl`.
- Use storage key `hanzi-studio-character-surface-v2_1_phase3`.

## Phase 3 Implementation Review - 2026-06-17

- Updated `app/studio/studio-store.ts` to add persisted Morph Stack layers, Surface Shader Layers, Pattern Layer metadata, random seed, and renderer mode.
- Changed the v2.1 storage key to `hanzi-studio-character-surface-v2_1_phase3` and kept old mesh/displacement/svgEffect state out of the persisted payload.
- Added Morph Stack actions for add, duplicate, remove, reorder, param update, lock, replace, and seeded randomization.
- Added Surface Shader Layer actions and Pattern Layer actions, including Pattern Layer cap enforcement and runtime-only uploaded Pattern Layer data.
- Added randomization behavior that preserves locked Morph layers in their existing slots, keeps locked Surface Shader Layers unchanged, and updates existing unlocked Pattern Layers without adding/removing pattern layers.
- Updated `components/studio/StudioControls.tsx` so active v2.1 panels are `character`, `morph`, `shader`, and `pattern`, without adding the full Phase 5 UI.
- Added `app/studio/studio-store-v2_1-fixtures.test.ts` for Phase 3 state, persistence, lock, randomization, renderer mode, and runtime-data guarantees.
- Updated `tasks/v2.1/checkpoints.md` to mark Checkpoint 3 complete.

Verification passed:

- `pnpm vitest run app/studio/studio-store.test.ts app/studio/studio-store-v2_1-fixtures.test.ts`
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

Residual notes:

- `pnpm test` and `pnpm build` still emit the existing Node warning: ``--localstorage-file` was provided without a valid path`; both commands exited successfully.
- No browser visual QA is required for Phase 3 because this phase does not wire Character Surface rendering. Full visible effect changes begin in Phase 4 and Phase 5.

## Phase 2 Morph Layer Catalogue Grill - 2026-06-17

- [x] Review `CONTEXT.md`, active v2.1 package docs, and current Studio implementation before asking questions.
- [x] Confirm whether unresolved Phase 2 decisions are answerable from code or docs.
- [x] Collect user answers for the batched Phase 2 design questions.
- [x] Update `CONTEXT.md` only if the answers introduce or sharpen domain terms.
- [x] Record the Phase 2 grill review and next implementation gate.

Review result: user approved all Phase 2 recommendations. `CONTEXT.md` did not need changes because the existing glossary already covers **Morph Layer Catalogue**, **Morph Stack**, **Experimental Extension**, **Vector Pre-Morph**, and **Renderer Mode**.

Locked Phase 2 implementation boundary:

- Build only the new `morph/` schema, registry, params, randomizer, and focused tests.
- Do not modify Studio store, panel UI, or Character Surface shader composition in this phase.
- Implement the first seven Stable catalogue entries and three Experimental Morph Layer entries.
- Keep `webgpu-renderer` out of the Morph Layer registry; it remains a renderer capability.
- Add implementation-only `pipelinePhase` metadata while preserving one user-facing **Morph Stack**.
- Return deterministic `MorphStackPresetDraft` randomization output; Phase 3 will wrap it into persisted store state.

## Phase 2 Implementation Review - 2026-06-17

- Added `morph/types.ts` with Morph Layer tier, category, implementation pipeline phase, param, Experimental badge, and preset draft types.
- Added `morph/catalogue.ts` with the seven Stable first-set entries and three Experimental Morph Layer entries.
- Kept `webgpu-renderer` out of the Morph Layer registry because it remains a renderer capability.
- Added `morph/params.ts` for default and sanitized Morph params.
- Added `morph/randomize.ts` for deterministic seeded `MorphStackPresetDraft` generation, Stable-only by default and Experimental only by opt-in.
- Added `morph/catalogue.test.ts` and `morph/randomize.test.ts` covering ids, broad categories, Experimental metadata, WebGPU boundary, param defaults/bounds, seed normalization, deterministic output, and Stable-only defaults.
- Updated `tasks/v2.1/checkpoints.md` to mark Checkpoint 2 complete.

Verification passed:

- `pnpm vitest run morph/catalogue.test.ts morph/randomize.test.ts`
- `pnpm test`
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm build`
- `git diff --check`

Residual notes:

- `pnpm test` and `pnpm build` emit the existing Node warning: ``--localstorage-file` was provided without a valid path`; both commands exited successfully.
- No browser visual QA is required for Phase 2 because this phase does not wire UI or Character Surface rendering.

## Active v2.1 Package

- [x] Lock the v2.1 glossary in `CONTEXT.md`: Character Surface, Morph Stack, Morph Layer Catalogue, Surface Shader Layers, Pattern Layer, Experimental Extension, and Vector Pre-Morph.
- [x] Create the phased `tasks/v2.1/` implementation package.
- [x] Include PM-style checkpoints across multiple phases.
- [x] Add the Morph Layer Catalogue planning artifact.
- [x] Mark the old Character Mesh shader plans as superseded.
- [x] Mark v2.1 architecture for direct development on branch `v2.1`.
- [x] Run docs-only verification for the v2.1 planning package.
- [x] Clean up old task, lesson, and planning-doc status so active guidance points to v2.1.
- [x] Complete Phase 0 architecture lock grill and record resolved decisions.
- [x] Complete Phase 1 Character Surface foundation grill and record resolved implementation decisions.
- [x] Start Phase 1 Character Surface implementation after explicit implementation approval.

## Phase 1 Implementation Checklist

- [x] Add failing Node-safe raster helper tests for empty SVG rejection, metadata extraction, bounded mask dimensions, fit transform, and current-scale preservation.
- [x] Add failing store tests for clean v2.1 storage key, non-persisted loaded SVG text, and stale SVG runtime clearing on character change.
- [x] Implement `character-surface-rasterize.ts` pure helpers and browser rasterization entry point.
- [x] Update Studio store runtime state, storage key, persistence partialization, and actions for selected SVG loading.
- [x] Replace the active `ShaderCanvas`/`CharacterMesh` preview chain with `CharacterSurfaceCanvas`.
- [x] Remove `AspectRatio`, mesh status wording, `OrbitControls`, displacement texture loading, and active `CharacterMesh`/`ExtrudeGeometry` preview use.
- [x] Run Phase 1 focused tests, full repo verification, and record results.
- [x] Provide manual `/studio` browser smoke checklist for the user.

## Current Source Of Truth

- `CONTEXT.md`
- `tasks/v2.1/README.md`
- `tasks/v2.1/checkpoints.md`
- `tasks/v2.1/morph-layer-catalogue.md`

## Superseded / Historical Docs

- `tasks/shader-effect-redesign-plan.md`: superseded 3D Character Mesh implementation plan.
- `tasks/shader-effect-redesign-phased-implementation-plan.md`: superseded 3D Character Mesh phased handoff.
- `tasks/hanzi-studio-refactor-plan.md`: historical initial Hanzi Studio refactor scope; useful only for product-boundary background.

## Latest Planning Review - 2026-05-27

- Created `tasks/v2.1/README.md` as the active source of truth for the Character Surface redesign.
- Added phase plans for architecture lock, fullscreen Character Surface foundation, Morph Layer Catalogue, Morph Stack state/randomization, Surface Shader and Pattern Layers, Studio panel UX, Experimental Extensions, and cleanup/verification.
- Added `tasks/v2.1/checkpoints.md` with PM checkpoint lists for each phase.
- Added `tasks/v2.1/morph-layer-catalogue.md` with Stable and Experimental deformation families informed by open-source shader/filter/vector morph patterns.
- Kept product name as Hanzi Studio while renaming the core preview object to Character Surface and control system to Morph Stack.
- Set default Morph Stack composition to Sequential Warp Chain.
- Set Randomize to generate a full preset from Stable layers only by default, while honoring layer locks.
- Defined two Surface Shader Layers: foreground character mask and background canvas.
- Defined Pattern Layers as UI layers with one selector target each and a maximum of three Pattern Layers.
- Defined Experimental Extensions as opt-in modules shown inside the same panel system, not separate products, canvases, or required runtime dependencies.
- Marked v2.1 implementation as direct development on branch `v2.1`.

## Phase 0 Architecture Lock Review - 2026-05-28

- Treated the user grill response as the final Phase 0 approval gate for the v2.1 planning package.
- Locked clean v2.1 persistence: use a new storage key and do not migrate old mesh/displacement state.
- Locked Phase 1 rasterization scope to mask texture first; defer full SDF generation until morphology or contour effects need it.
- Locked the first Stable Morph Layer implementation set: `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.
- Locked renderer vocabulary: persist `webgl` or `webgpu-experimental`; WebGPU is a renderer capability, not a Morph Layer.
- Locked manual browser visual verification: provide a `/studio` checklist and wait for the user's report instead of automatically running browser visual checks.
- No application code changed in Phase 0.

## Phase 1 Character Surface Foundation Grill - 2026-05-28

- Locked Phase 1 to replace the active `ShaderCanvas`/`CharacterMesh` preview chain with `CharacterSurfaceCanvas`; do not keep two active WebGL preview stacks.
- Locked active preview removal of `CharacterMesh`, `ExtrudeGeometry`, `OrbitControls`, mesh loading status, displacement texture loading, and displacement-primary semantics.
- Locked selected SVG loading into active non-persisted Studio runtime state keyed by `characterUrl`, rather than making the canvas component the long-term owner of SVG fetching.
- Locked clean v2.1 storage key introduction during Phase 1; do not migrate old mesh/displacement state.
- Locked Phase 1 test strategy: keep Node Vitest focused on pure parsing, bounds, sizing/orientation, and empty-input rejection; browser decode/draw/upload/uprightness stays in the manual `/studio` smoke checklist unless the user explicitly asks for automated browser visual testing.
- Locked first render path to one `u_characterMask` texture with foreground/background defaults; full Morph Stack composition and Surface Shader Layer controls remain later phases.
- Locked Character Surface fit behavior: selected character must remain fully visible, centered, upright, aspect-ratio preserving, and at the current preview's default visual scale.
- Updated `CONTEXT.md`, `tasks/v2.1/phase-1-character-surface-foundation.md`, and `tasks/lessons.md` only. No application code changed.

## Phase 1 Implementation Review - 2026-05-28

- Added `components/studio/character-surface-rasterize.ts` with Node-safe SVG metadata/fit planning and browser Canvas 2D rasterization for a fullscreen mask texture.
- Added `components/studio/CharacterSurfaceCanvas.tsx` as the active fullscreen WebGL Character Surface. It samples one `u_characterMask` texture and renders Phase 1 foreground/background defaults.
- Updated `components/studio/StudioCanvas.tsx` to remove the square preview wrapper, active `ShaderCanvas` path, mesh status wording, and active mesh/displacement preview coupling.
- Updated `app/studio/studio-store.ts` to use a clean `hanzi-studio-character-surface-v2_1` storage key, keep loaded SVG text in non-persisted runtime state, and persist only compact character/shader/view choices.
- Added tests for raster planning, clean v2.1 persistence, loaded-SVG runtime behavior, and active preview contract.
- Verification passed: `pnpm vitest run components/studio/character-surface-rasterize.test.ts app/studio/studio-store.test.ts components/studio/character-surface-preview-contract.test.ts`, `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`. One earlier build attempt hit a transient Google font fetch failure; subsequent builds passed.
- Manual browser smoke is still pending user report by v2.1 rule. Checklist: desktop `/studio`, mobile `/studio`, switch character, refresh page, confirm nonblank fullscreen Character Surface, confirm no upside-down character, and confirm the character remains fully visible, centered, aspect-ratio preserving, and at the current default visual scale.

## Cleanup Review - 2026-05-27

- Replaced historical Phase 1-6 execution logs in this file with current v2.1 tracking only.
- Removed stale mesh/displacement implementation rules from `tasks/lessons.md`; active lessons now preserve only evergreen guidance.
- Strengthened superseded/historical guards in old planning docs so future work does not accidentally resume the Character Mesh path.
- Verification: stale active-rule grep against `tasks/todo.md` and `tasks/lessons.md` returned no matches.
- Verification: old-doc guard grep confirmed the historical and superseded warnings are present.

## Studio Export - PNG / APNG / GIF / MP4 (2026-07-14)

Specification:

- Keep exactly four Export actions: PNG, APNG, GIF, and MP4; remove JPG, WEBP, SVG, and COPY from the active UI.
- PNG captures the current preview frame at exactly `2048×2048` and downloads immediately when selected.
- Animated formats capture exactly one Y-axis 3D Motion revolution using the same runtime angular velocity (`mesh.autoRotateSpeed * animation.speed`) as the preview.
- Keep the export loop deterministic: preserve the current Y rotation as frame zero, advance rotation and shader time from explicit frame timestamps, and restore all Studio state after success or failure.
- Encode MP4 at 30 fps, APNG at 24 fps, and GIF at 12 fps. A loop frame count is the rounded one-turn duration multiplied by the format fps; loop playback returns from its last sampled frame to the identical first-frame orientation without an extra duplicate hold frame.
- Render every MP4, APNG, and GIF frame at exactly `1024×1024`.
- Reject animated export when 3D Motion speed cannot produce a finite positive revolution, and report progress/failure in the existing Export status region.
- Open a viewport-centered modal for animated export, show a visible progress bar and frame count, and provide a Cancel action while encoding.
- Do not auto-download animation results. Keep the completed file in the modal until the user explicitly selects Download; PNG remains a direct download.
- Run PNG and GIF through the same-origin server-side Sharp compression route before download. Keep APNG on its APNG encoder because verified Sharp re-encoding drops its animation; MP4 stays with the AVC encoder because Sharp has no MP4 output.
- Render exports from a separately mounted, UI-hidden square WebGL canvas at the exact target size. Never resize pixels copied from the visible preview canvas to simulate 1:1 export.
- When 3D Motion Speed is above zero, disable PNG; when it is zero, enable PNG and disable animation formats. Synchronize the export renderer's starting effective time with the preview canvas.

Checklist:

- [x] Add pure, tested one-revolution timing/frame-plan helpers.
- [x] Add deterministic canvas frame capture with state restoration.
- [x] Implement APNG 24 fps, GIF 12 fps, and MP4 30 fps encoders.
- [x] Add animated-export progress modal, cancellation, and explicit post-completion Download.
- [x] Reduce the Export grid to PNG, APNG, GIF, and MP4 and update persisted format sanitization.
- [x] Update focused export/store/UI contract tests.
- [x] Run focused tests, full Vitest, TypeScript, ESLint, build, and `git diff --check`.
- [x] Record implementation and verification results in this review section.

Hidden square render-surface correction:

- [x] Mount an export-only square WebGL render surface using the active Studio effect renderer.
- [x] Render PNG directly at `2048×2048` and animation directly at `1024×1024` on that surface.
- [x] Remove visible-preview canvas copying/stretching from the export path.
- [x] Add readiness, cleanup, and hidden 1:1 surface contracts; rerun full verification.

Review result:

- Export now exposes only PNG, APNG, GIF, and MP4. PNG renders to `2048×2048`, passes through the Sharp API, and downloads immediately; animation frames render to `1024×1024`.
- MP4 uses Mediabunny/WebCodecs AVC at 30 fps, APNG uses exact `1/24` frame timing with compressed PNG-frame assembly, and GIF uses averaged centisecond timing at 12 fps followed by Sharp optimization.
- Animated capture uses the preview's actual angular velocity, samples one endpoint-exclusive revolution, freezes live playback while stepping absolute rotation/time, and restores the original mesh/animation state in `finally`.
- Animated export opens a viewport-centered portal modal with progress, frame count, cancellation, Sharp optimization stage, and an explicit Download button after completion. It never auto-downloads.
- Sharp behavior was tested rather than assumed: PNG dimensions survive compression; GIF keeps pages, loop, and frame delays. Sharp APNG re-encoding collapsed animation, so APNG intentionally bypasses Sharp; MP4 also bypasses it because Sharp has no video output.
- Verification passed: focused export/compression suites `6` files / `42` tests, full Vitest `92` files / `598` tests, TypeScript, full ESLint, production build including `/api/studio/export/compress`, and `git diff --check`.
- Environment note: commands emit the existing Node version warning (`24.18.0`; repository requests `22.x`) but all verification commands exited successfully.
- Hidden render-surface correction: preview and export now share `StudioEffectCanvas`, while export mounts its own offscreen square WebGL surface only for the active job. The export context forces `dpr=1`, so CSS size and physical drawing-buffer size remain exactly `2048²` or `1024²`.
- Export no longer queries or scales `[data-studio-preview] canvas`. Each requested frame receives a monotonic request id and is captured only after the export WebGL renderer acknowledges a completed post-effect render; mismatched physical dimensions, stale acknowledgements, timeout, cancellation, and teardown are guarded.
- Speed/time correction: PNG is enabled only when 3D Motion Speed is `0`; APNG/GIF/MP4 are enabled only above `0`. Animation export seeds its first frame from the preview renderer's latest effective animation time, and Speed `0` keeps PNG preview/export time identical for WYSIWYG output.
- Correction verification passed: focused hidden-surface/routing/timing suites `4` files / `15` tests, full Vitest `92` files / `598` tests, TypeScript, full ESLint, production build, and `git diff --check`.

## Studio navigation, character meaning, and pointer affordances (2026-07-14)

Specification:

- Turn the left-panel Hanzi Studio brand row into an accessible link to `/`, with a compact home icon before the title.
- Show the selected Character's English meaning from `assets/chars.ts` inside the Character trigger, without changing character selection state or SVG rendering.
- Complete missing current-year meaning entries so every listed Character has a meaning fallback from the same data source.
- Apply `cursor: pointer` to enabled Studio controls with click behavior while retaining `not-allowed` for disabled actions.
- When PNG export is unavailable, keep the disabled action wrapped in a hoverable tooltip target explaining that 3D Motion Speed must be `0`.
- Keep all changes route-local and preserve the current terminal-style Studio layout.

Checklist:

- [x] Add focused source-contract tests for the home link, meaning rendering, meaning-data coverage, and pointer cursor rules.
- [x] Make the disabled PNG export explanation reliably hoverable.
- [x] Implement the linked Studio brand row and Character meaning line.
- [x] Add missing meaning entries and pointer cursor affordances.
- [x] Run focused tests, full relevant verification, and `git diff --check`.
- [x] Record review results below.

Review result:

- The desktop Studio brand now uses the existing Hanzi logo and links the icon/title together to `/`, with a visible keyboard focus treatment.
- Character cards show their English meaning below the selected glyph. `assets/chars.ts` now includes the missing 2024 meanings, and a data invariant test verifies that every selectable TC/SC character has a non-empty meaning.
- Enabled Studio buttons, links, and portalled Character picker buttons use the pointer cursor; disabled Export actions retain `not-allowed`.
- Disabled PNG/animation actions now place the Speed requirement on a hoverable wrapper, while the nested button remains natively disabled and exposes the same explanation through its accessible name.
- Verification passed: focused Studio contracts `4` files / `13` tests, TypeScript, ESLint, production build, and `git diff --check`.
- Full Vitest result: `90` files / `586` tests passed; `3` files / `17` tests failed because the pre-existing uncommitted `studio-store.ts` change sets the default theme to dark while those tests still assert light-theme defaults. This task did not modify or revert that unrelated work.
- Per the project rule, browser visual verification remains for user-run `/studio` QA rather than automated inspection.

## Grain Intensity default correction (2026-07-14)

- [x] Change the shared Grain Intensity schema default from `35` to `0`.
- [x] Align all renderer and compiler fallbacks with the shared `0` default.
- [x] Add regression coverage for initial and reset behavior.
- [x] Run focused verification and record results.

Review result:

- The shared Post-Processing Grain Intensity schema now defaults to `0`, so initial controls and selected-effect Reset both restore `0`.
- The shared runtime compiler and all independent material uniform initializers/read fallbacks now use `0`; no stale `35` Grain Intensity fallback remains.
- Verification passed: focused runtime/default tests `2` files / `30` tests, all material suites plus the new regression suite `18` files / `146` tests, TypeScript, focused ESLint, and `git diff --check`.

## Matrix Rain direction semantics correction (2026-07-14)

- [x] Treat Direction labels as destination (`to`) directions.
- [x] Swap Up/Down and Left/Right runtime mappings in both shader paths and the CPU oracle.
- [x] Add four-direction regression coverage and run focused verification.

Review result:

- Matrix Rain now interprets Up, Down, Left, and Right as the destination the rain moves `to`; both opposing pairs are reversed from the prior source/from semantics.
- One shared direction-ID map now feeds the dedicated Matrix Rain material and generic Studio runtime compiler, while the deterministic CPU oracle uses the same destination-direction branch.
- Verification passed: focused Matrix Rain/runtime suites `3` files / `59` tests, TypeScript, focused ESLint, and `git diff --check`.
- The broader Studio store file remains independently red because the pre-existing dark-theme change conflicts with light-theme assertions; the three direction-specific suites pass.

## Processing Brightness Map runtime repair (2026-07-14)

Specification:

- Keep the shared Brightness Map range/default unchanged for non-Matrix effects.
- For Matrix Rain only, use the explicit Brightness Map minimum/default/maximum `0 / 3 / 6`.
- Make Processing Brightness Map visibly affect every active Effect, not only ASCII, Dithering, Halftone, and Matrix Rain.
- Apply Brightness Map in the processing stage before shared post-processing for each independent material.

Checklist:

- [x] Add a material-level regression that reproduces the 11 disconnected Effect paths.
- [x] Add a Matrix Rain-only Brightness Map schema override and align its runtime/material fallback.
- [x] Wire Brightness Map through the 11 missing materials and remove stale negative assertions.
- [x] Run focused material/runtime/store verification, TypeScript, ESLint, and diff hygiene.
- [x] Record diagnosis and results.

Review result:

- Root cause: the shared compiler packed Brightness Map for all 15 Effects, but 11 dedicated materials never declared, initialized, updated, or consumed the uniform. Compiler-signature tests therefore passed without proving visible renderer behavior.
- Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS now multiply their completed effect color by `u_brightnessMap` before shared Post-Processing. ASCII, Dithering, Halftone, and Matrix Rain retain their working paths.
- Matrix Rain alone now uses Brightness Map minimum/default/maximum `0 / 3 / 6`; every other Effect remains `0 / 1 / 2`. Initial state, Reset, persisted-value sanitization, generic compiler fallback, and the dedicated Matrix material all use the Effect-specific schema.
- Verification passed: focused material/default/runtime suites `20` files / `175` tests, TypeScript, full ESLint, production build, and `git diff --check`.
- Full Vitest result: `92` files / `591` tests passed; the same pre-existing dark-theme conflict leaves `3` files / `17` tests red. No Brightness Map or material suite failed.
- Per project policy, visual proof remains a user-run `/studio` check across representative Effects rather than an automated browser inspection.

## Complete Processing and Post-Processing controller audit (2026-07-14)

Specification:

- Audit all 15 active Effects against every visible Processing and Post-Processing controller at the actual renderer/material seam.
- Treat a controller as implemented only when schema/store input reaches a declared uniform and changes shader output in the correct Processing/Post ordering.
- Repair every missing or no-op path, including Edge Enhance, Blur, Quantize Colors, and Shape Matching.
- Replace compiler-only or source-marker false positives with a deterministic all-Effect connectivity regression.
- Preserve existing Effect-local behavior and Matrix Rain's explicit Brightness Map `0 / 3 / 6` contract.

Checklist:

- [x] Build the 15-Effect controller connectivity matrix and reproduce every missing path.
- [x] Add a failing all-renderer regression at the material/uniform/shader-consumption seam.
- [x] Implement missing Processing controllers across independent materials.
- [x] Verify every Post-Processing controller and repair any missing/no-op paths.
- [x] Run focused and full verification, clean diagnostics, and record results.

Review result:

- Root cause: all 15 Effects exposed the same six Processing controls, but only ASCII, Dithering, Halftone, and Matrix Rain consumed all six. The other 11 renderers consumed only Brightness Map, leaving `55` visible controller paths disconnected. Their local tests explicitly asserted those uniforms were absent, while shared-compiler tests never exercised the active independent materials.
- Added Invert, Edge Enhance, spatial four-neighbor Blur, Quantize Colors, and Shape Matching to Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS. Each renderer samples Blur at its actual source seam, then applies the remaining Processing stage after effect construction and before Post-Processing. Quantize value `1` now maps to at least two output levels instead of acting as a no-op.
- The complete Post-Processing audit found all nine controllers structurally connected across all 15 active renderers, so no missing Post shader path required repair. Grain Size and Grain Speed are intentionally conditional on Grain Intensity being above `0`; Grain Speed additionally needs advancing animation time.
- Added one table-driven active-renderer contract covering the exact 15 Effect routes. It verifies schema group cardinality, uniform declaration/update/consumption, Processing-before-Post ordering, and effective Quantize value `1`, preventing an independent renderer from silently bypassing shared controls again.
- Verification passed: focused renderer/controller suites `22` files / `196` tests, TypeScript, full ESLint, production build, and `git diff --check` after final hygiene. Full Vitest result: `94` files / `608` tests passed; the same pre-existing dark-theme conflict leaves `3` files / `17` tests red, with no controller/material regression failing.
- Per project policy, final visual proof remains a user-run `/studio` check rather than automated browser inspection.

## Three.js deprecated Clock warning (2026-07-14)

Specification:

- Reproduce `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` from the actual Studio runtime dependency path.
- Identify whether the deprecated constructor is owned by Hanzi source or the React Three Fiber renderer dependency.
- Remove the warning with the smallest compatibility-safe change, without altering render delta, elapsed-time uniforms, animation speed, or export timing.
- Add a focused regression guard at the owning seam so the deprecated path cannot silently return.

Checklist:

- [x] Reproduce the warning and locate the exact constructor call.
- [x] Rank and test dependency/source hypotheses.
- [x] Add a failing focused regression guard.
- [x] Implement the minimal fix.
- [x] Run focused tests, TypeScript, production build, and diff hygiene.
- [x] Record root cause and verification results.

Review result:

- Root cause: `@react-three/fiber@9.6.1` constructs `new THREE.Clock()` for its root state and still depends on Clock-specific `getDelta()`, `elapsedTime`, and `oldTime` behavior. Hanzi source only consumes Fiber's `clock`; it does not construct the deprecated class.
- `three@0.184.0` emits the warning for that Fiber-owned constructor. Replacing it with `THREE.Timer` inside Hanzi would require an incompatible Fiber fork because Timer has a different update and elapsed-time API.
- `three` and `@types/three` are now pinned to `0.182.0`, the last release before Clock deprecation, preserving Fiber's render-loop timing while removing the warning. The exact pin prevents a future install from silently restoring the incompatible release.
- Added a regression test that reproduced the warning on `0.184.0` and now proves Fiber's clock constructor remains warning-free.
- Verification passed: focused render/clock suites `4` files / `20` tests, TypeScript, focused ESLint, frozen-lockfile install, production build, direct runtime reproduction (`THREE.REVISION === 182` with no warning), and `git diff --check`.
- Full Vitest result: `93` files / `592` tests passed; the same pre-existing dark-theme work leaves `3` store suites / `17` assertions red. The new clock regression and all focused renderer tests pass.

## Full Studio color and effect behavior repair (2026-07-14)

Specification:

- Audit all 15 active Effects, every color-bearing control, Color Mode, Reset, all six Processing controllers, and all nine Post-Processing controllers at the effective runtime/output seam.
- Make every Effect Color Mode use `mono`; remove or normalize unsupported alternatives instead of exposing modes that do not match the product contract.
- Make Reset restore every color control for the active Effect and active theme after the user changes it.
- Keep every color role independent: model/base color changes the model; Matrix Rain Color changes rain glyphs; Dots Dot Color changes dots; Blockify Border Color changes borders; equivalent roles must work for every other Effect.
- Repair ASCII Grain and all shared Bloom, Chromatic, Scanlines, CRT Curve, and Phosphor paths so non-default values produce measurable output changes.
- Expand Processing slider ranges based on each algorithm's effective input domain so the full range produces useful, visible variation without invalid shader values.
- Change Pixel Sort Sort Mode default to `hue` across schema, initial/reset state, persistence sanitization, and runtime fallback.
- Replace structural source-marker confidence with table-driven behavioral contracts that fail when a control is declared but has no effective output.

Checklist:

- [x] Build complete Effect × Color/Mode/Reset matrix and reproduce failures.
- [x] Build complete Effect × Processing/Post matrix with effective-value assertions.
- [x] Add failing regressions for Matrix Rain, Dots, Blockify, ASCII Grain, and Pixel Sort default.
- [x] Repair shared reset, mono mode, and color-role routing.
- [x] Repair shared Post-Processing behavior and Processing ranges.
- [x] Repair every remaining effect-specific color/runtime gap found by the matrix.
- [x] Run focused and full verification, then record root causes and results.

Review result:

- Color/reset root causes: select, dropdown, and color rows never received reset callbacks; initial reference editor colors were always created from the light palette even though Studio starts dark; several Effects encoded the visible Mono option with incompatible runtime IDs. Every theme-aware color row now resets against the active theme, all actual `color-mode` controls initialize/reset to canonical `mono`, and initial ASCII colors are synchronized from the active reference editor palette.
- Color routing repairs: Matrix Rain now exposes independent Model Color and Rain Color roles; Dots Mono now consumes Dot Color; Blockify applies Border Color in every style whenever Border Width is active; Voronoi's algorithmic source selector is renamed Cell Color Source so it is no longer confused with visual Color Mode. Pixel Sort schema, sanitizer, GPU fallback, and CPU oracle now default to Hue.
- Post root cause: all nine controls existed in each material, but Bloom, Chromatic, Scanlines, CRT Curve, and Phosphor were local single-pixel approximations rather than a framebuffer compositor. Studio now mounts one shared `EffectComposer` after all 15 source renderers, using real mipmap Bloom, channel-offset Chromatic Aberration, Scanline, Vignette, UV-warp CRT Curve, phosphor RGB triads, and resolution/time-aware ASCII Grain. Export capture runs after composition.
- Processing root cause: the former per-material math was capped or visually ineffective and the earlier source-marker regression only proved uniform names existed. One shared framebuffer Processing effect now applies spatial Blur, neighbor Edge Enhance, Brightness Map, Invert, Quantize Colors, and Shape Matching exactly once. Useful ranges are Brightness Map `0..4` (Matrix `0..6`, default `3`), Edge Enhance `0..4`, Blur `0..64`, Quantize Colors `0..64`, Shape Matching `0..1`.
- Verification passed: focused behavior/compositor/Processing suites `4` files / `18` tests, full Vitest `100` files / `628` tests, TypeScript, full ESLint, production build, and `git diff --check`. The repository still emits its existing Node engine warning because the active runtime is Node `24.18.0` while `package.json` requests `22.x`; all commands exited successfully.
- Per project policy, final visual proof remains a user-run `/studio` pass rather than automated browser inspection.

## Corrected Effect color-role contract (2026-07-14)

Specification:

- Contour Line Color controls contour lines only; Background controls the remaining field.
- Matrix Rain exposes `Foreground` for the source ASCII/model glyph color and `Rain Color` for rain glyphs; remove `Model Color` terminology.
- Blockify exposes `Foreground` for the ASCII/model block color and a separate `Background` picker; remove `Border Color` terminology and prevent foreground changes from recoloring the field.
- Crosshatch light/dark Foreground and Background pairs must match the active theme rather than being inverted.
- Wave Lines Line Color must change the rendered lines independently from Background.
- Noise Field Distort Only defaults and resets to enabled.

Checklist:

- [x] Reproduce all six corrections at the active schema/material/canvas seams.
- [x] Add focused failing regressions for role names, defaults, resets, and uniform routing.
- [x] Implement the minimal schema/runtime fixes without changing unrelated Effects.
- [x] Run focused and full verification and record the result.

Review result:

- Root causes: Contour mixed Line Color through the entire filled field; Wave Lines encoded Mono as `1` but only read Line Color above `1.5`; Crosshatch rendered a white source over black while its darkness-driven hatch algorithm expected the opposite polarity; Matrix Rain and Blockify routed legacy model/border colors instead of explicit output palettes; Noise Field stored `distort-only` as false at every default seam.
- Matrix Rain now has independent Foreground and Rain Color output uniforms while its source remains a neutral luminance mask. Blockify now has Foreground and Background controls with palette-aware Full, Shaded, and Outline output. Contour, Crosshatch, and Wave Lines now preserve their named foreground/background roles.
- Persistence version 4 migrates Matrix `model-color` to `foreground`, Blockify `border-color` to `foreground`, seeds Blockify Background by theme, and enables Noise Field Distort Only for existing version-3 workspaces.
- Verification passed before the concurrent Contour work appeared: full Vitest `101` files / `635` tests, TypeScript, ESLint, production build, and `git diff --check`. Final focused rerun passed `18` files / `168` tests and `git diff --check`.
- A later full-suite rerun discovered a newly created, unrelated untracked `character-glyph-atlas.test.ts` whose implementation module does not yet exist. This correction set does not modify or delete that parallel Contour work.

## Matrix Rain model ASCII foreground correction (2026-07-14)

Specification:

- `Foreground` changes the color of the ASCII characters that construct the model.
- Do not render a solid model/base color behind those characters.
- Keep `Rain Color` independent for the animated rain characters.
- Preserve the neutral 3D source render only as the shape, depth, and luminance mask that drives the Matrix glyph output.

Checklist:

- [x] Trace the Matrix Rain source render, glyph atlas, shader color routing, and existing correction diff.
- [x] Add failing regressions that reject a solid Foreground model fill and require a glyph-masked model color path.
- [x] Apply Foreground through the model glyph mask while keeping Rain Color independent.
- [x] Run focused Matrix/color-role tests, TypeScript, lint, and diff hygiene.
- [x] Record review results and hand the final visual check to the user.

Review result:

- Root cause: Matrix Rain multiplied `Foreground` directly by the neutral source luminance, which produced a continuous solid model fill and bypassed the glyph atlas. A second static layer also used `Rain Color`, so the two color roles were not independent.
- The model contribution is now `Foreground` multiplied by the selected Matrix glyph mask and neutral 3D source luminance. `Rain Color` is used only by animated trail/head glyphs, and the final composition contains no solid model/base-color layer.
- The model and rain now use separate masks: source presence clips only the Foreground model-glyph layer, while the rain threshold mask preserves animated `Rain Color` glyphs across the background at threshold zero. The deterministic CPU oracle mirrors this GPU composition.
- Verification passed: focused Matrix suites `3` files / `35` tests, broader Matrix/color/runtime selection `5` files passed with `43` tests and `1` file skipped by the name filter, focused ESLint, and `git diff --check`.
- Full TypeScript verification was attempted but is currently blocked by unrelated concurrent Contour work: `CharacterContourCanvas.tsx(160,5)` passes a removed `sourceTexture` property to the new Contour material contract. Matrix-specific compilation through Vitest passes.
- Per project policy, final `/studio` visual confirmation remains user-run: verify there is no solid model fill, `Foreground` changes model glyphs, `Rain Color` changes trails/heads, and rotating side faces remain ASCII-masked.

Background rain follow-up:

- [x] Reproduce the missing background rain in the CPU oracle after the source-presence gate was applied to both layers.
- [x] Split the source/model mask from the rain threshold mask in the GPU shader and CPU oracle.
- [x] Add regression coverage proving black background still renders rain at threshold zero and changing Foreground does not recolor that background rain.
- [x] Re-run focused Matrix tests, ESLint, and diff hygiene.

Matrix control semantics follow-up:

- [x] Raise Matrix Rain `Glow` maximum from `2` to `4` without changing its default or step.
- [x] Move `Rain Opacity` off the Foreground model-glyph layer and apply it only to rain outside the model.
- [x] Keep rain over the model at full opacity while background rain interpolates from hidden to full visibility.
- [x] Apply Matrix `Brightness`, `Contrast`, and `Threshold` to background rain as well as model-area output.
- [x] Mirror the GPU composition in the deterministic CPU oracle and add focused behavioral regressions.

Matrix Background color follow-up:

- [x] Add a third independent Matrix Color control named `Background` after Foreground and Rain Color.
- [x] Use theme defaults Dark `#000000` and Light `#f4f1e8`, including initialization, theme switching, reset, persistence sanitization, and missing-value fallback through the shared color contract.
- [x] Add a Matrix background uniform and alpha-composite it behind model/rain glyph coverage rather than adding it directly, preserving dark glyph visibility on the Light background.
- [x] Mirror Background color and coverage composition in the deterministic CPU oracle.
- [x] Add focused schema, theme, material, CPU, and color-role regressions.

Review result:

- Matrix Color now exposes independent `Foreground`, `Rain Color`, and `Background` controls. Background defaults to `#000000` in Dark and `#f4f1e8` in Light through the existing saved theme-color system.
- GPU and CPU use premultiplied coverage composition: Background fills uncovered pixels, dark Foreground glyphs remain visible on the Light background, rain remains independently colored, and Rain Opacity continues to affect only background rain.
- Generic runtime packing now includes Matrix Background RGB so every visible controller changes the runtime signature even though the active Matrix renderer uses its dedicated material.
- Verification passed: `7` focused files / `101` tests, TypeScript, focused ESLint, and `git diff --check`.

Light Background visibility correction:

- [x] Reproduce that the selected Background was composed before Matrix Processing, so default Brightness Map `3` multiplied the Light background and washed Foreground/Rain toward white.
- [x] Process the premultiplied Foreground/Rain layer first, then alpha-composite the selected Background, while retaining Post-Processing on the final frame.
- [x] Add CPU coverage proving dark Foreground model glyphs and green background rain both differ visibly from the Light background.
- [x] Add shader-order regressions preventing Background from re-entering the Matrix Processing stage.

Light Background contrast correction:

- [x] Replace weak pixel-difference coverage with minimum contrast assertions for a dim 3D model and background rain on pure white.
- [x] Stop multiplying model glyph opacity by neutral source luminance; use the glyph mask as opacity and retain source luminance only as bounded `0.55..1` shading.
- [x] Stop multiplying rain glyph opacity by the extra `0.15 + sourceInfluence` factor; Character Set glyph coverage and rain intensity now determine visibility directly before Rain Opacity.
- [x] Mirror the revised opacity/shading equations in the deterministic CPU oracle.

Matrix Light processing/default correction:

- [x] Change Matrix Brightness Map default, Reset, compiler fallback, and dedicated material fallback to neutral `1` while retaining its `0..6` range.
- [x] Migrate the former persisted default `3` to `1` so existing workspaces receive the corrected Light-mode contrast.
- [x] Rename the visible `BG Opacity` label to `Rain Opacity` while preserving the `bg-opacity` control ID for saved-state compatibility.
- [x] Verify focused schema, store migration, processing, material, TypeScript, ESLint, and diff hygiene.

Review result:

- Root cause: Matrix defaulted the final framebuffer Brightness Map to `3`; its gamma transform lifted dark Light-mode Foreground and Rain colors toward white even though the Matrix-local Background compositing order was correct.
- Matrix now uses neutral `1` consistently in schema initialization, Reset, generic runtime fallback, and the dedicated material. The Matrix range remains `0..6`.
- Store persistence is versioned to migrate the former saved default `3` to `1`; other user-selected Brightness Map values are preserved.
- The UI label is now `Rain Opacity`; the existing `bg-opacity` ID remains unchanged for saved-state compatibility.
- Verification passed: focused Matrix/processing/migration selection `7` files / `44` tests, TypeScript, focused ESLint, and `git diff --check`. The complete store suite retains one pre-existing concurrent Contour `color-mode` expectation failure, reproduced before this implementation and outside this Matrix change.

Matrix Light visibility defaults correction:

- [x] Change Light Matrix Foreground default to `#15c15d` without changing Dark Foreground.
- [x] Change Rain Opacity default and every renderer/compiler/reference fallback from `0.3` to `0.5`.
- [x] Migrate only the former Light Foreground and Rain Opacity default values so explicit custom values remain untouched.
- [x] Verify focused schema, material, runtime, CPU parity, store migration, TypeScript, ESLint, and diff hygiene without touching Contour.

Review result:

- Light Matrix Foreground now initializes and resets to `#15c15d`; Dark remains `#f4f1e8`.
- Rain Opacity now initializes and resets to `0.5` consistently in the schema, generic runtime compiler, dedicated Matrix material, and deterministic CPU reference.
- Persisted workspaces migrate exact former defaults (`#101010` in the Light color set and Rain Opacity `0.3`) while other values remain unchanged.
- No rain intensity curve or Contour code was changed.
- Verification passed: focused Matrix/store/processing selection `7` files / `48` tests, TypeScript, focused ESLint, and `git diff --check`.

## Contour 3D renderer re-plan (2026-07-14)

Specification:

- Treat the current Contour result as a rejected visual direction. Do not keep tuning the fullscreen render-target/posterization plane.
- Preserve the selected SVG as real extruded/deformed 3D geometry with the existing position, rotation, scale, bevel, twist, taper, bend, and auto-spin behavior.
- Render contour bands directly on the mesh from a geometry-aware scalar field (view depth plus surface normal/lighting), with derivative-based antialiased band boundaries.
- Add an optional Character Set material mode that uses a real glyph atlas to construct or mask the contour strokes; reuse the existing ASCII character strings and custom-character contract rather than procedural placeholder marks.
- Keep shared Processing and Post-Processing downstream of the new mesh material, and preserve export through the existing hidden square render surface.

Root-cause evidence:

- `CharacterContourCanvas` currently renders the 3D Character into a color texture, then displays `contour-material` on a fullscreen plane. The visible result is therefore a 2D luminance posterization of a lit snapshot, not a contour material attached to the 3D Character.
- the reference editor's production Contour is itself an image-space luminance quantizer with four-neighbor band-edge detection. Porting that equation exactly does not make it a convincing 3D Character effect.
- The existing ASCII renderer already proves the required reusable seams: true extruded SVG geometry, mesh-attached `ShaderMaterial`, real Character Set glyph atlas data, animation time, and auto-spin.

Proposed implementation checkpoints:

- [x] Checkpoint 0 — obtain approval for the geometry-aware mesh material direction and the recommended Character Set integration.
- [x] Slice 1 — add deterministic CPU/math tests for contour band index, derivative-safe line mask, depth/normal mixing, and glyph selection by band.
- [x] Slice 2 — extract a shared glyph-atlas utility from the current ASCII implementation without changing ASCII output.
- [x] Slice 3 — replace the Contour offscreen source scene/fullscreen plane with the actual Character meshes using a dedicated 3D Contour material.
- [x] Slice 4 — add Contour controls for source (`Depth`, `Normals`, `Hybrid`), Character Set, Custom Chars, glyph scale/spacing, and character-masked versus solid lines; keep existing Levels, Line Thickness, Invert, Line Color, and Background semantics where they still apply.
- [x] Slice 5 — reconnect shared Processing/Post, theme reset, persistence sanitization, animation, and hidden-square export contracts.
- [x] Slice 6 — run focused material/schema/store/export tests, full Vitest, TypeScript, ESLint, production build, and `git diff --check`.
- [ ] Checkpoint 1 — hand the user a `/studio` manual visual checklist covering front face, side walls, rotation, Character Set changes, custom glyphs, and export parity; wait for visual acceptance before declaring the renderer complete.

Review result:

- Replaced the rejected render-target/fullscreen-plane path with a depth-tested, double-sided ShaderMaterial attached directly to every extruded Character mesh. Position, deformation, rotation, auto-spin, shared Processing/Post, and hidden-square export continue through the common 3D path.
- Hybrid uses normalized view depth plus surface normals and blends in the selected Character's SDF relief on front-facing surfaces, so the default flat front face still has internal contour structure before rotation exposes side walls.
- Character Lines use the shared real glyph atlas and object-bound surface coordinates. A derivative-based cell test stamps complete glyphs only in cells crossed by an isoline; band and cell hashing prevents one blank glyph from erasing an entire contour.
- Added Source, Line Style, Character Set, Custom Chars, Glyph Scale, and Glyph Spacing controls with schema-driven defaults, visibility, reset, persistence, and runtime packing. ASCII keeps its existing atlas behavior; Matrix Rain retains its intentionally separate atlas contract.
- Removed Contour-local Processing/Post math so the shared compositor applies those controls exactly once.
- Verification passed for Contour: focused atlas/material/core/schema/runtime/routing/store suites (`9` files / `79` tests), TypeScript, full ESLint, production build, and staged/unstaged `git diff --check`. The current full Vitest run passes `628` tests but is red on `3` unrelated concurrent Matrix Rain assertions (`matrix-rain-core`, `matrix-rain-material`, and `matrix-rain-schema`); no Contour suite fails. The existing Node engine warning remains because the active runtime is Node `24.18.0` while the package requests `22.x`.
- Checkpoint 1 remains open for the required user-run `/studio` visual pass.

## Contour reference parity correction (2026-07-14)

Specification:

- Supersede the rejected mesh-attached Contour direction above.
- Research the current reference editor's production bundle before implementation and keep source-backed evidence for the Contour shader, defaults, 3D input renderer, and downstream Processing/Post stages.
- Render the selected extruded/deformed 3D Character to an intermediate color frame, then apply the reference editor's image-space luminance quantization and four-neighbor contour pass to that frame.
- Remove Contour Source, Line Style, Character Set, Custom Chars, Glyph Scale, and Glyph Spacing controls. Character Set remains an ASCII concern and must not affect Contour.
- Preserve existing Character geometry, Model controls, 3D Motion, shared Processing/Post, hidden-square export, and concurrent non-Contour work.

Research evidence:

- the reference editor's production Contour defaults are Levels `8`, Line Thickness `1`, Filled Bands, Original color, black Line Color, white Background, Invert off, Brightness `0`, and Contrast `0`.
- Its Contour shader samples a 2D source texture, applies brightness/contrast and Rec.601 luminance, quantizes the center and four cardinal neighbors, and marks a contour when a neighbor band differs. It does not use geometry depth, normals, SDF, or a glyph atlas.
- For GLB input, the reference editor first renders the model with its original glTF materials in a separate Three.js canvas using a perspective camera, ambient plus directional light, black scene background, normalized model scale, and optional Y auto-rotation. That canvas is then passed to the same effect renderer as image/video input.
- The reference editor's Processing/Post are downstream stages. Default Post Grain is enabled at intensity `35`, size `2`, speed `50`; this can add texture after Contour but is not part of the Contour shader itself.

Checklist:

- [x] Record the user correction in `tasks/lessons.md` and supersede the prior direction.
- [x] Lock the corrected schema, runtime, routing, material, and CPU-oracle contracts with focused tests.
- [x] Restore the offscreen 3D-frame to image-space Contour pipeline.
- [x] Remove every Contour Character Set and guessed geometry-source seam.
- [x] Run focused tests, TypeScript, ESLint, production build, and diff hygiene.
- [x] Record results and provide the user-run `/studio` visual checklist.

Review result:

- Root cause: the rejected renderer replaced the reference editor's fullscreen source-texture algorithm with a custom mesh-attached depth/normal/SDF material and made Character Lines the default. That path could only produce glyph-covered gray faces; it could not reproduce the reference's dense boundaries over a detailed luminance frame.
- Restored the verified production architecture: the selected 3D Character is lit in an intermediate scene, rendered to a framebuffer, and passed to the exact Rec.601 brightness/contrast, quantized-band, four-neighbor Contour shader. The source camera and lighting now match the reference editor's 3D renderer defaults: 50-degree perspective at z=5, ambient 0.6, directional 1 at (5,5,5), and black source background.
- Contour exposes only the website control set, with the user-selected Hanzi default of Mono: Filled Bands, Levels 8, Line Thickness 1, Invert off, Brightness/Contrast 0, black Line Color, and white Background. Mono keeps the reference editor's exact two-color midpoint mix.
- Removed Contour's Source, Line Style, Character Set, Custom Chars, Glyph Scale, Glyph Spacing, glyph-atlas, SDF, and derivative-isoline paths. The shared atlas utility remains for ASCII, where it belongs.
- Processing/Post stay downstream in the current Studio compositor and are applied once. the reference editor's default Grain explains part of the reference texture, but no glyph or directional-streak stage exists in the Contour shader.
- Verification passed: focused Contour/store/routing/compositor suites `7` files / `78` tests, full Vitest `102` files / `640` tests, TypeScript, focused ESLint, production build, and staged/unstaged diff checks. Build still reports the existing Node engine warning because the active runtime is Node `24.18.0` while `package.json` requests `22.x`.

## Model Twist axis and Bend range correction (2026-07-14)

Specification:

- Twist deforms the Character around the model Y axis; it must not rotate each extrusion slice in the X/Y plane around Z.
- Bend keeps its existing geometry behavior but exposes a larger `-360°..360°` range consistently in UI and persisted-state sanitization.

Checklist:

- [x] RED: add geometry coverage that distinguishes a Y-axis Twist from the former Z-axis deformation.
- [x] RED: update Model/store contract coverage for the expanded Bend range.
- [x] GREEN: implement the Y-axis Twist and increase Bend UI/store bounds to `±360°`.
- [x] Verify focused geometry, Model panel, and store tests; run TypeScript and `git diff --check`.
- [x] Perform an elegance review and record the final result here.

Review result:

- Twist now progresses over the Character's normalized Y span and rotates X/Z coordinates, so it is a true Y-axis deformation. Twist also requests planar subdivision instead of unnecessary extrusion-depth steps, keeping the geometry work aligned with the new axis.
- Bend now accepts and persists `-360°..360°`; the visible slider, sanitizer, tests, and phase specification share the same range.
- Verification passed: focused `3` files / `45` tests, full Vitest `105` files / `658` tests, TypeScript, focused ESLint, and `git diff --check`.
