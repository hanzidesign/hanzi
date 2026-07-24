# Phase 5O — Matrix Rain Independent Renderer

Date: 2026-07-13  
Status: implementation in progress

## Scope

Implement Matrix Rain as the fourth independent Character effect. It must not import or fall through ASCII, Dithering, or Halftone. The local source stays the selected 3D Character and consumes the shared Model panel. `data/sample.jpg` remains reference-behavior research input only.

## Authoritative reference editor Settings

| Group | Control | Default | Contract |
| --- | --- | ---: | --- |
| Matrix Rain | Character Set | `standard` | standard, blocks, binary, detailed, minimal, alphabetic, numeric, math, emoji/SYMBOLS, custom |
| Matrix Rain | Custom Chars | Japanese Matrix string | text; visible only when Character Set is custom; empty falls back to standard |
| Matrix Rain | Cell Size | 12 | 4..32, step 1 |
| Matrix Rain | Spacing | 0 | 0..1, step .05 |
| Matrix Rain | Speed | 1 | .5..3, step .1 |
| Matrix Rain | Trail Length | 15 | 5..30, step 1 |
| Matrix Rain | Direction | down | down, up, left, right |
| Matrix Rain | Glow | 1 | 0..2, step .1 |
| Matrix Rain | BG Opacity | .3 | 0..1, step .05 |
| Adjustments | Brightness | 0 | -100..100, step 1 |
| Adjustments | Contrast | 0 | -100..100, step 1 |
| Adjustments | Threshold | 0 | 0...5, step .01 |
| Color | Rain Color | `#00ff00` | color |

Exact built-in character strings come from the current reference editor bundle. The state-only `density` field is dead and must not become a local control.

## Renderer semantics

- Adjust the current source sample with the reference editor's brightness/contrast, normalized by 100. Preserve the current bundle behavior: activation, threshold, edge strength, and cell luminance use the raw source; adjustments only affect the faint source background.
- Cell period is `cellSize * (1 + spacing)`. Glyph margin is `.05 + spacing * .15`.
- Each stream has exactly three deterministic drops. Preserve the reference editor's seed constants, per-drop speed, wrapped direction distance, squared trail falloff, and `trailLength / 50` normalization.
- Down/up use vertical streams. Left/right transpose grid coordinates exactly as reference editor does.
- Glyph selection changes at `floor(hash21(cell) * 50 + time * 2)` and is independent of the local rain Speed.
- Threshold is inclusive against raw cell-center Rec.601 luminance. Preserve the current `threshold=0` behavior where black also passes.
- Glow scales only leading-head glyph color; it is not a blur. BG Opacity scales the faint source hint by `.1`; output alpha remains 1.
- Shared Processing and Post-Processing run after the Matrix Rain effect.

## Resource and architecture contract

- Matrix owns an effect-local glyph atlas and Matrix material. It must not import the ASCII material or generic effect compiler.
- The Character canvas uses the shared 3D SVG geometry source with Extrude, Thickness, Bevel, Twist, Taper, Bend, transforms, and auto-rotation.
- Matrix-local Speed multiplies effect time; global 3D Motion Speed remains the scene animation clock.
- Dispose geometry, render target, source material, shader material, and glyph atlas resources.

## TDD and verification

- Exact schema and visibility tests.
- Deterministic CPU oracle covering every equation, direction, threshold edge, glyph selection, and every Settings row changing output.
- Atlas tests for every exact built-in string, custom fallback, metadata, and disposal.
- Material tests for all effect-local and shared pipeline uniforms.
- Store tests for clamping, persistence, selected-only reset, and cross-effect/Model isolation.
- Explicit Canvas route and no-fallback contract tests.
- Browser output checks using the Character source, direction/time sequences, custom visibility, shared Model deformation, and console/WebGL logs.
- Full Vitest, TypeScript, ESLint, production build, and `git diff --check`.

## Primary sources

- Reference public bundle — current UI, defaults, character sets, Matrix Rain WGSL.
- Reference public bundle — font atlas and uniform packing.
