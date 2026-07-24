# Phase 5T — reference editor Threshold parity

Date: 2026-07-13

## Production sources

- UI/state/WGSL: reference public bundle, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: reference public bundle, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: reference public bundle, ETag `a42c53dbf773f2222aee514a5053b9f4`

Threshold is WebGPU-only in production. WebGL passes the source through but still applies global Post. Hanzi Studio keeps the selected Character as input; `data/sample.jpg` remains reference-only.

## Exact Settings contract

### Threshold

| ID | Label | Type | Default | Range |
| --- | --- | --- | --- | --- |
| `levels` | Levels | range | `2` | `2..8`, step `1` |
| `threshold-point` | Threshold Point | range | `0.5` | `0.1..0.9`, step `0.05` |
| `dither` | Dither | toggle | `false` | — |
| `invert` | Invert | toggle | `false` | — |

### Adjustments

- Brightness: `0`, `-100..100`, step `1`.
- Contrast: `0`, `-100..100`, step `1`.

### Color

- Mode: `custom` / Mono (default), `color` / Original.
- Foreground: `#ffffff`, visible only in Mono.
- Background: `#000000`, visible only in Mono.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | levels raw |
| `12` | dither 0/1 |
| `16` | threshold point raw |
| `20,24` | brightness/contrast divided by 100 |
| `28` | invert 0/1 |
| `32,36,40` | foreground normalized RGB |
| `44,48,52` | background normalized RGB |
| `56` | color mode: Original/color `1`, Mono/custom `0` |

## Exact rendering logic

1. Linear clamp sample source RGB.
2. Apply Brightness then Contrast and clamp: `factor=(1+c)/(1-.99*c)` and `(color+b-.5)*factor+.5`.
3. If Dither is enabled, index this Bayer 4×4 matrix using integer output pixel coordinates, divide by 16, and add `(value-.5)*.1` equally to adjusted RGB:
   - `0,8,2,10`
   - `12,4,14,6`
   - `3,11,1,9`
   - `15,7,13,5`
4. Runtime clamps Levels to at least 2.
5. Levels `<=2`:
   - Rec.601 luminance of the dither-adjusted color.
   - Light only when luminance is strictly greater than Threshold Point; equality is dark.
   - Invert flips the light boolean.
   - Original: light returns the B/C-adjusted undithered source color; dark returns black.
   - Mono: light returns Foreground; dark returns Background.
6. Levels `>2`:
   - Threshold Point is unused.
   - Posterize each dither-adjusted RGB channel with `floor(channel*(levels-1)+.5)/(levels-1)`.
   - Invert applies `1-posterized`.
   - Original returns clamped posterized RGB.
   - Mono computes Rec.601 luminance of posterized RGB and mixes Background→Foreground by that value.
7. Shared Processing is ignored. Shared Post runs last.

## Production quirks/contextual no-ops

- Threshold Point remains visible at Levels 3–8 but does nothing.
- Original at two levels is adjusted original color versus black, not two preserved colors.
- At two levels Dither affects the light/dark decision, but the Original light branch returns the undithered adjusted source color.
- Mono above two levels is a luminance tint ramp between Background and Foreground.
- Foreground/Background are hidden and ignored in Original.
- Brightness/Contrast run before dither, thresholding, and posterization.

## Hanzi Studio boundary

- Dedicated `threshold` renderer, CPU oracle, material, canvas, store/reset contract, and explicit route.
- Keep shared 3D Model geometry, transform, auto-rotation, animation time, and deterministic disposal.
- Do not import prior effect materials or generic Studio runtime into the canvas.
