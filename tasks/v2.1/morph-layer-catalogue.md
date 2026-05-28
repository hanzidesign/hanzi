# Morph Layer Catalogue

**Purpose:** Maintain a broad, research-backed option catalogue for **Morph Stack** layers. This prevents v2.1 from collapsing into fluid-only effects while keeping each effect compatible with the Character Surface pipeline.

## Catalogue Rules

- Every entry has `id`, `name`, `category`, `tier`, `params`, and shader/runtime capability notes.
- `tier` is `stable` or `experimental`.
- Stable entries must be fast, deterministic, randomizable, and composable in a sequential warp chain.
- Experimental entries may be heavier or rougher, but must be clearly labelled in UI and state.
- Experimental entries appear inside the same Morph Stack, not a parallel stack.
- Vector Pre-Morph appears as a Morph Stack layer, but runtime applies it before SVG rasterization.

## Stable Candidate Families

Phase 2 implements this first Stable set before expanding the broader catalogue: `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.

### Coordinate Warp

Examples:

- affine offset
- perspective bend
- polar warp
- sine bend
- mirror fold
- kaleidoscope

Good first entries:

- `sine-bend`
- `polar-warp`
- `kaleidoscope-fold`

### Lens And Local Warp

Examples:

- bulge
- pinch
- twist
- swirl
- fisheye
- shockwave

Good first entries:

- `swirl-well`
- `bulge-pinch`
- `shockwave-ring`

### Field And Noise Warp

Examples:

- curl flow
- domain warp
- FBM chaos
- turbulence

Good first entries:

- `curl-flow`
- `domain-warp`
- `fbm-chaos`

### Slice And Glitch Warp

Examples:

- band slice
- scanline drift
- RGB split
- block jitter
- datamosh-like offset

Good first entries:

- `band-slice`
- `scanline-drift`
- `block-jitter`

### Pixel Structure

Examples:

- pixelate
- dither
- halftone
- mosaic
- crosshatch

Good first entries:

- `pixelate-grid`
- `halftone-dot`
- `ordered-dither`

### Morphology And Stroke Shape

Examples:

- dilate
- erode
- open
- close
- edge grow
- stroke thinning
- blob merge

Good first entries:

- `ink-compression`
- `stroke-erode`
- `edge-grow`

### Surface Depth

Examples:

- heightfield
- normal lighting
- parallax
- emboss
- bevel
- fake AO

Good first entries:

- `surface-depth`
- `emboss-light`
- `parallax-sheet`

## Experimental Candidate Families

### Vector Pre-Morph

Examples:

- path jitter
- path smoothing
- contour offset
- control-point noise
- shape interpolation

Runtime note: executes before rasterization, then feeds the same Character Surface rasterization pipeline.

### Pixel Sorting And Run Deformation

Examples:

- luminance sort
- directional sort
- threshold run stretch
- ink run

Runtime note: true long-run sorting is expensive in fragment shaders. Start with local/approximate versions and mark as Experimental.

### Temporal And Feedback

Examples:

- afterimage
- trail
- decay
- feedback advection
- ping-pong flow

Runtime note: requires render targets and previous-frame feedback. Keep separate from Stable randomization unless explicitly opted in.

### Renderer Extensions

Examples:

- WebGPU/TSL renderer track
- compute-style feedback prototype

Runtime note: renderer-level extension, not a Morph Stack layer. Keep WebGL as Stable fallback.

## Research References

- glfx.js: WebGL filter-chain examples such as bulge/pinch and zoom effects.
- PixiJS filters: practical filter categories for displacement, glitch, RGB split, pixelate, shockwave, and twist.
- gl-transitions: large GLSL transition catalogue useful for warp, wipe, grid, and kaleidoscope ideas.
- OpenCV geometric transforms: `remap`, affine, perspective, and polar transformation mental models.
- Paper.js and SVG morph libraries: vector path smoothing, simplification, interpolation, and control-point deformation references.
