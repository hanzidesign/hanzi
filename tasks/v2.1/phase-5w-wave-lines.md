# Phase 5W — Grainrad Wave Lines parity

Date: 2026-07-14

## Production sources

- UI/state/WGSL: `https://grainrad.com/assets/index-D5s-AdpN.js`, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: `https://grainrad.com/assets/index-DWlNRnaQ.js`, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: `https://grainrad.com/assets/index-D4g1FOHw.js`, ETag `a42c53dbf773f2222aee514a5053b9f4`

Wave Lines is WebGPU-only in Grainrad. WebGL passes through the source and still runs Bloom/Post. Hanzi Studio keeps the selected 3D Character input.

## Exact Settings contract

### Wave Lines

- Line Count: `50`, `10..150`, step `5`.
- Amplitude: `20`, `5..50`, step `1` pixels.
- Frequency: `1`, `0.5..3`, step `0.1`.
- Line Thickness: **`0.4` default**, but UI range **`0.5..3`, step `0.1`**. Reset must preserve the below-minimum value and left-of-track thumb.
- Direction: `horizontal`/Horizontal (default), `vertical`/Vertical.
- Animate: `true`.

### Adjustments and Color

- Brightness and Contrast: `0`, `-100..100`, step `1`.
- Mode: `custom`/Mono, `original`/Original (default).
- Line Color `#ffffff` and Background `#000000` are visible only in Mono/custom.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | line count raw |
| `12` | amplitude raw pixels |
| `16` | frequency raw |
| `20` | time seconds |
| `24` | direction Horizontal 0, Vertical 1 |
| `28` | line thickness raw |
| `32,36` | brightness/contrast divided by 100 |
| `40` | color mode: Original 0, Mono/custom 1 |
| `44,48,52` | Line RGB normalized |
| `56,60,64` | Background RGB normalized |
| `68` | animate false 0, otherwise 1 |

## Exact rendering logic

1. Linear clamp source sample; B/C-adjust source and clamp.
2. Rec.601 luminance.
3. `animTime = animate ? time : 0`; time is seconds used directly as radians (1 radian/second).
4. Horizontal:
   - `spacing=resolution.y/lineCount`, `index=floor(pixelY/spacing)`.
   - `phase=(pixelX/resolution.x)*2π*frequency`.
   - `offset=sin(phase+animTime)*amplitude*luminance`.
   - `center=(index+.5)*spacing+offset`, `distance=abs(pixelY-center)`.
5. Vertical is the exact transposition using width, pixelY phase, and X distance.
6. `halfWidth=spacing*lineThickness*luminance`.
7. Hard comparison with no AA: a line pixel requires `distance < halfWidth`.
8. Shader modes: 0 returns adjusted original RGB, 1 returns `vec3(luminance)`, 2 would return Line Color. Outside lines always returns raw Background.
9. Processing is ignored; Bloom/Post run after Wave Lines.

## Production mismatches/contextual no-ops

- UI `custom`/Mono uploads mode 1, while Line Color requires unreachable shader mode 2. Line Color is therefore an unconditional production no-op; Mono is grayscale adjusted source.
- Background is hidden in Original but remains functional after switching back from Mono.
- Original and Mono can be equivalent for grayscale sources.
- B/C affect both line appearance and geometry because luminance controls amplitude and half-width; Background bypasses adjustments.
- Luminance zero produces no line pixels due to strict comparison.
- Thickness is a fraction of line spacing multiplied by luminance, not pixels.
- Animate false forces time to zero but the production app continues RAF rendering.
- Line ownership uses only the unwarped base cell; large offsets can create gaps/discontinuities.
- Direction can be equivalent on symmetric inputs; amplitude is locally irrelevant at phase nodes.

## Hanzi Studio boundary

- Dedicated `wave-lines` renderer, exact below-minimum persisted default, CPU oracle, independent material/canvas, and explicit route.
- Preserve full Model deformation, transform, animation/time, and disposal.
- Lock the Line Color no-op rather than silently correcting production.
