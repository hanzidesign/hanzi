# Phase 5U — reference editor Edge Detection parity

Date: 2026-07-13

## Production sources

- UI/state/WGSL: reference public bundle, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: reference public bundle, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: reference public bundle, ETag `a42c53dbf773f2222aee514a5053b9f4`

Edge Detection is WebGPU-only in reference editor. WebGL passes through the source and still runs global Post. Hanzi Studio keeps the selected 3D Character as input.

## Exact Settings contract

### Edge Detection

- Algorithm: `sobel`/Sobel (default), `prewitt`/Prewitt, `laplacian`/Laplacian.
- Threshold: `0.3`, range `0.1..0.8`, step `0.05`.
- Line Width: `1`, range `0.5..4`, step `0.5`.
- Invert: `false`.

### Adjustments

- Brightness: `0`, `-100..100`, step `1`.
- Contrast: `0`, `-100..100`, step `1`.

### Color

- Mode: `custom`/Mono (default), `original`/Original.
- Edge Color: `#ffffff`, visible only in Mono.
- Background: `#000000`, visible only in Mono, but its stored value remains functional in Original.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | threshold raw |
| `12` | line width raw |
| `16` | invert 0/1 |
| `20` | algorithm Sobel 0, Prewitt 1, Laplacian 2 |
| `24,28` | brightness/contrast divided by 100 |
| `32,36,40` | Edge RGB normalized |
| `44,48,52` | Background RGB normalized |
| `56` | color mode Mono/custom 0, Original 1 |

## Exact rendering logic

1. Linear clamp source sampler and Rec.601 luminance.
2. Every sampled RGB is B/C-adjusted before luminance: `clamp((rgb+b-.5)*((1+c)/(1-.99*c))+.5,0,1)`.
3. `pixelSize = lineWidth / resolution`; Line Width controls detector sampling radius, not geometric stroke width.
4. Every requested detector luminance is first Gaussian-preblurred with the 3×3 kernel corners `.0625`, axial `.125`, center `.25` at the active sample scale.
5. Coarse detector uses offsets ±`pixelSize`:
   - Sobel `gx=-tl-2ml-bl+tr+2mr+br`, `gy=-tl-2tc-tr+bl+2bc+br`, magnitude `sqrt(gx²+gy²)`.
   - Prewitt uses weights 1 instead of 2 for middle terms, then magnitude.
   - Laplacian uses `abs(mc*8 - sum(8 neighbors))`.
6. Fine detector uses offsets ±`0.5*pixelSize` and the same Gaussian scale. Laplacian remains Laplacian, while both Sobel and Prewitt use Sobel weights.
7. `combinedEdge = max(coarseEdge, fineEdge * 0.7)`.
8. `softness = threshold * 0.3`; `mask = smoothstep(threshold-softness, threshold+softness, combinedEdge)`.
9. Invert replaces mask with `1-mask`.
10. `processedOriginal` is the B/C-adjusted raw center RGB.
11. Original output is `mix(background, processedOriginal, mask)`; Mono is `mix(background, edgeColor, mask)`.
12. Processing is ignored; shared Post runs last.

## Production quirks/contextual no-ops

- Prewitt is a hybrid: coarse Prewitt plus fine Sobel.
- Original means original-colored edges over hidden Background, not untouched source. Edge Color is ignored in Original; Background remains active while hidden.
- In Mono, B/C affect only detection; in Original they also affect colored edge pixels.
- At Contrast `-100`, the contrast factor is zero, all adjusted RGB becomes `.5`, and Brightness is a no-op.
- Threshold, Line Width, Algorithm, colors, and Invert can be contextual no-ops on flat/symmetric/saturated regions or masks pinned at 0/1.
- The effect has no time dependency, though shared Post may use time.

## Hanzi Studio boundary

- Dedicated `edge-detection` renderer, schema/runtime/store tests, deterministic CPU oracle, material, canvas, and explicit route.
- Preserve selected SVG Character, all Model deformation controls, transform, auto-rotation, animation time for shared Post, and deterministic resource disposal.
- Do not import prior effect materials or generic Studio runtime into the canvas.
