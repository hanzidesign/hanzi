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

- Treat Studio theme colors as two explicit saved sets. Inventory every color-bearing setting across every Effect, including color pickers, custom palettes, and color enums such as Voronoi Edge Color. Clicking the Theme toggle must immediately activate all of the selected theme's saved effect colors in both Settings and Canvas; do not only switch UI tokens, cover only ASCII, or derive/invert colors at toggle time.
- Do not assume Studio editor state should remain session-only once the user is designing heavier WebGL/shader controls. If refresh safety matters, treat local persistence as part of the product contract.
- Persist only compact serializable editor choices. Do not persist uploaded data URLs, generated mask textures, future generated SDF textures, WebGPU availability, transient render errors, Three.js textures, geometries, or materials.
- Do not persist uploaded pattern image data URLs in localStorage. Treat uploaded pattern data as session-only because localStorage has practical size limits.
- Treat `ptnUrl` as the pattern source and `ptnData` as the SVG-filter-ready derived value in legacy SVG-filter code. Any editor path that changes `ptnUrl` must clear stale `ptnData` and trigger a fresh URL-to-data-URL conversion.

## UI And Interaction

- When replacing Studio panels, preserve the current Studio panel visual style unless the user explicitly asks for a new design system.
- Studio control panels should allow clicking the active accordion header to collapse it; preserve `null` as the collapsed active-panel state instead of coercing it to another panel.
- When the user explicitly asks to ask all planning/grill questions at once, batch the unresolved questions in one pass with recommended answers instead of defaulting to one-question-at-a-time pacing.
- During v2.1 checkpoint verification, do not automatically run browser visual checks. Give the user a specific `/studio` visual checklist and wait for their report unless they explicitly request automated browser testing.
- Every implementation/status response should explicitly state the next concrete step so the user is never left asking what comes next.
- When a phase claims a visible rendering feature is inspectable, include the corresponding minimal UI controller in the same phase unless the user explicitly accepts a code-only renderer milestone.
- Do not leave legacy controls visible after replacing the active preview pipeline. Every visible Studio control must affect the active renderer, or it should be moved out of the active panel.
- Do not leave empty active Studio panels in a phase handoff. If a panel exists in the accordion, it must either contain usable controls for the current phase or be explicitly deferred/hidden until its implementation phase.
- Do not hand-roll complex gradient/color picker interactions unless explicitly requested. Use a proven picker library for draggable stops, color models, and gradient editing.
- When adapting a third-party controlled gradient picker, do not recreate its value from normalized persisted stops on every render. Preserve the picker draft string so selected stop state is not reset while editing.
- If a third-party picker already provides Solid/Gradient switching, do not duplicate that choice with a separate Studio style tab.
- When the user points to Efecto's layout for 3D ASCII, use a three-column workbench: left panel for selected text/character, color, material, and interaction; center canvas as the primary workspace; right panel for effect, ASCII, ASCII style, style settings, and post process. Do not keep all Phase 5C controls in one old left accordion.
- Do not add hidden visual effects that lack a corresponding Studio panel/controller. Effects such as grid, paper grain, shadow, trail, or edge treatment must either be controlled by Morph Stack, Shader, Pattern Layer, or Randomize UI, or not exist in the active renderer.
- Shader panel must control shader effects, not only color. If a shader preset changes depth, edge, lighting, blur, distortion, pattern response, or any visual algorithm, expose the corresponding parameters in the Shader panel before treating it as implemented.
- Effect Layer panels should use compact row UI, not expanded row cards. Keep Morph, Shader, Pattern, and Post stacks dense and stable-height; open advanced params in a separate inspector, modal, popover, or side detail surface.
- When matching an external reference site's structure and UI layout, do not copy its font stack unless the user explicitly asks for typography migration. Preserve Hanzi Studio's configured fonts as the default typography contract.
- When the user asks to redesign Hanzi Studio, keep the scope route-local to `/studio` unless they explicitly include the homepage. Do not redesign `/` as part of Studio-only work.
- When adapting Grainrad-like Studio UI, make effect/controller panels use the reference's compact section/row/range/select/grid language, but implement route-local light and dark theme tokens and follow the user's current requested default theme instead of assuming the reference site's dark default.
- Grainrad-matched Character Set must use the reference dropdown pattern, not a native select: uppercase trigger, dark floating option list, selected checkmark, and the option set `STANDARD / BLOCKS / BINARY / DETAILED / MINIMAL / ALPHABETIC / NUMERIC / MATH / SYMBOLS`.
- The Character chooser popover must have one shared vertical scroll area for the Country and Year/Character columns. Keep the `Country` and `Year` headings fixed above that shared scrollport; do not give each column its own scrollbar.
- Use the same disclosure symbols on the Character trigger as other Studio sections: collapsed `+`, expanded `−`; do not use `v` / `^` chevrons.
- Keep the Character chooser's shared scrollbar flush with the popover's right edge. Put content spacing inside the scrollport instead of padding the popover around the scrollport.
- Keep the Character chooser scrollbar at the explicitly selected 3px width in WebKit browsers. Hide its thumb until the shared list scrollport is hovered, then increase opacity again when the thumb itself is hovered.
- Do not apply `scrollbar-width: thin` unconditionally alongside a pixel-sized `::-webkit-scrollbar`; modern Chromium gives the standard property precedence, making the requested pixel width appear unchanged. Scope `thin` to browsers without WebKit scrollbar selectors.
- Scope `scrollbar-color` together with `scrollbar-width` to the Firefox fallback. Leaving either standard scrollbar property active in Chromium can keep the browser-native scrollbar and prevent the exact `::-webkit-scrollbar` width from appearing.
- For a hover-revealed scrollbar on the dark Studio theme, do not derive a translucent thumb from the already-dim border token; it becomes effectively invisible. Use the high-contrast text token with explicit hover alpha and `background-color`.
- For the Character popover, drive scrollbar visibility from explicit pointer enter/leave state on the scrollable list region. Do not treat a color adjustment as a substitute for the required interaction: enter list shows, leave list hides, and thumb hover increases opacity.
- Animate the Character popover thumb's visual opacity through alpha-mixed `background-color`: list enter fades it in, list leave fades it out, and thumb hover transitions to a stronger color. Do not make these visibility changes instantaneous.
- Do not set `opacity` directly on `::-webkit-scrollbar-thumb`; WebKit may ignore it while retaining the solid background, producing an always-visible full-strength scrollbar. Animate `background-color` between transparent and alpha-mixed colors instead.
- When the user asks for Grainrad effect settings, match the reference site's per-effect settings panels and catalogue behavior. Do not only render the left effect names without controller-backed settings and visible renderer behavior.
- In Grainrad parity work, do not confuse Processing with Animation. Grainrad `Processing` is a shared image/effect pipeline (`Invert`, `Brightness Map`, `Edge Enhance`, `Blur`, `Quantize Colors`, `Shape Matching`); motion/transform rows belong in the left `Animation` panel, not the right `Processing` section.
- Grainrad setting parity is not complete until every visible setting and option changes active renderer behavior. UI metadata, dropdown lists, and persisted values are insufficient without a runtime compiler, shader uniforms, tests that catch unmapped controls, and browser pixel smoke for representative effects.
- Never model Grainrad's Effect catalogue as variations of the ASCII renderer. ASCII owns glyph-atlas controls and runtime; each non-ASCII Effect needs its own schema, defaults, sanitizer/reset contract, compiler, and renderer path proven against Grainrad one setting at a time.
- For Phase 5M, `data/sample.jpg` is only a Grainrad website probe. The local Hanzi Studio must remain Character-only; use the selected Character to reproduce the same setting-change logic and never add a local image-input path.
- For Phase 5M UI parity, treat `data/Generated image 1.png` as the authoritative `/studio` layout reference. Use Grainrad itself for Settings/effect behavior research, not as a reason to drift away from that generated local layout.
- Keep model geometry separate from motion: place a dedicated `Model` panel directly below `Character`, with SVG Extrude as the baseline plus explicit geometry-deformation controls shared by every 3D Character effect. Keep rotation, playback, and speed in `3D Motion` instead of treating extrusion as motion.
- When planning Grainrad setting parity, list every effect in the grouped `Settings` / `Adjustments` / `Color` style before implementation, and write the expected visible/runtime behavior for every row and option. Do not replace this with a generic "all controls map to uniforms" statement.
- ASCII `Character Set` parity requires rendering from the actual selected character strings, such as `@%#*+=-:. `, `█▓▒░`, `01`, and the detailed ASCII density ramp. Procedural placeholder glyph shapes are not enough because the user expects visible text-character changes.
- Grainrad ASCII `Scale` is the ASCII cell/space size control from `1` to `20`, mapping from the smallest cell to roughly `64px`; it should not be multiplied again by a second shader scale. ASCII `Spacing` is glyph size inside the cell: `0` fills the cell, `1` shrinks the glyph to one quarter of the cell. Treat `Output Width` as output column count when present, or remove it if it cannot honestly affect ASCII resolution.
- Grainrad ASCII `Output Width` should stay in the visible useful range `0..600`: `0` means automatic/manual Scale, and values above `600` should be clamped in UI metadata, store sanitization, runtime compile output, and shader fallback because they collapse below meaningful glyph/canvas resolution.
- Grainrad ASCII `Color` must include `Mode`, `Foreground`, `Background`, and `Intensity`. Do not omit `Foreground`; it controls the glyph/ink color for mono-style ASCII output and should map into the active renderer, not only the UI.
- Grainrad ASCII `Color / Mode` should default to `mono`, and the right Settings `Reset` must restore `mono`. Keep the catalogue default, store initial state, reset path, runtime default, and UI fallback aligned so stale or missing controls do not silently return to `original`.

