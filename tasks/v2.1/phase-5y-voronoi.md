# Phase 5Y — Grainrad Voronoi parity

Date: 2026-07-14

## Production sources

- UI/state/WGSL: `https://grainrad.com/assets/index-D5s-AdpN.js`, ETag `2dab4b6866ace0e7533e9b4ba9f11803`
- WebGPU uploader: `https://grainrad.com/assets/index-DWlNRnaQ.js`, ETag `ba02c2c47ba6903bf24449e932fc725f`
- WebGL fallback: `https://grainrad.com/assets/index-D4g1FOHw.js`, ETag `a42c53dbf773f2222aee514a5053b9f4`

Voronoi is WebGPU-only in Grainrad. WebGL passes through the source and still runs shared Post. Hanzi Studio keeps the selected 3D Character input and implements a dedicated WebGL shader with the production equations.

## Exact Settings contract

### Voronoi

- Cell Size: `30`, `10..100`, step `5` pixels.
- Edge Width: `0.3`, `0..1`, step `0.05` cell-space threshold.
- Edge Color: `0`/Black (default), `1`/White, `2`/Darkened.
- Color Mode: `0`/Cell Average (default), `1`/Center Sample, `2`/Gradient.
- Randomize: `0.8`, `0..1`, step `0.05`.

### Adjustments

- Brightness and Contrast: `0`, `-100..100`, step `1`.
- All seven rows are always visible. Production stores select state numerically while its UI converts through string option values; Hanzi uses string IDs `"0".."2"` at the control boundary and explicit numeric shader mappings.
- Production's range display rounds non-integer-step values to one decimal, so `.05` neighbors can have the same visible text while preserving distinct state.

## Uniform ABI

| Offset | Value |
| --- | --- |
| `0,4` | resolution x/y |
| `8` | Cell Size raw pixels |
| `12` | Edge Width raw |
| `16` | Edge Color 0/1/2 |
| `20` | Color Mode 0/1/2 |
| `24` | Randomize raw |
| `28,32` | Brightness/Contrast divided by 100 |

The uniform struct has a 64-byte footprint because its final `vec3f` padding aligns to 16 bytes.

## Exact hash and ownership search

- `k=[0.3183099,0.3678794]`; `pp=p*k+k.yx`; `q=fract(pp.x*pp.y*(pp.x+pp.y))`; `hash2=fract(16*k*q)*2-1`. Both components share `q` and are correlated.
- In scaled cell space, search the `3×3` neighbor cells. Closest and second-closest distances start at `8`.
- Feature point: `neighbor+.5+hash2(integerCell)*Randomize*.5`.
- Returned `closestCell` is the integer lattice cell coordinate, not the randomized feature point despite the shader comment calling it a center.
- `edgeDist=secondClosest-closest`; `interiorMask=smoothstep(0,EdgeWidth*.3,edgeDist)`; final pre-adjustment color is `mix(edgeColor,cellColor,interiorMask)`.

## Exact Color Modes

### Cell Average (`0`)

- This is not a Voronoi polygon average.
- Around nominal `closestCell+.5`, sample a fixed `5×5` square stencil with dx/dy `-2..2`, offsets multiplied by `.2` cell units.
- Convert each point by `*CellSize/resolution`, clamp UV, take mip-0 linear samples, and divide the raw RGB sum by `25`.

### Center Sample (`1`)

- Sample mip 0 at the nominal, unrandomized lattice center `(closestCell+.5)*CellSize/resolution`, clamped to the source edge.

### Gradient (`2`)

- Sample current source RGB at the current UV and center RGB at the same nominal clamped center.
- `gradientT=smoothstep(0,.7,closestDistance)`.
- `cellColor=mix(centerColor,currentColor,gradientT*.5)`; current color contribution never exceeds 50%.

## Edge colors and adjustments

- Black: `[0,0,0]`.
- White: `[1,1,1]`.
- Darkened: `cellColor*.3`; the WGSL comment calls it Original, but UI and executable behavior are Darkened.
- Compose edge/interior first, then apply Brightness and Contrast once: `(color+b-.5)*((1+c)/(1-.99*c))+.5`, clamp.
- Processing is ignored; shared Bloom/Post runs after Voronoi.

## Contextual no-ops and quirks

- Edge Width `0` calls `smoothstep(0,0,edgeDist)`, whose result is indeterminate by WGSL; production nevertheless exposes it. Tests lock source parity away from the exact degenerate boundary without inventing a corrected meaning.
- Increasing Edge Width widens the edge-colored region; it is cell-space, so actual pixel width scales with Cell Size.
- Randomize moves feature points and changes ownership/edges, but all color sampling continues at unrandomized lattice centers.
- On a constant source all three Color Modes are equivalent; Cell Size/Randomize then affect only visible edge geometry.
- Gradient uses at most half the current source color.
- B/C applies to cell interiors and all edge modes. Contrast `-100` collapses every final channel to `.5`, making all effect-local settings visually irrelevant.
- Voronoi has no effect-local time and is static for still images; shared animated Post can still change output.
- WebGL production fallback makes all Voronoi settings visual no-ops, but local Hanzi uses the exact shader rather than degrading the effect.

## Hanzi Studio boundary

- Dedicated `voronoi` renderer, exact schema/runtime/store contract, deterministic CPU oracle, independent material/canvas, and explicit route.
- Preserve shared Model deformation, transform, global animation clock for Post, resize, and disposal.
