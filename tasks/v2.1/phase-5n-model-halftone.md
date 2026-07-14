# Phase 5N — Shared Model Panel + Halftone

Date: 2026-07-13  
Status: approved by direct user request; implementation in progress

## Scope

1. Add a shared `Model` panel directly below Character.
2. Keep geometry controls separate from `3D Motion`.
3. Implement Halftone as the second independent non-ASCII renderer.
4. Keep local input Character-only. `data/sample.jpg` remains a Grainrad-side research probe.

## Shared Model contract

The active 3D Character source uses one effect-independent geometry state:

| Control | Default | Range | Geometry behavior |
| --- | ---: | ---: | --- |
| Extrude | 0.18 | 0.01..1 | SVG `ExtrudeGeometry.depth` |
| Thickness | 0 | -0.4..0.4 | Expands/contracts the planar SVG outline |
| Bevel | 0 | 0..0.3 | Enables real extrude bevel geometry |
| Twist | 0° | -360..360° | Rotates cross-sections progressively through depth |
| Taper | 0 | -0.8..0.8 | Changes cross-section scale through depth |
| Bend | 0° | -360..360° | Curves the planar face into depth with sufficient subdivision |

ASCII, Dithering, Halftone, and every future 3D effect must consume these same geometry parameters. Rotation X/Y/Z and Speed remain in `3D Motion`.

## Authoritative Grainrad Halftone schema

Verified from the current Grainrad UI and public bundles:

- `Shape`: Circle / Square / Diamond / Line; default Circle.
- `Dot Scale`: 0.5..2, step 0.1, default 1.
- `Spacing`: 1..20px, step 1, default 8.
- `Angle`: 0..90°, step 5°, default 45°.
- `Invert`: false.
- `Brightness`: -100..100, step 1, default 0.
- `Contrast`: -100..100, step 1, default 0.
- `Mode`: `bw` / Mono or `color` / Original; default Mono.
- `Foreground`: #ffffff and `Background`: #000000, visible only in Mono.

Local Settings Reset resets Halftone only. Grainrad's current global non-ASCII reset bug is intentionally not copied.

## Halftone renderer semantics

- Adjusted source: `clamp((rgb + brightness - 0.5) * ((1 + contrast) / (1 - .99 * contrast)) + .5)` where brightness/contrast are UI values divided by 100.
- Luminance: `.299r + .587g + .114b`; Invert flips luminance before dot radius.
- Grid: rotate fragment coordinates around the origin by Angle; divide by Spacing; use centered fractional cell coordinates.
- Distances: Circle `length(local)`; Square `max(abs(x),abs(y))`; Diamond `abs(x)+abs(y)`; Line `abs(y)`.
- Radius: `sqrt(luminance) * .5`; antialias around the distance boundary.
- Dot Scale follows Grainrad's current implementation: it scales only the subtle multi-octave paper-noise luminance perturbation (`.02 * dotScale`), not grid spacing or base radius.
- Mono output mixes Foreground ink and Background paper. Original uses adjusted source as ink and Background as paper.
- Shared Processing and Post-Processing are real downstream shader stages.

## Verification gates

- Deterministic CPU oracle tests cover every Settings row and option.
- Material tests prove UI value → uniform mapping and real shader stages.
- Store tests prove selected-only reset, sanitization, persistence, and cross-effect isolation.
- Browser pixel checks freeze Motion, then change every Model and Halftone control independently.
- Full Vitest, TypeScript, ESLint, production build, `git diff --check`, and zero browser console/WebGL errors.

## Primary research sources

- `https://grainrad.com/assets/index-D5s-AdpN.js` — UI, defaults, Halftone WGSL.
- `https://grainrad.com/assets/index-DWlNRnaQ.js` — WebGPU uniform packing.
