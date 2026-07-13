# Hanzi Studio Current Task State

Active implementation package: `tasks/v2.1/phase-5d-grainrad-studio-refactor-plan.md`.
Direct development branch for v2.1 architecture: `v2.1`.
Current status: Phase 5M now has three independent renderers: ASCII, Dithering, and Halftone. The shared Character Model panel is implemented below Character, and the remaining 12 effects are explicitly marked unimplemented instead of falling through ASCII. Scope stays route-local to `/studio`; homepage `/` is not redesigned. Preserve the current character selector and 3D motion panel as Input, and use `data/Generated image 1.png` as the authoritative UI-layout reference.

Keep this file as current-state tracking only. Historical phase logs belong in the superseded task docs or git history, not here.

## Phase 5M Grainrad Effect Architecture Correction - 2026-07-13

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

- [x] Verify the live Grainrad Halftone UI and current public bundle schema/runtime equations.
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
- Halftone now has an independent CPU oracle, shader material, offscreen 3D Character source, explicit renderer route, exact Grainrad schema, selected-only reset, conditional Mono colors, and shared Processing/Post-Processing stages.
- Live browser verification caught and fixed a real Three.js shader helper collision (`luminance`). After renaming the local helper, Halftone renders the Character correctly; Shape, Invert, Mode, Foreground, and Background visibly change output, Original hides Mono-only colors, and no new shader errors appear after the fix. Range semantics are covered by the CPU/material tests because the in-app browser wrapper does not dispatch React range changes reliably.
- Verification passed: full Vitest `52` files / `266` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining Phase 5M queue: Matrix Rain, Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

Detailed specification: `tasks/v2.1/phase-5n-model-halftone.md`.

### Matrix Rain vertical slice

- [x] Audit the placeholder schema/runtime and verify current Grainrad Matrix Rain UI, defaults, character sets, WGSL, atlas, and uniform packing.
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
- Settings match the current Grainrad contract: exact groups/order, defaults, ranges, Custom Chars visibility, direction IDs, runtime units, threshold/background/head-glow behavior, shared Processing/Post stages, and selected-only reset/sanitization/persistence.
- Browser verification rendered the selected 3D Character with Matrix glyphs, verified CUSTOM text and LEFT direction interactions, and found no console errors or shader compilation errors. Range changes remain covered by deterministic CPU/material/store tests because the in-app browser wrapper does not dispatch React range changes reliably.
- Verification passed: focused Matrix suites `7` files / `64` tests, full Vitest `56` files / `309` tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is Node 24.18.0 while the repository requests Node 22.x.
- Remaining independent-effect queue: Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.

### Dots vertical slice

- [x] Audit the Dots placeholder and verify the current Grainrad Dots UI, defaults, uniform packing, shader equations, and quirks.
- [x] Write the detailed Dots specification before application-code implementation.
- [x] RED→GREEN: correct Dots schema, renderer discriminator, exact options/ranges/defaults, runtime units, reset, persistence, and sanitization.
- [x] Add a deterministic Dots CPU oracle proving every functional Dots Setting changes output and locking Grainrad's Dot Color no-op.
- [x] Add an independent Dots material and `CharacterDotsCanvas` using the shared 3D Character Model source.
- [x] Prove explicit routing with no ASCII/Dithering/Halftone/Matrix fallback and full Model/animation wiring.
- [x] Browser-test Dots selects/toggle/conditional colors, representative output, shared Model wiring, and console/WebGL errors; range semantics use deterministic CPU/material/store tests because the browser wrapper does not dispatch range input.
- [ ] Run full verification and record the remaining 10-effect queue.

User correction:

- Only ASCII has completed Settings behavior.
- Every other Effect currently has the wrong Settings and is incorrectly treated as ASCII.
- Grainrad Effects have different parameter sets and different rendering logic; parity must be proven one Effect and one setting change at a time.

Selected first vertical slice: **Dithering**.

Plan checkpoint before implementation:

- [x] Capture Grainrad's desktop three-column layout, section hierarchy, spacing, borders, typography, canvas toolbar, and export panel.
- [x] Confirm `data/sample.jpg` is the Grainrad-only behavior probe and that the local app remains Character-only. Browser upload is not exposed by the available browser-control API, so manual Grainrad upload remains the visual checkpoint.
- [x] Record every Dithering Settings row, control type, default, min/max/step/options, reset behavior, conditional visibility, and runtime change logic.
- [x] Audit `grainrad-effects.ts`, `grainrad-effect-runtime.ts`, store persistence/reset/sanitization, `StudioRightPanel`, and the active renderer path to locate the shared-ASCII coupling.
- [x] Generate and inspect a Grainrad-aligned `/studio` reference image before implementation, using the external site as the visual source of truth.
- [x] Check this plan with the user before modifying application code; approved on 2026-07-13.