## Character Surface v2.1

- When the user says the current Character Surface shader framework failed, stop extending the fullscreen-plane/fake-3D path and re-plan around true 3D SVG geometry, mesh rotation, mesh-attached shader materials, time/mouse uniforms, particles, and feedback passes before touching renderer code again.
- When the Studio direction is rasterized SVG mask plus shader deformation, do not force the prior Character Mesh/ExtrudeGeometry plan back into scope. Treat mesh/displacement docs as superseded unless the user explicitly reopens that architecture.
- The active v2.1 preview object is Character Surface, not Character Mesh. The active control system is Morph Stack, not Mesh/Displacement panels.
- "3D" in v2.1 means surface-depth illusion, z-axis deformation controls, lighting, normals, parallax, and heightfield-like effects on the Character Surface. It does not mean returning to extruded geometry as the primary preview.
- When replacing the square preview with the fullscreen Character Surface, keep the selected Hanzi character fully visible, centered, upright, aspect-ratio preserving, and at the current preview's default visual scale. Do not treat fullscreen as permission to crop, stretch, shrink, or enlarge the character.
- Morph Stack layer order is a creative control in the Sequential Warp Chain, so the UI should support drag reorder rather than treating order as a fixed implementation detail.
- Morph Stack randomization should draw only from Stable Morph Layer Catalogue entries by default; include Experimental layers only through an explicit opt-in.
- Morph Stack randomization must honor locked layers. A locked layer should keep its type, relative order, and parameters instead of being replaced, reordered, or mutated.
- Randomization locks should be scoped: Morph layer locks preserve deformation layers, Surface Shader Layer locks preserve foreground/background shader styling, and Pattern Layer locks preserve pattern source plus layer selector target.
- v2.1 persisted state starts clean with a new storage key. Do not migrate old mesh/displacement state into the Character Surface store unless the user explicitly reopens that tradeoff.

