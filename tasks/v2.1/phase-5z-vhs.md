# Phase 5Z — reference editor VHS parity

Date: 2026-07-14

## Production sources

- UI/state/WGSL: reference public bundle, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: reference public bundle, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: reference public bundle, ETag `a42c53dbf773f2222aee514a5053b9f4`

VHS is WebGPU-only in reference editor. WebGL passes through the source and still runs shared Post. Hanzi Studio keeps the selected 3D Character input and implements a dedicated WebGL shader with the production equations.

## Exact Settings contract

### VHS

- Distortion: `0.5`, `0..1`, step `0.05`.
- Noise: `0.3`, `0..1`, step `0.05`.
- Color Bleed: `0.5`, `0..1`, step `0.05`.
- Scanlines: `0.3`, `0..1`, step `0.05`.
- Tracking Error: `0.2`, `0..1`, step `0.05`.

### Adjustments

- Brightness and Contrast: `0`, `-100..100`, step `1`.
- All seven rows are always visible. VHS has no Animate or Speed control and continuously renders with accumulated seconds.

## Local control-ID boundary

Shared Post already owns the toggle ID `scanlines`. The old VHS placeholder reused that ID, so default creation/persistence overwrote VHS's numeric `0.3` with Post's boolean `false`, and VHS could sanitize Post input as a range. This is a real state-corruption bug.

- Effect-local VHS Scanlines uses internal key `vhs-scanlines` while retaining the exact visible label `Scanlines`.
- Shared Post keeps `scanlines`.
- Tests must prove numeric VHS Scanlines and boolean Post Scanlines persist, reset, and render independently.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | time seconds |
| `12` | Distortion raw |
| `16` | Noise raw |
| `20` | Color Bleed raw |
| `24` | VHS Scanlines raw |
| `28` | Tracking Error raw |
| `32,36` | Brightness/Contrast divided by 100 |

The uniform struct footprint is 64 bytes because its final `vec3f` padding aligns to 16 bytes.

## Exact rendering sequence

### 1. Tracking Error (`>0.01`)

- Twenty horizontal bands: `trackNoise=valueNoise([floor(uv.y*20),floor(time*2)])`.
- `trackOffset=(trackNoise-.5)*.1*trackingError`.
- Big jump gate: `valueNoise([time*.5,0]) >= .92`; contribution `(valueNoise([uv.y*5,time])-.5)*.3*trackingError`.
- Add both only to UV X.

### 2. Tape Distortion (`>0.01`)

- `warpFreq=3+valueNoise([time*.1,0])*5`; literal phase multiplier `6.28`.
- Add vertical wobble `sin(uv.y*warpFreq*6.28+time*2)*distortion*.02` to X.
- Add shake `(valueNoise([time*10,0])-.5)*distortion*.01`.
- Add top/bottom cubic edge warp `sin(time*3+uv.y*10)*pow(abs(uv.y-.5)*2,3)*distortion*.1`.
- Clamp the combined tracked/distorted UV once to `[0,1]`; all later stages use it.

### 3. Color Bleed (`>0.01`)

- `bleed=colorBleed*.01`.
- R samples `uv.x+2*bleed`, G samples center, B samples `uv.x-2*bleed`.
- Independently average five full-RGB samples at offsets `i*bleed`, `i=-2..2`.
- Final color is `mix(separatedRGB,fiveTapBlur,.3)`. The 30% mix is fixed; the control changes distance.
- At `<=.01`, use one center sample. Sampler edges clamp.

### 4. VHS Scanlines (`>0.01`)

- `pattern=sin(uv.y*resolution.y*3.14159)*.5+.5`.
- Multiply RGB by `mix(1,pattern,vhsScanlines*.5)`.
- For odd pixel rows, additionally multiply Red by `1-vhsScanlines*.1`.

### 5. Static Noise (`>0.01`)

- Fine grain: `(hash(uv*resolution+vec2(time*1000))-.5)*noise*.3`.
- Occasional band when `valueNoise([uv.y*100,time*5]) >= .97`: add `(hash([uv.x*100,time])-.5)*noise`.
- Rolling bar centered at `fract(time*.3)`, inclusive half-height `.02`; seed uses `floor(time*60)` and amplitude `noise*.5`.
- Each noise component adds equally to RGB; no clamp occurs yet.

### 6. Unconditional VHS treatment

Even when all five VHS sliders are zero:

1. Mix 10% Rec.601 grayscale.
2. Multiply Red by `1.1` and Blue by `.9`.
3. Multiply by fixed vignette `1-length((uv-.5)*[.5,.7])*.5` using warped/clamped UV.
4. Apply Brightness then Contrast and final clamp.

Processing is ignored; shared Bloom/Post runs after VHS.

## Contextual no-ops and quirks

- Every optional branch uses `>0.01`; production `.05` UI steps make `0` the only normal disabled value.
- All-zero VHS is never passthrough because grading and vignette are unconditional.
- Tracking/Distortion alter only X; VHS Scanlines depend on unchanged Y.
- Color Bleed is a contextual no-op on horizontally constant color.
- Tracking/Distortion can still affect a constant source through the warped-UV fixed vignette and enabled noise coordinates.
- Static noise is processed by grayscale tint, channel bias, vignette, and B/C before final clamp.
- Contrast `-100` collapses all final channels to `.5`, masking every VHS control and time phase.
- VHS continuously renders even with all dynamic sliders zero. Shared Post time uses the same global clock.
- VHS effect Scanlines can intentionally stack with Post Scanlines; VHS Noise with Post Grain; Color Bleed with Post Chromatic; fixed vignette with Post Vignette.
- WebGL production fallback makes all VHS settings visual no-ops, but local Hanzi uses the exact shader rather than degrading the effect.

## Hanzi Studio boundary

- Dedicated `vhs` renderer, exact schema/runtime/store contract, deterministic CPU oracle, independent material/canvas, and explicit route.
- Preserve shared Model deformation, transform, global animation clock, resize, and disposal.
- Migrate away from the collided placeholder state by treating only numeric `vhs-scanlines` as the effect value and leaving boolean shared `scanlines` untouched.
