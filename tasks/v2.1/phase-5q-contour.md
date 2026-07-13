# Phase 5Q — Contour Independent Renderer

## Objective

Implement Contour as the sixth independent Character effect. It must not import or fall through ASCII, Dithering, Halftone, Matrix Rain, or Dots. Local input remains the selected extruded/deformed 3D Character; `data/sample.jpg` remains a Grainrad-side probe only.

## Authoritative Settings contract

| Group | Setting | Default | Contract |
| --- | --- | --- | --- |
| Contour | Fill Mode | `filled` | Filled Bands `0`, Lines Only `1` |
| Contour | Levels | `8` | `3..20`, step `1` |
| Contour | Line Thickness | `1` | `0.5..3`, step `0.25`; source-neighbor pixel offset |
| Contour | Invert | `false` | Inverts center luminance; current production leaves neighbor luminance uninverted |
| Adjustments | Brightness | `0` | `-100..100`, step `1`; uniform `/100` |
| Adjustments | Contrast | `0` | `-100..100`, step `1`; uniform `/100` |
| Color | Mode | `original` | Mono stores `custom` and uploads shader mode `2`; Original uploads mode `1` |
| Color | Line Color | `#000000` | Visible only in Mono; always used for contour pixels |
| Color | Background | `#ffffff` | Visible only in Mono; used by Lines Only and custom bands |

Group and row order must match the table. Reset affects only Contour and restores these defaults.

## Exact effect equations

1. Sample source at current UV, apply brightness/contrast using `(color + brightness - 0.5) * ((1 + contrast) / (1 - contrast * 0.99)) + 0.5`, clamp, then Rec.601 luminance.
2. If Invert is enabled, replace center brightness with `1 - brightness`.
3. Quantized band index is `floor(brightness * levels)`; band midpoint is `floor(brightness * levels) / levels + 0.5 / levels`.
4. Neighbor sample offset is `lineThickness / resolution` in four cardinal directions. Each neighbor is independently source-sampled and brightness/contrast-adjusted.
5. Preserve the production Invert quirk: the shader contains an empty neighbor-invert block, so neighbors remain uninverted while center is inverted.
6. A contour pixel exists when any neighbor quantized index differs from the center index. It returns Line Color immediately.
7. Lines Only returns Background for every non-contour pixel.
8. Filled Bands: Original mode quantizes each adjusted RGB channel independently and adds the half-band offset; Mono/custom mode mixes Background to Line Color by quantized brightness. Shader grayscale mode `0` exists but is unreachable from current UI.
9. Output alpha is always `1`. Shared Processing is not consumed by the Contour effect shader; shared Post runs after the Contour intermediate texture.

## Uniform packing

| Offset | Value |
| --- | --- |
| `0/4` | resolution x/y |
| `8` | levels |
| `12` | lineThickness |
| `16` | fillMode: filled `0`, lines `1` |
| `20/24` | brightness/contrast divided by 100 |
| `28/32/36` | line RGB |
| `40/44/48` | background RGB |
| `52` | colorMode: grayscale `0`, original `1`, custom/Mono `2` |
| `56` | invert `0/1` |

## Verification requirements

- Schema/store/runtime tests lock exact group order, rows, options, defaults, conditional colors, ranges, enum IDs, units, sanitization, persistence, and selected-only reset.
- A deterministic CPU oracle uses targeted fixtures for Levels, Line Thickness, Fill Mode, Invert's asymmetric-neighbor bug, Brightness, Contrast, Original/custom color modes, Line Color, Background, and unreachable grayscale behavior.
- `CharacterContourCanvas` renders the shared 3D Character to an offscreen texture and applies an independent Contour material with complete Model, animation, resize, and disposal behavior.
- Browser verification covers selects/toggle/conditional colors, representative visual output, Model wiring, and console/WebGL errors. Numeric sliders also require CPU/material/store proof because the in-app browser wrapper may not dispatch React range changes reliably.

## Primary sources

- `https://grainrad.com/assets/index-D5s-AdpN.js` — current state, Settings UI, defaults, and Contour WGSL.
- `https://grainrad.com/assets/index-DWlNRnaQ.js` — current WebGPU Contour uniform writes.
- `https://grainrad.com/assets/index-D4g1FOHw.js` — WebGL2 compatibility fallback; authoritative Contour effect behavior is WebGPU-only.

Current production asset ETags: main `2dab4b6866ace0e7533e9b4ba9f11803`, WebGPU renderer `ba02c2c47ba6903bf24449e932fc725f`, WebGL2 fallback `a42c53dbf773f2222aee514a5053b9f4`.