## Shaders And Patterns

- When the user points to Efecto and says to focus on 3D ASCII Effect, make ASCII the first-class visual target. Do not dilute the next implementation slice with generic metal/glass/flow/particle effects before the rotating 3D ASCII character is proven.
- Shader styles must be visibly different for the default colors. Do not implement dark foreground effects as pure color multiplication, because black multiplied by lighting remains visually black.
- Pattern is not background in Hanzi Studio. Keep pattern controls/assets when removing background tooling because pattern is part of the effect system.
- Morph Stack randomization should include shader colors by default, with separate Surface Shader Layers for foreground character mask and background canvas. Do not reduce the new direction to shape-only randomization or one global color.
- Pattern controls in the Character Surface direction should be UI Pattern Layers, each with exactly one layer selector target, and the editor should allow at most three Pattern Layers. Reusing one pattern across multiple targets should use multiple Pattern Layers, not a multi-target selector or one global Pattern Source picker.
- Do not prematurely lock Morph Stack to only fluid/ink deformation types. Research shader/filter/image-deformation techniques first, then include a broader option catalogue where each type still fits the Character Surface pipeline.
- When the user confirms a Hanzi phase is personal research and explicitly approves shader libraries with noncommercial or trial-oriented licenses, record that scope decision and allow those libraries for that phase instead of blocking them under commercial-product assumptions.
- For Morph Stack phases, if the user asks for highest-extent enhancement, do not downgrade to a minimal adapter. Plan for visible Morph runtime, stronger Pattern Layer routing, richer randomization controls, and reusable shader/postprocessing libraries.
- Before implementing a high-extent shader/Morph phase with newly approved libraries, add a package capability research gate. Map each library to character shade targets, shape targets, operability controls, Randomize behavior, and fallback/defer decisions before production code.
- Treat shader libraries as implementation helpers, not product direction. For Hanzi art-effect phases, keep custom character-specific effects first-class and use LYGIA, glslify, and postprocessing only to extend the effect vocabulary or reduce low-level shader code.
- When planning font/character visual effects, explicitly cover character shape effects, character shade effects, pattern/material effects, background effects, randomization behavior, and shared control semantics before implementation.
- When the user expects shader, morph, and pattern effects to stack like design-tool layers, define the shared layer contract first: enabled, order where meaningful, intensity, blend mode where meaningful, lock, target, params, caps, and runtime compile phase. Do not jump directly into disconnected panels.
- For Three.js `ShaderMaterial` uniforms, GLSL `vec2`/`vec3`/`vec4` array uniforms must receive Three vector objects or another shape with `toArray()`. Do not pass plain nested number arrays to `vec4[]`; it will fail at runtime with `firstElem.toArray is not a function`.
- When adding GLSL helper functions for `ShaderMaterial`, place helpers in the shader string that calls them. A helper accidentally added to the vertex shader is not visible to the fragment shader and will only surface during browser WebGL compilation.