Implementation checklist after plan approval:

- [x] Add failing tests that require an explicit Effect discriminator and forbid non-ASCII Effects from using ASCII-only controls/runtime.
- [x] Add Dithering-specific catalogue/schema/defaults/sanitization/reset behavior.
- [x] Add a Dithering-specific renderer/runtime compiler whose every visible control changes output.
- [x] Rebuild `/studio` shell to the generated-image layout while retaining the existing Character selector and 3D Motion panel in Input.
- [x] Keep ASCII on its dedicated glyph-atlas renderer and route Dithering to its own pipeline.
- [x] Verify Dithering setting mappings, conditional visibility, reset isolation, algorithms, color modes, palette/custom palette, modulation, chromatic, Processing, and Post-Processing behavior with pure-oracle/material/runtime tests; use `data/sample.jpg` only for the Grainrad-side research checkpoint.
- [x] Run focused Vitest, full Vitest, TypeScript, lint, build, `git diff --check`, and browser console checks.
- [x] Record the implementation review, evidence, remaining deltas, and the next Effect slice.

Acceptance criteria:

- Selecting Dithering never shows ASCII-only Character Set, Scale, Spacing, Output Width, or ASCII color-mode controls.
- Dithering Settings match Grainrad's labels, order, control types, defaults, ranges/options, and reset behavior.
- Every visible Dithering setting has a tested mapping to a Dithering renderer parameter and causes the intended visible change.
- Switching ASCII ↔ Dithering preserves effect-local settings without cross-contamination.
- `/studio` matches Grainrad's desktop architecture and UI layout, except Input uses the existing Character selector and 3D Motion panel.
- `/studio` visual placement, density, and component proportions match `data/Generated image 1.png`, which is the authoritative UI-layout reference.
- The local app accepts only the existing Character input; `data/sample.jpg` is never exposed as a local input or persisted in local state.

Review result:

- Removed every non-ASCII branch from the ASCII shader. `StudioCanvas` now routes by explicit renderer discriminator: ASCII → `CharacterAsciiCanvas`, Dithering → `CharacterDitheringCanvas`, and the other 13 effects → an explicit not-implemented state.
- Dithering now has an independent offscreen 3D Character source scene and full-screen shader material. Its tests cover 16 algorithms, ordered/error-diffusion oracle behavior, Clustered Dot, Crosshatch, adjustments, all color modes, 11 built-in palettes plus a 64-color custom palette, modulation modes, RGB split, chromatic displacement, shared Processing, and shared Post-Processing.
- Effect state is local to the selected effect. Settings Reset resets only that effect, storage uses `hanzi-studio-grainrad-effects-v1`, and dynamic controls follow `visibleWhen` conditions.
- `/studio` now matches `data/Generated image 1.png` at the reference 1586×992 viewport: measured columns are exactly 329 / 843 / 414px, with 50px top and 60px bottom rails, collapsed Character trigger/popover, Input → Effects → Presets, compact right rows, and the 4×2 Export grid.
- Browser verification on `https://localhost:3100/studio` passed: Character popover opens/closes, Dithering becomes active, its independent canvas mounts, Algorithm/Intensity are present, all eight Export cells render, and console/page errors are empty. Screenshot: `.codex/visualizations/2026/07/13/019f5b7d-b520-77f0-8100-297099448021/studio-dithering.png`.
- Verification passed: full Vitest 48 files / 237 tests, TypeScript, ESLint, production build, and `git diff --check`. The only environment warning is the repository's Node 22 requirement while this shell runs Node 24.18.0.
- Remaining Phase 5M work: implement the other 13 effects one vertical slice at a time. The next recommended slice is Halftone; no remaining effect is allowed to reuse ASCII as a fallback.

## Simplify Commit 462878dff484a3122 - 2026-06-18

Scope:

- Review commit `462878dff484a3122` for local simplifications without changing the `/studio` public behavior.
- Keep the active Grainrad `/studio` UI and current typography intact.
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

- ASCII `Color / Mode` now defaults to `mono` in the Grainrad effect catalogue, so fresh initial state and `resetSelectedEffectControls()` both restore `mono`.
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

