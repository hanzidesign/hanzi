# Phase 5V — Grainrad Crosshatch parity

Date: 2026-07-14

## Production sources

- UI/state/WGSL: `https://grainrad.com/assets/index-D5s-AdpN.js`, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: `https://grainrad.com/assets/index-DWlNRnaQ.js`, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: `https://grainrad.com/assets/index-D4g1FOHw.js`, ETag `a42c53dbf773f2222aee514a5053b9f4`

Crosshatch is WebGPU-only in Grainrad. WebGL passes through the source and still runs Bloom/Post. Hanzi Studio keeps the selected 3D Character as input.

## Exact Settings contract

### Crosshatch

| ID | Label | Default | UI range |
| --- | --- | --- | --- |
| `density` | Density | `6` | `2..12`, step `1` |
| `layers` | Layers | `3` | `1..4`, step `1` |
| `angle` | Angle | `45°` | `0..90`, step `5` |
| `line-width` | Line Width | **`0.15`** | **`0.5..3`, step `0.25`** |
| `randomness` | Randomness | `0` | `0..1`, step `0.05` |
| `invert` | Invert | `false` | toggle |

The below-minimum Line Width default is intentional production behavior. Reset must restore `0.15`; the GPU receives `0.15` until the user moves the slider into its declared range.

### Adjustments and Color

- Brightness and Contrast: `0`, `-100..100`, step `1`.
- Line Color: `#000000`.
- Background: `#ffffff`.
- No selects or conditional rows.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | density raw |
| `12` | angle degrees converted to radians |
| `16` | layers raw |
| `20` | line width raw |
| `24,28` | brightness/contrast divided by 100 |
| `32` | invert 0/1 |
| `36,40,44` | Line RGB normalized |
| `48,52,56` | Background RGB normalized |
| `60` | randomness raw |

## Exact rendering logic

1. Linear clamp source sample; apply Brightness then Contrast and clamp.
2. Luminance uses production coefficients `0.2326, 0.7152, 0.0722` (the red coefficient is intentionally not Rec.709/Rec.601).
3. Invert changes luminance only; `darkness=1-luminance`.
4. Hatch rotation: `rotatedX=uv.x*cos(a)-uv.y*sin(a)`, `rotatedY=uv.x*sin(a)+uv.y*cos(a)`.
5. `scaledX=rotatedX*resolution.x/spacing`; spacing and AA use width only.
6. When Randomness is positive, deterministic hash/value noise adds phase wobble: `(noise-.5)*randomness*.4` from `vec2(floor(scaledX)*.1+seed*7,rotatedY*.02)*3`.
7. Hatch distance is `abs(fract(scaledX+wobble)-.5)`; half width is `width*.5`; AA is `1.5/resolution.x`.
8. Build six cumulative tonal-art-map patterns:
   - base angle, perpendicular, denser base/perpendicular, +45°, +135° with production spacing/width multipliers `.7/.8/.9` and `1.5/1/.85`.
9. Layer collapse:
   - Layers 1: all tone levels reuse base hatch.
   - Layers 2: high levels reuse the perpendicular composite.
   - Layers 3: highest level reuses the first diagonal composite.
   - Layers 4: all six cumulative patterns.
10. Tone weights come from clamped `darkness*6` ramps and adjacent differences.
11. `solidFill=smoothstep(.92,1,darkness)` and is maxed with the hatch value.
12. Output is always `mix(background,lineColor,hatchValue)`.
13. Processing is ignored; Bloom/Post run after Crosshatch.

## Production quirks/contextual no-ops

- Density is actually pixel spacing: increasing it makes lines sparser.
- Line Width is uploaded raw. Values around/above 1 saturate hatch cells, making several pattern controls contextual no-ops; do not divide by 10.
- Layers are luminance-gated TAM direction availability, not a direct count of six tone levels.
- Randomness is deterministic spatial wobble and has no time animation.
- B/C affect only mask luminance, never the chosen palette.
- Invert changes pattern placement without swapping colors.
- Equal palette colors, fully bright/dark endpoints, zero Randomness, and saturated width create documented no-op contexts.
- Aspect ratio affects spacing and AA because only `resolution.x` is used.

## Hanzi Studio boundary

- Dedicated `crosshatch` renderer, exact schema/runtime/store behavior including persistent `0.15` default, CPU oracle, material, canvas, and explicit route.
- Preserve all Model deformation, transform, motion/time for shared Post, and deterministic disposal.
- Do not reuse Dithering's `crosshatch` sub-algorithm or import prior effect materials/generic runtime.
