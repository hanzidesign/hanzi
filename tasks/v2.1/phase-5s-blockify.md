# Phase 5S — reference editor Blockify parity

Date: 2026-07-13

## Production sources

- UI defaults and WGSL: reference public bundle (ETag `2dab4b6866ace0e7533e9b4ba9f11803`)
- WebGPU uploader: reference public bundle (ETag `ba02c2c47ba6903bf24449e932fc725f`)
- WebGL fallback: reference public bundle (ETag `a42c53dbf773f2222aee514a5053b9f4`)
  - Only ASCII is implemented; Blockify is source passthrough followed by global Post.

`data/sample.jpg` remains a reference-only research probe. Hanzi Studio continues to render the selected 3D Character.

## Exact Settings contract

### Blockify

| ID | Label | Type | Default | Range / options |
| --- | --- | --- | --- | --- |
| `style` | Style | select | `full` | `full` Full Blocks, `shaded` Shaded, `outline` Outline |
| `block-size` | Block Size | range | `8` | `4..20`, step `1` |
| `border-width` | Border Width | range | `1` | `0..3`, step `0.5` |

### Adjustments

| ID | Label | Default | Range |
| --- | --- | --- | --- |
| `brightness` | Brightness | `0` | `-100..100`, step `1` |
| `contrast` | Contrast | `0` | `-100..100`, step `1` |

### Color

| ID | Label | Type | Default | Range / options |
| --- | --- | --- | --- | --- |
| `color-mode` | Mode | select | `color` | `color` Preserve Colors, `grayscale` Grayscale |
| `border-color` | Border Color | color | `#000000` | Visible only while `border-width > 0` |

Border Width remains visible for every style. Border Color is visible whenever Border Width is positive, even though both are functional only in Outline.

## Uniform ABI

| Offset | Uniform | Runtime value |
| --- | --- | --- |
| `0,4` | resolution | output width/height |
| `8` | block size | raw pixels |
| `12` | style | Full `0`, Shaded `1`, Outline `2` |
| `16` | border width | raw pixels |
| `20` | brightness | UI value `/100` |
| `24` | contrast | UI value `/100` |
| `28,32,36` | border RGB | normalized RGB |
| `40` | color mode | Preserve `0`, Grayscale `1` |

The aligned production struct is 64 bytes.

## Exact rendering logic

1. `pixelPos = uv * resolution`.
2. `blockPos = floor(pixelPos / blockSize)`.
3. `blockCenter = (blockPos + 0.5) * blockSize`.
4. `blockUV = blockCenter / resolution`.
5. Sample one block-center texel with the linear clamp sampler. The production comment mentioning averaging is stale; no averaging occurs.
6. Apply brightness/contrast to the sampled color before style and grayscale:
   - `color = color + brightness`
   - `factor = (1 + contrast) / (1 - 0.99 * contrast)`
   - `color = clamp((color - 0.5) * factor + 0.5, 0, 1)`
7. Grayscale, when enabled, uses Rec.601: `dot(color, [0.299, 0.587, 0.114])`.
8. Style:
   - Full: adjusted block-center color.
   - Shaded: `local = (pixelPos - blockPos * blockSize) / blockSize`; multiply color by `0.9 + 0.1 * (1 - length(local - 0.5) * 1.4)`.
   - Outline: `localPix = pixelPos - blockPos * blockSize`; an edge is `x < borderWidth || x > blockSize - borderWidth || y < borderWidth || y > blockSize - borderWidth`. Edge pixels return raw Border Color; interiors return adjusted block-center color.
9. Shared Processing is ignored.
10. Shared Post-Processing runs after Blockify.

## Production quirks and contextual no-ops

- Last partial blocks can sample beyond the source image; clamp sampling repeats the edge.
- Shaded is a fixed within-block radial multiplier, not source-aware shading.
- Border Width and Border Color do nothing in Full/Shaded despite remaining visible under the UI condition above.
- Outline with Border Width `0` has no border and visually equals Full; Border Color is hidden.
- Brightness, Contrast, and Grayscale do not affect raw border pixels.
- Production Blockify is WebGPU-only. Its WebGL fallback is source passthrough plus global Post.

## Hanzi Studio implementation boundary

- Add a dedicated `blockify` renderer discriminator and explicit route.
- Keep the selected SVG Character, Model geometry state, transform, auto-rotation, and animation time as the source.
- Add an independent deterministic CPU oracle and independent shader material; do not import prior effect materials or the generic Studio runtime into the canvas.
- Preserve source render-target and material/geometry disposal ownership.
- Range interaction is verified through schema/core/material/store tests because the in-app browser wrapper does not reliably dispatch React range events.
