# Phase 5P — Dots Independent Renderer

## Objective

Implement Dots as the fifth independent Character effect. Dots must not import or fall through ASCII, Dithering, Halftone, or Matrix Rain. The local input remains the selected 3D Character and consumes the shared Model panel; `data/sample.jpg` remains a reference behavior probe only.

## Authoritative Settings contract

| Group | Setting | Default | Contract |
| --- | --- | --- | --- |
| Dots | Shape | `circle` | Circle `0`, Square `1`, Diamond `2` |
| Dots | Grid Type | `square` | Square Grid `0`, Hexagonal Grid `1` |
| Dots | Size | `1` | `0.5..2`, step `0.1`; uniform is raw multiplier |
| Dots | Spacing | `1` | `0.5..2`, step `0.1`; uniform is raw multiplier |
| Dots | Invert | `false` | Inverts adjusted cell luminance only |
| Adjustments | Brightness | `0` | `-100..100`, step `1`; uniform value `/100` |
| Adjustments | Contrast | `0` | `-100..100`, step `1`; uniform value `/100` |
| Color | Mode | `original` | Mono stores `custom`; Original stores `original` |
| Color | Dot Color | `#ffffff` | Visible only in Mono; the current reference uploader makes this control a deliberate parity no-op |
| Color | Background | `#000000` | Visible only in Mono; remains the output background in both modes |

Group and row order must match the table. Reset affects only Dots and restores these defaults.

## Exact effect equations

1. `baseSpacing = 8 * spacing`; `dotRadius = baseSpacing * 0.4 * sizeMultiplier`.
2. Square grid center is `(floor(pixelPosition / baseSpacing) + 0.5) * baseSpacing`.
3. Hex grid uses `hexSpacingY = baseSpacing * 0.866`; odd rows shift by `baseSpacing * 0.5`; the source sample stays at the derived cell center.
4. Source color is sampled once at the cell center, then brightness/contrast is applied as `(color + brightness - 0.5) * ((1 + contrast) / (1 - contrast * 0.99)) + 0.5`, clamped to `0..1`.
5. Luminance is Rec.601 `0.299 / 0.587 / 0.114`; Invert replaces it with `1 - luminance`.
6. Radius varies with luminance: `dotRadius * (0.2 + luminance * 0.8)`.
7. Circle uses squared Euclidean distance; Square uses `max(absX, absY) < radius`; Diamond uses `absX + absY < radius * 1.4`. These are strict comparisons.
8. Original dot color is the adjusted sampled source. The current production uploader maps UI `custom`/Mono to shader mode `1`, which renders `vec3(luminance)`; shader mode `2` (`dotColor * luminance`) is unreachable. Preserve this actual behavior: Dot Color is visible but has no output effect.
9. Background uses the configured background color in both modes even though its control is hidden in Original. Output alpha is always `1`.
10. The reference editor exposes shared Processing for Dots, but the Dots uploader/shader consumes none of it; all Processing rows are parity no-ops. Shared Post-Processing runs after the Dots intermediate texture.

## Uniform packing

| Offset | Value |
| --- | --- |
| `0/4` | resolution x/y |
| `8` | sizeMultiplier |
| `12` | spacing |
| `16` | shape id |
| `20` | grid id |
| `24/28` | brightness/contrast divided by 100 |
| `32/36/40` | background RGB |
| `44` | color mode: Original `0`, Mono/custom `1` (grayscale; shader custom-color mode `2` is unreachable) |
| `48/52/56` | dot/foreground RGB |
| `60` | invert |

## Verification requirements

- Schema and store tests lock exact groups, row order, options, defaults, conditional colors, ranges, sanitization, persistence, and selected-only reset.
- Runtime/material tests lock explicit enum IDs and exact uniform units; never use global select ordinals.
- A deterministic CPU oracle uses targeted fixtures to prove every functional Dots setting changes the expected pixels, locks the intentional Dot Color/Processing no-ops, and verifies square/hex cell centers and all three strict shape tests.
- `CharacterDotsCanvas` renders the shared extruded/deformed 3D Character to a source texture, applies Dots on an independent fullscreen material, consumes all Model controls and global animation timing, and owns complete resource disposal.
- Browser verification covers all select/toggle/color controls, representative low/high range behavior, Model deformation, and console/WebGL errors. Range semantics also require CPU/material coverage because the in-app browser wrapper may not dispatch React range changes reliably.

## Primary sources

- Reference public bundle — current Dots state, Settings UI, defaults, and WGSL.
- Reference public bundle — current Dots uniform writes.
- Reference public bundle — current WebGL2 compatibility fallback; non-ASCII effects are passthrough there, while authoritative Dots behavior is WebGPU-only.

Current production asset ETags: main `2dab4b6866ace0e7533e9b4ba9f11803`, WebGPU renderer `ba02c2c47ba6903bf24449e932fc725f`, WebGL2 fallback `a42c53dbf773f2222aee514a5053b9f4`.