- `Output Width` now uses a shared `ASCII_OUTPUT_WIDTH_MAX = 600` for the Grainrad effect catalogue and right Settings slider.
- Store sanitization clamps persisted/direct `output-width` values to `0..600`; `0` still means automatic/manual `Scale`.
- Runtime compile output clamps `effectValues[2]` to `0..600`, and the ASCII shader also clamps `u_effectC` as a fallback before computing `canvasWidth / outputColumnCount`.
- Verification passed: focused red/green tests, full Vitest (`43` files, `188` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser check passed on `http://localhost:3002/studio`: `Output Width` slider reports `min=0`, `max=600`, `step=1`, `value=0`; browser console errors are empty.

## Phase 5J ASCII Foreground Color Correction - 2026-06-18

User correction:

- ASCII `Color` needs a `Foreground` control in addition to `Mode`, `Background`, and `Intensity`.

Implementation direction:

- Add `Foreground` to the ASCII `Color` group in the Grainrad effect catalogue and the right Settings panel.
- Map `Foreground` into the ASCII runtime as `effectColorA`.
- Use `Foreground` as the glyph/ink color in mono-style ASCII output while preserving `Mode: original` behavior.

Implementation checklist:

- [x] Record the correction in `tasks/lessons.md`.
- [x] Add failing tests for the visible `Foreground` row, catalogue control, runtime color mapping, and shader color path.
- [x] Implement UI/catalogue/runtime/shader changes.
- [x] Verify focused tests, full tests, type/build checks, and browser load state.

Review result:

- ASCII `Color` now includes `Foreground` between `Mode` and `Background` in the right Settings panel.
- The Grainrad ASCII effect catalogue now includes a `foreground` color control, and the runtime maps it to `effectColorA`; `background` remains mapped to `effectColorB`.
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
- [x] Preserve `Custom Chars` text in the Grainrad runtime so the material can build a real custom glyph atlas.
- [x] Generate an ASCII glyph atlas texture from the selected character string using the current site font variables, with a fallback texture for non-browser tests.
- [x] Update the fragment shader to sample the atlas by brightness, preserving dark-to-light density order and treating trailing spaces as empty glyph cells.
- [x] Browser-smoke `standard`, `blocks`, `binary`, `numeric`, and `custom=01` to prove visible output changes with the selected character vocabulary.

Review result:

- `ASCII_CHARACTER_SETS` now holds the concrete strings above, and `resolveAsciiCharacterSet()` returns the custom text only when `Character Set: custom` has a non-empty value.
- `createAsciiShaderMaterial()` now builds `u_asciiGlyphAtlas`, `u_asciiGlyphCount`, and `u_asciiGlyphColumns`; the shader samples `sampleAsciiGlyphAtlas()` for the active ASCII branch instead of relying on procedural placeholders.
- The atlas canvas uses the existing CSS font variables (`--font-body`, `--font-noto`) with monospace fallback, so this does not change the site's configured typography.
- Verification passed: focused material/runtime tests, full Vitest (`42` files, `182` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser smoke passed on local `/studio`: canvas hashes were distinct for `STANDARD`, `BLOCKS`, `BINARY`, `NUMERIC`, and `CUSTOM` with `01`; browser console errors were empty.

## Phase 5G Grainrad Setting-Effect Contract Audit - 2026-06-18

User correction:

- Before implementation or rework, the plan must list settings in the same grouped style as Grainrad and explain the expected effect of every setting.
- A setting is not complete if changing it only updates state, labels, metadata, or uniforms without a visible/runtime effect.
- For each row below, validation must use at least one of: runtime signature change, shader uniform assertion, representative pixel-hash smoke, export-dimension check, or dynamic-row DOM check.

Audit rules:

- Every visible control id from `components/studio/grainrad-effects.ts` must appear in this contract.
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

- `Brightness`: shifts tonal input before hatch density.
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
- [x] Re-audit `grainrad-effect-runtime.ts` against every row above before the next shader/UI change.
- [x] Add or tighten tests for settings whose validation was indirect: ASCII `Output Width`, ASCII `Character Set`, ASCII UI uniform wiring, shared `Processing / Blur`, `Pixel Sort / Streak Length`, and MP4 export label.
- [x] Browser-smoke representative controls for ASCII `Character Set`, ASCII `Output Width`, shared `Processing / Blur`, `Pixel Sort / Streak Length`, GIF export gating, and MP4 export gating.

Review result:

- Tightened the runtime contract so ASCII `Output Width` is preserved as a column-count target instead of a pre-divided scalar. The shader now uses it to alter ASCII sampling density.
- Reworked the Grainrad ASCII shader branch so `Scale`, `Output Width`, and `Character Set` affect the actual glyph sampling path. The branch now has distinct glyph families for `standard`, `blocks`, `binary`, `detailed`, `minimal`, `alphabetic`, `numeric`, `math`, `symbols`, and `custom`.
- Corrected ASCII UI/runtime wiring: the active branch reads the existing ASCII uniforms that the UI actually updates for `Character Set`, `Background`, and `Intensity`, while keeping `Custom Chars` wired through the Grainrad runtime glyph hash/count.
- Corrected shared `Processing / Blur` from a grayscale replacement into a softening pass, and corrected `Pixel Sort / Streak Length` so larger values produce longer streaks.
- Export wording now shows `MP4` instead of `Video` while keeping GIF/MP4 gated behind active animation.
- Verification passed: focused Grainrad runtime/material/export tests, full Vitest (`42` files, `181` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser smoke passed on local `/studio`: playing export formats were `PNG/GIF/MP4`, paused export formats were `PNG` only, and canvas hashes were distinct for baseline ASCII, `BLOCKS`, `Output Width = 512`, `Processing Blur = 12`, Pixel Sort default, and `Streak Length = 300`; browser console errors were empty.

## Phase 5F Grainrad Runtime Effect Parity - 2026-06-18

User correction:

- Every visible `Settings`, `Processing`, and `Post-Processing` option must have a real visual effect, matching Grainrad's behavior model as closely as possible inside Hanzi's current 3D ASCII character renderer.
- Effect parity is not just UI parity. If a row exists, changing it must alter shader/runtime output or be removed.

Implementation direction:

- Add a runtime compiler module that takes `grainradEffect.selectedEffectId` and `grainradEffect.controls[selectedEffectId]`, plus shared Processing/Post-Processing controls, and produces stable shader uniforms.
- Keep the current 3D ASCII mesh renderer as the active preview. Grainrad's source is image/video, but Hanzi's intentional input difference remains the selected character mesh.
- Add one shader branch per Grainrad effect:
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

- Add unit tests for a new `grainrad-effect-runtime.ts` compiler:
  - every registered effect id maps to a unique numeric shader id;
  - every visible control id from selected effect + shared Processing/Post-Processing is consumed by runtime mapping;
  - every select option changes the runtime numeric value;
  - `Custom Chars` changes a custom glyph hash/count uniform;
  - shared Processing/Post-Processing controls map to dedicated uniforms.
- Add material tests that require all new uniforms to exist and shader source to contain all effect branch function names.
- Add renderer wiring tests that `CharacterAsciiCanvas` reads `grainradEffect` and updates uniforms every frame.
- Browser smoke representative interactions:
  - switching `ASCII -> Dithering -> Halftone -> VHS` changes canvas pixel hash;
  - changing a representative setting inside each family changes canvas pixel hash;
  - Processing/Post-Processing toggles change canvas pixel hash;
  - browser console has no WebGL compile errors.

Implementation checklist:

- [x] Record this correction in `tasks/lessons.md`.
- [x] Write this Phase 5F plan into `tasks/todo.md`.
- [x] Add failing runtime compiler/material/renderer tests.
- [x] Implement `components/studio/grainrad-effect-runtime.ts`.
- [x] Extend `character-ascii-material.ts` uniforms and shader branches for all 15 effects.
- [x] Wire `CharacterAsciiCanvas` to compile/update Grainrad runtime uniforms from store state.
- [x] Re-run focused tests, full Vitest, TypeScript, `git diff --check`, and production build.
- [x] Run browser pixel smoke against local `/studio`.
- [x] Update review result in this section.

Review result:

- Added `grainrad-effect-runtime.ts` as the contract layer between the Grainrad UI and shader runtime. It assigns unique shader ids for all 15 effects, maps selected-effect controls, maps shared Processing/Post-Processing controls, converts select options to numeric uniforms, parses colors, and turns `Custom Chars` into glyph hash/count uniforms.
- Added runtime tests proving every visible Settings/Processing/Post-Processing control changes the runtime signature, every select option changes the runtime signature, every effect has a unique shader id, and no visible control is unmapped.
- Added material tests requiring Grainrad uniforms and all 15 shader branch function names: ASCII, Dithering, Halftone, Matrix Rain, Dots, Contour, Pixel Sort, Blockify, Threshold, Edge Detection, Crosshatch, Wave Lines, Noise Field, Voronoi, and VHS.
- Added renderer wiring contract so `CharacterAsciiCanvas` must read `grainradEffect`, compile the selected effect controls, pass `grainradRuntime` into `createAsciiShaderMaterial`, and update uniforms via `applyGrainradRuntimeUniforms`.
- The active shader now applies the selected effect branch first, then shared Processing (`Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`), then shared Post-Processing (`Bloom`, `Grain`, `Chromatic`, `Scanlines`, `Vignette`, `CRT Curve`, `Phosphor`).
- Verification passed: focused Grainrad runtime/material/renderer tests, full Vitest (`42` files, `177` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser pixel smoke passed on local `/studio`: ASCII, Dithering, VHS, and Processing Invert produced four distinct canvas hashes, the canvas was nonblank, and console/WebGL/shader errors were empty. A representative Dithering `Intensity` change also produced a distinct pixel hash.

## Phase 5E Grainrad Effect Dynamics Correction - 2026-06-18

Live Grainrad analysis source: `https://grainrad.com/` desktop DOM inspected on 2026-06-18 before implementation.

User correction:

- Original Hanzi `Processing` rows named `Motion` or `Transform` are animation/mesh controls, not Grainrad `Processing`.
- Grainrad `Processing` is the shared image/effect pipeline: `Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`.
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
- [x] Re-analyze live Grainrad effect settings, dropdown options, and dynamic rows before implementation.
- [x] Write this plan into `tasks/todo.md` before implementation.
- [x] Add failing contracts that `Motion`/`Transform` controls live under left `Animation` and do not appear in right `Processing`.
- [x] Add failing contracts for live Grainrad setting names/options: ASCII `CUSTOM`, dynamic `Custom Chars`, `Color` -> `Mode`, and richer per-effect dropdown options.
- [x] Implement left `Animation` transform rows: `Y Rotate`, `X Rotate`, `Depth`, `Scale`, plus a grouped transform reset.
- [x] Implement `CUSTOM` Character Set and `Custom Chars` dynamic row while preserving current font stack and existing character selector input.
- [x] Update effect catalogue metadata to match live Grainrad option lists and labels.
- [x] Verify with focused tests, full Vitest, TypeScript, `git diff --check`, production build, and browser operation checks against Grainrad.

Review result:

- Reconfirmed live Grainrad Settings behavior before implementation: per-effect dynamic rows, full dropdown option lists, ASCII `CUSTOM -> Custom Chars`, and shared Processing/Post-Processing sections.
- Corrected ownership: `Motion` and `Transform` are now left `Animation` groups. `Y Rotate`, `X Rotate`, `Depth`, `Scale`, and `Reset Transform` are visible there on desktop and mobile; right `Processing` has no animation/mesh controls.
- ASCII controls now match the live reference labels: `Character Set` includes `CUSTOM`, selecting it shows `Custom Chars`, and the `Color` group uses `Mode` instead of `Color Mode`.
- Effect metadata now includes the live Grainrad dropdown options, including Dithering algorithms, Matrix Size variants, Halftone `Line`, Dots `Hexagonal Grid`, Pixel Sort `Diagonal`, Blockify `Shaded/Grayscale`, Noise Field `Worley`, and Voronoi `Darkened/Center Sample/Gradient`.
- Common `Processing` remains `Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`. Common `Post-Processing` now exposes `Bloom`, `Grain` with `Intensity/Size/Speed`, then `Chromatic`, `Scanlines`, `Vignette`, `CRT Curve`, and `Phosphor`.
- Verification passed: focused Grainrad follow-up contract, adjacent ASCII material/state tests, full Vitest (`41` files, `171` tests), `pnpm exec tsc --noEmit --pretty false`, `git diff --check`, and `pnpm build`.
- Browser smoke passed on local `/studio`: desktop and mobile canvases rendered nonblank, `CUSTOM` dropdown produced `Custom Chars`, Dithering dynamic options opened with live option names, Post-Processing showed `Grain`, and browser console errors were empty.

## Phase 5D Follow-Up Grainrad Parity - 2026-06-18

- [x] Inspect Grainrad effect catalogue settings and Character Set dropdown behavior.
- [x] Add failing contracts for the full left Effects catalogue, left Animation panel, removed Presets panel, right Settings reset, Grainrad ASCII labels, Processing/Post-Processing parity, and gated export formats.
- [x] Implement left `Effects` catalogue with Grainrad names and active markers.
- [x] Move animation controls to the left as `Animation`; remove left `Presets`.
- [x] Replace native Character Set select with Grainrad-style dropdown and option set: `STANDARD`, `BLOCKS`, `BINARY`, `DETAILED`, `MINIMAL`, `ALPHABETIC`, `NUMERIC`, `MATH`, `SYMBOLS`.
- [x] Add right-side whole-section `Reset` and match ASCII control names to Grainrad.
- [x] Match Processing and Post-Processing settings content/structure to Grainrad for the selected effect.
- [x] Add GIF and MP4 export options when animation is enabled; keep only PNG when animation is disabled.
- [x] Simplify export wording.
- [x] Verify with focused tests, full tests, typecheck, build, and browser comparison.

Review result:

- Grainrad Character Set dropdown now matches the reference option set and menu behavior: `STANDARD`, `BLOCKS`, `BINARY`, `DETAILED`, `MINIMAL`, `ALPHABETIC`, `NUMERIC`, `MATH`, `SYMBOLS`; Escape/outside click closes the menu.
- `/studio` left panel now uses `Input`, `Effects`, and `Animation`; left `Presets` was removed.
- Right `Settings` has a section-level `Reset`, Grainrad ASCII labels, selected-effect setting rows, and the live Grainrad Processing/Post-Processing rows.
- Export now shows PNG/GIF/Video only while animation is playing and falls back to PNG-only when animation is paused; export wording is `High quality image`.
- GIF export uses `gifenc` to capture an animated canvas loop; MP4 export uses browser `MediaRecorder` when `video/mp4` is available. Both were live-smoked through browser downloads.
- Verified with full Vitest (`41` files, `170` tests), `tsc --noEmit`, `git diff --check`, `pnpm build`, and Playwright smoke checks on desktop and mobile.

## Phase 5D Grainrad Studio Refactor Planning - 2026-06-18

- [x] Inspect current `/studio` architecture and dirty worktree without touching implementation files.
- [x] Analyze Grainrad desktop layout, mobile layout, dark terminal tokens, panels, and interaction model.
- [x] Capture user correction: do not copy Grainrad fonts; preserve the current configured font stack.
- [x] Capture user correction: only `/studio` is in scope; do not redesign `/`.
- [x] Capture user correction: effect controller UI should follow Grainrad's design and support both light/dark themes.
- [x] Capture user correction: `/studio` theme default should be light, with dark still supported.
- [x] Add detailed plan: `tasks/v2.1/phase-5d-grainrad-studio-refactor-plan.md`.
- [x] User approval checkpoint before implementation.
- [x] Phase 5D implementation in progress: execute all plan items, compare `/studio` operation against Grainrad, and keep iterating until aligned except for Character selector input.

Review result:

- Grainrad desktop target verified live on 2026-06-18: `100dvh` editor with left 18rem sidebar, center preview, right 22rem settings/export sidebar, compact `+`/`-` sections, row-based controls, and a terminal-style light/dark color system.
- Grainrad mobile target verified live on 2026-06-18: brand header, center preview, bottom tabs for Input/Effects/Presets/Export, floating settings button, and settings bottom sheet.
- Hanzi adaptation: Input uses the existing `CharacterPanel`/character selector instead of Grainrad file upload.
- Hanzi adaptation: active effect surface is ASCII-only; remove old non-ASCII Morph/Pattern/Shader Layer/Randomize UI from active `/studio`.
- Hanzi adaptation: preserve `theme/font.ts` current fonts; no IBM Plex Mono / JetBrains Mono import.
- Hanzi adaptation: effect controllers use Grainrad-like compact sections/rows/ranges/selects/grids, with route-local light default plus dark theme support.
- Implementation added the route-local terminal shell, desktop left/preview/right layout, mobile bottom tabs, mobile settings sheet, light/dark theme toggle, compact controller primitives, ASCII-only presets/effects, right-side Settings/Processing/Post-Processing/Export panels, canvas fill fix, and clean `hanzi-studio-grainrad-ascii-v1` active persistence.
- Browser operation comparison passed against Grainrad's live layout except for the intended Hanzi character selector input: desktop dimensions matched 288px/flex/352px, theme toggle changed light/dark, presets expanded and applied, charset select changed to `matrix`, export panel was visible, canvas filled the center preview, mobile tabs worked, and settings sheet opened.
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
