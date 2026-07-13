# Phase 5R — Pixel Sort Independent Renderer

## Objective

Implement Pixel Sort as the seventh independent Character effect. It must not import or fall through any prior effect. Local input remains the selected extruded/deformed 3D Character; `data/sample.jpg` remains a Grainrad-side probe only.

## Authoritative Settings contract

| Group | Setting | Default | Contract |
| --- | --- | --- | --- |
| Pixel Sort | Direction | `horizontal` | Horizontal `0`, Vertical `1`, Diagonal `2` |
| Pixel Sort | Sort Mode | `brightness` | Brightness uploads `0`, Hue `1`, Saturation `2` |
| Pixel Sort | Threshold | `0.25` | `0..0.5`, step `0.05` |
| Pixel Sort | Streak Length | `100` | `10..300`, step `10`; boundary search limit |
| Pixel Sort | Intensity | `0.8` | `0..1`, step `0.05`; blend original to sorted color |
| Pixel Sort | Randomness | `0.3` | `0..1`, step `0.05`; varies threshold per line |
| Pixel Sort | Reverse | `false` | Ascending luminance by default; descending when enabled |
| Adjustments | Brightness | `0` | `-100..100`, step `1`; uniform `/100` |
| Adjustments | Contrast | `0` | `-100..100`, step `1`; uniform `/100` |

## Exact effect equations

1. Direction: horizontal uses `(1,0)` and row index; vertical `(0,1)` and column index; diagonal uses normalized `(1,1)` and `floor(pixelX - pixelY)`.
2. Per-line hash is the production `hash11(lineCoordinate * 0.173)`. Effective threshold is `threshold * (1 + (hash - 0.5) * randomness * 0.5)`.
3. Preserve the production UI/shader mismatch. UI Brightness uploads shader mode `0` (black-span mode), Hue uploads `1` (white-span mode), and Saturation uploads `2` (bright-span mode); shader dark-span mode `3` is unreachable. Sorting itself always uses Rec.601 luminance, never hue or saturation.
4. Span-start/end conditions use raw sampled RGB. Brightness/Contrast are not used for detection or sorting; they are applied only to the final original/sorted blend.
5. Search backward and forward up to `int(streakLength)`, stopping on bounds or span predicates. Distances include the first terminal non-span or out-of-bounds sample. Spans smaller than `3` return adjusted original.
6. Collect at most `24` evenly spaced samples across the discovered span. Fill remaining fixed array slots with current color. Sort ascending by Rec.601 luminance, or descending when Reverse is enabled.
7. Current position maps to the sorted array by `spanStartDistance / spanSize`; interpolate adjacent sorted samples, mix with current color by Intensity, then apply exact brightness/contrast and clamp.
8. Output alpha is always `1`. Pixel Sort does not consume shared Processing values; shared Post runs after the effect.

## Uniform packing

| Offset | Value |
| --- | --- |
| `0/4` | resolution x/y |
| `8` | threshold |
| `12` | direction id |
| `16` | production shader span mode id |
| `20` | streakLength raw pixels |
| `24` | intensity |
| `28` | randomness |
| `32` | reverse `0/1` |
| `36/40` | brightness/contrast divided by 100 |

## Verification requirements

- Schema/store/runtime tests lock exact groups, rows, defaults, ranges, enum IDs, units, sanitization, persistence, and selected-only reset.
- A deterministic CPU oracle locks all four span predicates, UI mode mismatch, 24-sample cap, directions, per-line randomness, streak boundaries, reverse ordering, intensity blend, and post-sort brightness/contrast.
- `CharacterPixelSortCanvas` renders the shared 3D Character to an offscreen texture and applies an independent Pixel Sort material with complete Model, animation, resize, and disposal behavior.
- Browser verification covers all selects/toggle, representative output, Model wiring, and console/WebGL errors. Numeric sliders also require CPU/material/store proof because the in-app browser wrapper may not dispatch React range changes reliably.

## Primary sources

- `https://grainrad.com/assets/index-D5s-AdpN.js` — current state, Settings UI, defaults, and Pixel Sort WGSL.
- `https://grainrad.com/assets/index-DWlNRnaQ.js` — current WebGPU uniform writes.
- `https://grainrad.com/assets/index-D4g1FOHw.js` — WebGL2 compatibility fallback; authoritative Pixel Sort behavior is WebGPU-only.

Current production asset ETags: main `2dab4b6866ace0e7533e9b4ba9f11803`, WebGPU renderer `ba02c2c47ba6903bf24449e932fc725f`, WebGL2 fallback `a42c53dbf773f2222aee514a5053b9f4`.