## Export

- Animated export must use a viewport-centered modal with a visible progress bar and an in-progress Cancel action. Do not auto-download completed exports; keep the encoded result in the modal and require an explicit Download action.
- PNG export is the direct-download exception and must render at exactly `2048×2048`. MP4, APNG, and GIF must render at exactly `1024×1024`.
- Sharp compression runs server-side, not in the browser. Use it for PNG and animated GIF only: the installed Sharp/libvips path was verified to preserve GIF pages/loop, but re-encoding APNG collapsed it to a static PNG, and Sharp does not support MP4 output.
- Fixed-size export must render the active effect into a separate hidden square WebGL canvas at the target resolution. Do not scale or stretch pixels copied from the visible preview canvas; that does not preserve true 1:1 rendering quality.
- Export format availability follows 3D Motion Speed: when Speed is above zero, disable PNG and enable animation formats; when Speed is zero, enable PNG and disable animation formats. Seed the export renderer from the preview's current effective animation time so the hidden render matches what the user sees.

## Experimental Extensions

- Morph Layer Catalogue options may include an Experimental tier. Keep experimental effects explicit in UI/state instead of silently mixing unstable, heavy, or rough behavior into stable morph layers.
- Treat WebGPU and Vector Pre-Morph as Experimental Extensions: opt-in modules attached to the Character Surface pipeline, not new products, separate canvases, or required dependencies for the Stable path.
- Experimental Morph Layer options should appear inside the same Morph Stack panel with visible Experimental labeling, not in a separate parallel experimental stack.
- Vector Pre-Morph should be modeled as an Experimental Morph Layer shown inside Morph Stack, while the runtime applies it before SVG rasterization. Do not create a separate vector panel or use it to replace the raster shader pipeline.
