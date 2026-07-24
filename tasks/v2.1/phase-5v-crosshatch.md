# Phase 5V — reference editor Crosshatch parity

Date: 2026-07-14

## Production sources

- UI/state/WGSL: reference public bundle, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: reference public bundle, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: reference public bundle, ETag `a42c53dbf773f2222aee514a5053b9f4`

Crosshatch is WebGPU-only in reference editor. WebGL passes through the source and still runs Bloom/Post. Hanzi Studio keeps the selected 3D Character as input.

## Exact Settings contract

### Crosshatch

| ID | Label | Default | UI range |
| --- | --- | --- | --- |
| `density` | Density | `6` | `1..50`, step `1` |
| `layers` | Layers | `3` | `1..4`, step `1` |
| `angle` | Angle | `45°` | `0..90`, step `5` |
| `line-width` | Line Width | **`0.08`** (UI `8`) | **stored `0.01..0.5`, step `0.01`; UI `1..50`, step `1`** |
| `randomness` | Randomness | `0` | `0..1`, step `0.05` |
| `invert` | Invert | `false` | toggle |

Line Width stays canonical as `0.01..0.5` in state/runtime and is multiplied by `100` only in the UI. Reset restores stored `0.08`, displayed as `8`.

### Background Lines (Hanzi extension)

| ID | Label | Default | UI range |
| --- | --- | --- | --- |
| `background-density` | Density | `12` | `1..50`, step `1` |
| `background-layers` | Layers | `1` | `1..4`, step `1` |
| `background-angle` | Angle | `45°` | `0..90`, step `5` |
| `background-line-width` | Line Width | `0.08` (UI `8`) | stored `0.01..0.5`, step `0.01`; UI `1..50`, step `1` |
| `background-randomness` | Randomness | `0` | `0..1`, step `0.05` |
| `background-speed` | Speed | `0.1` | `0..10`, step `0.1` |

Background Layers is a direct direction count: `1` base angle, `2` adds `+90°`, `3` adds `+45°`, and `4` adds `+135°`. These controls affect only raw-source background pixels; Character hatch geometry remains on the main Crosshatch controls.

### Adjustments and Color

- Brightness UI defaults: Light `-15`, Dark `4`; `-100..100`, step `1`. Light uses canonical/display scale `1`; Dark uses display scale `-1`, so its UI `4` maps to canonical `-4`. Both themes therefore present higher values as lighter hatch lines while retaining source-luminance/hatch-density rendering. Contrast: `0`, `-100..100`, step `1`.
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

1. Linear clamp source sample; apply canonical Brightness then Contrast for hatch-density calculation. Light UI uses the canonical sign; Dark UI negates it because the line/background palette polarity is reversed.
2. Luminance uses production coefficients `0.2326, 0.7152, 0.0722` (the red coefficient is intentionally not Rec.709/Rec.601).
3. Invert changes luminance only; `darkness=max(1-luminance,backgroundHatchFloor)`.
4. Hatch rotation: `rotatedX=uv.x*cos(a)-uv.y*sin(a)`, `rotatedY=uv.x*sin(a)+uv.y*cos(a)`.
5. `scaledX=rotatedX*resolution.x/spacing+phase`; spacing and AA use width only.
6. When Randomness is positive, deterministic hash/value noise adds phase wobble: `(noise-.5)*randomness*.4` from `vec2(floor(scaledX)*.1+seed*7,rotatedY*.02)*3`.
7. Raw-source background pixels contribute a Brightness-responsive minimum darkness of `clamp(.04-canonicalBrightness*.2,.006,.2)`. Their independent phase is `u_time*.08*backgroundSpeed`; Speed `0` freezes only the background pattern while shared motion remains the master timeline.
8. Hatch distance is `abs(fract(scaledX+phase+wobble)-.5)`; half width is `width*.5`; AA is `1.5/resolution.x`.
9. Build six cumulative tonal-art-map patterns:
   - base angle, perpendicular, denser base/perpendicular, +45°, +135° with production spacing/width multipliers `.7/.8/.9` and `1.5/1/.85`.
10. Layer collapse:
   - Layers 1: all tone levels reuse base hatch.
   - Layers 2: high levels reuse the perpendicular composite.
   - Layers 3: highest level reuses the first diagonal composite.
   - Layers 4: all six cumulative patterns.
11. Tone weights come from clamped `darkness*6` ramps and adjacent differences.
12. Darkest tones remain hatch-only; there is no solid model-color fill over the Character.
13. Background Lines use their own Density, Layers, Angle, Line Width, and Randomness. The selected 1–4 direction families are combined progressively with `max`, then blended with the Character hatch through the existing raw-source background transition.
14. Hatch output is intentionally not clipped to the Character mask; tonal lines may continue across the surrounding field.
15. Output is `mix(background,lineColor,hatchValue)`; Processing and Post then run once.

## Production quirks/contextual no-ops

- Density is actually pixel spacing: increasing it makes lines sparser.
- Line Width is uploaded raw. Values around/above 1 saturate hatch cells, making several pattern controls contextual no-ops; do not divide by 10.
- The former `solidFill` path was removed on 2026-07-14 because a dark Character source collapsed into a flat Line Color silhouette and hid the hatch lines.
- Main Layers are luminance-gated TAM direction availability, not a direct count of six tone levels. Background Layers directly counts direction families.
- Randomness is deterministic spatial wobble; the separate background Speed scales only the time-driven background phase.
- Canonical Brightness and Contrast affect mask luminance; Dark alone inverts the UI number for expected line-lightness direction.
- Invert changes pattern placement without swapping colors.
- Equal palette colors, zero Randomness, and saturated width create documented no-op contexts; fully bright background source retains the intentional hatch floor.
- Aspect ratio affects spacing and AA because only `resolution.x` is used.

## Hanzi Studio boundary

- Dedicated `crosshatch` renderer, exact schema/runtime/store behavior including persistent `0.08` Line Width default, CPU oracle, material, canvas, and explicit route.
- Preserve all Model deformation, transform, motion/time for shared Post, and deterministic disposal.
- Do not reuse Dithering's `crosshatch` sub-algorithm or import prior effect materials/generic runtime.
