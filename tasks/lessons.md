# Lessons

Keep this file as evergreen guidance only. Historical phase notes, completed task logs, and superseded implementation details belong in task docs or git history.

## Product And Scope

- When the user says the target is an SVG character editor, do not assume an export/download workflow. Confirm whether output actions exist before recommending them.
- Do not collapse the introduction homepage into the editor just because the product has one main workspace. If the user wants an intro page, keep `/` as introduction and put the editor on a named route such as `/studio`.
- Keep `/studio` as Hanzi Studio's editor route and avoid pathname-branching global shells when a feature has a clear route boundary.
- In a Next App Router project, do not introduce or preserve React Router-style routing. Prefer App Router files, `Link`, and route-local providers.
- For env cleanup, separate code/type contracts from actual secret files. Do not rewrite `.env*` files unless explicitly requested.
- When a panel selects a Hanzi SVG character, call it `Character`, not `Text`, unless there is actual text-entry or typography behavior.
- When the user says to write planning docs and not implement code, stop at documentation artifacts and keep application code untouched until explicit implementation approval.
- When the user says to work on the current branch or a specific branch, do not create a new worktree or branch unless they explicitly ask for one.

## Studio State And Persistence

- Do not assume Studio editor state should remain session-only once the user is designing heavier WebGL/shader controls. If refresh safety matters, treat local persistence as part of the product contract.
- Persist only compact serializable editor choices. Do not persist uploaded data URLs, generated mask/SDF textures, WebGPU availability, transient render errors, Three.js textures, geometries, or materials.
- Do not persist uploaded pattern image data URLs in localStorage. Treat uploaded pattern data as session-only because localStorage has practical size limits.
- Treat `ptnUrl` as the pattern source and `ptnData` as the SVG-filter-ready derived value in legacy SVG-filter code. Any editor path that changes `ptnUrl` must clear stale `ptnData` and trigger a fresh URL-to-data-URL conversion.

## UI And Interaction

- When replacing Studio panels, preserve the current Studio panel visual style unless the user explicitly asks for a new design system.
- Studio control panels should allow clicking the active accordion header to collapse it; preserve `null` as the collapsed active-panel state instead of coercing it to another panel.
- When the user explicitly asks to ask all planning/grill questions at once, batch the unresolved questions in one pass with recommended answers instead of defaulting to one-question-at-a-time pacing.

## Character Surface v2.1

- When the Studio direction is rasterized SVG mask plus shader deformation, do not force the prior Character Mesh/ExtrudeGeometry plan back into scope. Treat mesh/displacement docs as superseded unless the user explicitly reopens that architecture.
- The active v2.1 preview object is Character Surface, not Character Mesh. The active control system is Morph Stack, not Mesh/Displacement panels.
- "3D" in v2.1 means surface-depth illusion, z-axis deformation controls, lighting, normals, parallax, and heightfield-like effects on the Character Surface. It does not mean returning to extruded geometry as the primary preview.
- Morph Stack layer order is a creative control in the Sequential Warp Chain, so the UI should support drag reorder rather than treating order as a fixed implementation detail.
- Morph Stack randomization should draw only from Stable Morph Layer Catalogue entries by default; include Experimental layers only through an explicit opt-in.
- Morph Stack randomization must honor locked layers. A locked layer should keep its type, relative order, and parameters instead of being replaced, reordered, or mutated.
- Randomization locks should be scoped: Morph layer locks preserve deformation layers, Surface Shader Layer locks preserve foreground/background shader styling, and Pattern Layer locks preserve pattern source plus layer selector target.

## Shaders And Patterns

- Pattern is not background in Hanzi Studio. Keep pattern controls/assets when removing background tooling because pattern is part of the effect system.
- Morph Stack randomization should include shader colors by default, with separate Surface Shader Layers for foreground character mask and background canvas. Do not reduce the new direction to shape-only randomization or one global color.
- Pattern controls in the Character Surface direction should be UI Pattern Layers, each with exactly one layer selector target, and the editor should allow at most three Pattern Layers. Reusing one pattern across multiple targets should use multiple Pattern Layers, not a multi-target selector or one global Pattern Source picker.
- Do not prematurely lock Morph Stack to only fluid/ink deformation types. Research shader/filter/image-deformation techniques first, then include a broader option catalogue where each type still fits the Character Surface pipeline.

## Experimental Extensions

- Morph Layer Catalogue options may include an Experimental tier. Keep experimental effects explicit in UI/state instead of silently mixing unstable, heavy, or rough behavior into stable morph layers.
- Treat WebGPU and Vector Pre-Morph as Experimental Extensions: opt-in modules attached to the Character Surface pipeline, not new products, separate canvases, or required dependencies for the Stable path.
- Experimental Morph Layer options should appear inside the same Morph Stack panel with visible Experimental labeling, not in a separate parallel experimental stack.
- Vector Pre-Morph should be modeled as an Experimental Morph Layer shown inside Morph Stack, while the runtime applies it before SVG rasterization. Do not create a separate vector panel or use it to replace the raster shader pipeline.
