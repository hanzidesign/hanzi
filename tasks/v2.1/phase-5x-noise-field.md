# Phase 5X — reference editor Noise Field parity

Date: 2026-07-14

## Production sources

- UI/state/WGSL: reference public bundle, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: reference public bundle, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: reference public bundle, ETag `a42c53dbf773f2222aee514a5053b9f4`

Noise Field is WebGPU-only in reference editor. WebGL passes through the source and still runs shared Post. Hanzi Studio keeps the selected 3D Character input and implements a dedicated WebGL shader with the production equations.

## Exact Settings contract

### Noise Field

- Noise Type: `perlin`/Perlin (default), `simplex`/Simplex, `worley`/Worley.
- Scale: `50`, `10..100`, step `5`.
- Intensity: `1`, `0.5..3`, step `0.1`.
- Octaves: `4`, `1..8`, step `1`.
- Speed: `1`, `0.1..3`, step `0.1`.
- Animate: `true`.
- Distort Only: `false`.

### Adjustments

- Brightness and Contrast: `0`, `-100..100`, step `1`.
- All nine controls are always visible. Animate OFF does not hide Speed; Distort Only does not hide anything.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | scale raw |
| `12` | intensity raw |
| `16` | speed raw |
| `20` | time seconds |
| `24` | octaves raw |
| `28` | animate: false 0, otherwise 1 |
| `32,36` | brightness/contrast divided by 100 |
| `40` | Noise Type: Perlin 0, Simplex 1, Worley 2 |
| `44` | Distort Only false 0, true 1 |

The WGSL comment says Octaves `1..6`, but the production UI and executable loop allow `1..8`; the UI is authoritative.

## Exact noise functions

- `hash(p)=fract(sin(dot(p,[127.1,311.7]))*43758.5453)`.
- `hash2` uses the same X hash and a Y hash with dot constants `[269.5,183.3]`.
- Perlin is production's smooth value noise: floor/fract cell, cubic `u=f*f*(3-2*f)`, then bilinear mix of four scalar hashes.
- Simplex is the exact three-corner approximation with `K1=.366025404`, `K2=.211324865`, `h=max(.5-[dot(a,a),dot(b,b),dot(c,c)],0)`, `h^4` weighted dot gradients, and factor `70`; `getNoise` converts it with `*.5+.5`.
- Worley searches the `3×3` neighbor cells, uses `hash2` feature points, and returns the minimum Euclidean distance starting from `1`.
- FBM starts `value=0`, `amplitude=.5`; each octave adds `amplitude*getNoise`, doubles position, halves amplitude, and does not normalize.

## Exact rendering logic

1. `animatedTime = animate ? time*speed : 0`.
2. `noisePos = uv*scale + vec2(animatedTime*.1)`.
3. Generate `noiseVal=fbm(noisePos)` and `noiseVal2=fbm(noisePos+[100,100])`.
4. `displacement=(vec2(noiseVal,noiseVal2)-.5)*2*intensity*.02`.
5. Sample the source at `clamp(uv+displacement,0,1)` with linear clamp sampling.
6. Apply Brightness then Contrast: `(color+b-.5)*((1+c)/(1-.99*c))+.5`, clamp.
7. Unless Distort Only is true, compute `overlay=fbm(uv*scale*2+vec2(animatedTime))*0.1`, then add `overlay*intensity*.3` equally to RGB.
8. Clamp final RGB. Processing is ignored; shared Bloom/Post runs after Noise Field.

## Contextual no-ops and quirks

- Speed is a contextual no-op when Animate is OFF.
- Animate OFF freezes noise at time zero, but the reference editor keeps continuous RAF running.
- Distort Only means displacement without overlay; it does not disable displacement or become passthrough.
- Brightness/Contrast apply after displaced sampling but before overlay; overlay can brighten already-clamped adjusted colors before the final clamp.
- Overlay is positive-only because every production noise branch is converted/returned non-negative.
- Intensity controls both displacement and overlay when Distort Only is false, but only displacement when true.
- Scale controls base noise frequency; overlay uses twice that spatial scale.
- UV displacement clamps at the source edge rather than wrapping.
- WebGL production fallback makes all Noise Field settings visual no-ops, but local Hanzi uses the exact shader rather than degrading the effect.

## Hanzi Studio boundary

- Dedicated `noise-field` renderer, exact schema/runtime/store contract, deterministic CPU oracle, independent material/canvas, and explicit route.
- Preserve shared Model deformation, transform, animation clock, resize, and disposal.
- Global 3D Motion Speed controls the shared effective clock; Noise Field Speed then multiplies that time inside the effect, matching the two separate controls.
