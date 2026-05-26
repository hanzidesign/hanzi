# Shader Effect Redesign Phased Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the shader-based 3D Hanzi character mesh editor described in `tasks/shader-effect-redesign-plan.md` through PM-reviewable phases.

**Architecture:** Replace the current SVG-filter effect surface with a WebGL `ShaderCanvas` that renders selected character SVG paths as grouped extruded meshes. Studio state moves from route-local React Context to a route-local persisted Zustand store, shader presets are typed registry entries backed by `.glsl` source files, and UI controls are split into Character, Shader, Mesh, and Displacement panels.

**Tech Stack:** Next.js 16 App Router, React 19, Mantine, Three.js, `@react-three/fiber`, `@react-three/drei`, Zustand, Vitest, `.glsl` source imports.

---

## PM Execution Rules

- Work phase by phase. Do not start the next phase until the checkpoint for the current phase is satisfied.
- After each checkpoint, report changed files, verification commands, failures, and visual status.
- Stop and re-plan if a stop trigger from `tasks/shader-effect-redesign-plan.md` occurs.
- Keep changes scoped to the shader redesign. Do not reintroduce export, upload, mint, queue, NFT, OpenAI, DALL-E, backend routes, auth, or database storage.
- Use pnpm for all dependency and script commands.
- Preserve `/` as the introduction page and `/studio` as the editor route.
- Do not use `any`. Avoid unsafe casts; if one is unavoidable, document why in the checkpoint report.

## Phase 0: Tooling And Shader Source Foundation

**Purpose:** Make the project able to import shaders, run helper tests, and compile before any UI or WebGL replacement work begins.

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `next.config.ts`
- Create: `@types/glsl.d.ts`
- Create: `shaders/types.ts`
- Create: `shaders/validation.ts`
- Create: `shaders/uniforms.ts`
- Create: `shaders/uniforms.test.ts`
- Create: `shaders/validation.test.ts`

**Steps:**

1. Install runtime dependencies:

   ```sh
   pnpm add three @react-three/fiber @react-three/drei zustand
   ```

2. Install test dependency:

   ```sh
   pnpm add -D vitest
   ```

3. Change `package.json` so `test` runs:

   ```sh
   vitest run
   ```

4. Add `.glsl` source import support in `next.config.ts` while preserving the existing production `removeConsole` compiler option. Use one small local loader for both Turbopack and webpack so dev and build resolve shader files to JavaScript string exports consistently.

5. Add `@types/glsl.d.ts`:

   ```ts
   declare module '*.glsl' {
     const source: string
     export default source
   }
   ```

6. Add `ShaderPreset`, `ShaderParam`, `ShaderParamValue`, and `ShaderParamValues` types in `shaders/types.ts`.

7. Add reserved uniform validation in `shaders/validation.ts`.

8. Add `hexToVector3`, `createDefaultParams`, `createUniformsFromParams`, and `sanitizeParamsForPreset` in `shaders/uniforms.ts`.

9. Write Vitest coverage for:
   - default params for number, color, boolean, and select
   - color hex to `THREE.Vector3`
   - boolean to `0` or `1`
   - select id to explicit numeric option value
   - reserved uniform collision rejection
   - stale persisted params sanitization

10. Run:

    ```sh
    pnpm test
    pnpm exec tsc --noEmit
    pnpm lint
    pnpm build
    ```

**Checkpoint 0: PM Review**

Stop after the commands above. PM should verify:

- Tests fail/pass for the right helper behavior, not just empty snapshots.
- `.glsl` import config works in `pnpm build`.
- No Studio UI behavior changed yet.
- No app code has been refactored before helper contracts are tested.

## Phase 1: Shader Preset Registry

**Purpose:** Add the built-in shader preset system independently of the WebGL canvas.

**Files:**
- Create: `shaders/shared/default-vertex.glsl`
- Create: `shaders/registry.ts`
- Create: `shaders/presets/flowing-noise/fragment.glsl`
- Create: `shaders/presets/flowing-noise/preset.ts`
- Create: `shaders/presets/kaleidoscope-noise/fragment.glsl`
- Create: `shaders/presets/kaleidoscope-noise/preset.ts`
- Create: `shaders/presets/grid-pulse/fragment.glsl`
- Create: `shaders/presets/grid-pulse/preset.ts`
- Create or modify: `shaders/registry.test.ts`

**Steps:**

1. Add a shared default vertex shader that:
   - declares `varying vec2 v_uv`
   - computes normalized object-space `v_uv`
   - supports `u_boundsMin`, `u_boundsMax`
   - applies global displacement map uniforms with conservative default behavior

2. Add 3 curated fragment shader presets from the sample set:
   - one organic/flowing preset
   - one kaleidoscope/noise preset
   - one grid/dots/dithering preset

3. Give each preset:
   - `id`
   - `name`
   - free-string `category`
   - `fragmentShader`
   - optional `vertexShader` left unset unless genuinely needed
   - `shaderPath`
   - `usesDisplacementMap`
   - schema-driven params

4. Add registry helpers:
   - `shaderPresets`
   - `getShaderPresetById`
   - `getDefaultShaderPreset`

5. Add tests proving:
   - all presets validate
   - all preset ids are unique
   - all defaults can generate complete params
   - no preset param collides with reserved uniforms

6. Run:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

**Checkpoint 1: PM Review**

Stop after registry verification. PM should verify:

- Presets are real `.glsl` files, not escaped strings.
- Preset categories display-ready free strings.
- Each preset has enough params to prove the dynamic panel works.
- Build still succeeds with shader source imports.

## Phase 2: Persisted Studio Store

**Purpose:** Move Studio editor state into a persisted route-local Zustand store before replacing the renderer.

**Files:**
- Create: `app/studio/studio-store.ts`
- Modify: `app/studio/StudioApp.tsx` or current equivalent if needed
- Modify later, not yet delete: `app/studio/studio-context.tsx`
- Create: `app/studio/studio-store.test.ts`

**Steps:**

1. Create Zustand state for:
   - selected character
   - selected shader preset id
   - complete current shader params
   - mesh controls
   - displacement controls
   - active panel
   - optional view/background color

2. Add actions:
   - `setCharacter`
   - `setSelectedPreset`
   - `resetParamsForPreset`
   - `updateParam`
   - `setMeshControl`
   - `setDisplacementControl`
   - `setActivePanel`
   - `setBackgroundColor`

3. Add `persist` middleware with a versioned key such as:

   ```txt
   hanzi-studio-shader-editor-v1
   ```

4. Persist only serializable editor state.

5. Add hydration/sanitization behavior:
   - missing preset id resets only shader preset and params
   - stale params rebuild from selected preset defaults
   - character, mesh, displacement, and view controls remain intact

6. Add tests for preset switching:
   - switching preset resets only `currentParams`
   - mesh/displacement/character are preserved

7. Run:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

**Checkpoint 2: PM Review**

Stop after store verification. PM should verify:

- Persisted state is serializable only.
- No Three.js objects, materials, textures, geometries, shader errors, or SVG text are persisted.
- Invalid persisted shader state does not wipe character or mesh work.
- Existing `/studio` still renders before the renderer swap.

## Phase 3: WebGL Canvas Skeleton

**Purpose:** Introduce the WebGL preview area with a placeholder mesh before SVG parsing is connected.

**Files:**
- Create: `components/studio/ShaderCanvas.tsx`
- Create: `components/studio/ShaderErrorOverlay.tsx`
- Modify: `components/studio/StudioCanvas.tsx`
- Modify: `components/studio/StudioShell.tsx` if layout constraints are needed

**Steps:**

1. Create `ShaderCanvas` as a client component.

2. Render a full-size `@react-three/fiber` `<Canvas>` inside the existing square Studio preview frame.

3. Add a simple placeholder extruded or box-like mesh using the selected shader material.

4. Add `OrbitControls` for inspection.

5. Add common uniforms:
   - `u_time`
   - `u_mouse`
   - `u_resolution`
   - displacement uniforms
   - bounds uniforms

6. Animate `u_time` with `useFrame`.

7. Track screen viewport pointer position over the preview and update `u_mouse`. Do not use mesh UV for this uniform; mesh-local shader sampling remains `v_uv`.

8. Apply selected preset switching and schema-driven uniforms to the placeholder mesh.

9. Apply persisted mesh controls to the placeholder mesh. Auto-rotation must use render-delta timing so speed remains fixed across different display refresh rates.

10. Add preview-area error overlay structure, even if compile-error detection is minimal in this phase.

11. Run:

    ```sh
    pnpm test
    pnpm exec tsc --noEmit
    pnpm lint
    pnpm build
    ```

12. Start dev server and inspect visually:

    ```sh
    pnpm dev
    ```

**Checkpoint 3: PM Visual Review**

Stop after visual verification. PM should verify:

- `/studio` shows a nonblank WebGL canvas.
- OrbitControls work for inspection.
- The WebGL canvas fills the square preview frame without replacing the Studio layout.
- Preset switching works through store/material logic and tests; a visible preset selector is not required until Phase 5.
- The placeholder mesh responds to persisted mesh controls, and auto-rotation speed is frame-rate independent.
- No hydration crash or SSR break.
- This phase does not yet need final character SVG mesh rendering.
- This phase wires neutral displacement uniforms only; real pattern texture loading belongs to the later displacement work.

## Phase 4: SVG To Extruded Character Mesh

**Purpose:** Replace placeholder geometry with selected character SVG paths parsed into grouped extruded meshes.

**Files:**
- Create: `components/studio/CharacterMesh.tsx`
- Modify: `components/studio/ShaderCanvas.tsx`
- Modify: `components/studio/StudioCanvas.tsx`
- Reuse: `assets/chars.ts`

**Steps:**

1. Resolve selected character URL from existing character helpers.

2. Fetch SVG text on character change with abort handling.

3. Parse SVG text with `SVGLoader`.

4. Convert each SVG path into shapes using `SVGLoader.createShapes(path)`.

5. Convert each shape into `ExtrudeGeometry`.

6. Render all geometries as grouped meshes sharing one shader material.

7. Center the group and compute bounds.

8. Feed bounds to `u_boundsMin` and `u_boundsMax`.

9. Use aspect-preserving mesh-local shader coordinates so shader effects and displacement patterns keep a 1:1 ratio. Do not stretch sampling independently across X and Y; pad the shorter axis instead.

10. Keep the previous valid character mesh visible while a newly selected character SVG is loading or parsing.

11. Show mesh loading status at the bottom of the parent div that wraps `<Center>` in `StudioCanvas`, outside `ShaderCanvas`.

12. Show mesh loading/parsing error text at the bottom of the parent div that wraps `<Center>` in `StudioCanvas`, outside `ShaderCanvas`. Do not fall back to non-extrudable SVG `<image>` fallback markup.

13. Apply mesh state:
   - extrusion depth
   - XYZ rotation
   - uniform scale
   - XY position
   - auto-rotation
   - auto-rotation speed

14. Run:

    ```sh
    pnpm test
    pnpm exec tsc --noEmit
    pnpm lint
    pnpm build
    ```

15. Start dev server and inspect multiple characters.

**Checkpoint 4: PM Visual Review**

Stop after visual verification. PM should verify:

- Character selection changes the rendered 3D mesh.
- The mesh is visibly extruded, not a flat mask.
- Shaders apply to all faces.
- Shader effects and displacement patterns keep a 1:1 ratio and do not visibly stretch to fit non-square character bounds.
- Loading and error text appear at the bottom of the parent div that wraps `<Center>` in `StudioCanvas`, not inside the `ShaderCanvas` preview.
- Orbiting shows real depth.
- Auto-rotation works and can be disabled.
- If SVG parsing fails for real character assets, stop and re-plan.

## Phase 5: Panels And Schema-Driven Controls

**Purpose:** Replace old effect/style controls with the final PM-approved control panels.

**Files:**
- Modify: `components/studio/StudioControls.tsx`
- Modify: `components/studio/CharacterPanel.tsx`
- Create: `components/studio/ShaderPanel.tsx`
- Create: `components/studio/MeshPanel.tsx`
- Create: `components/studio/DisplacementPanel.tsx`
- Remove or retire: `components/studio/EffectPanel.tsx`
- Remove or retire: `components/studio/StylePanel.tsx`

**Steps:**

1. Keep `CharacterPanel` focused on existing SVG preset selection.

2. Add `ShaderPanel`:
   - preset selector
   - preset name
   - preset category
   - dynamic param controls from schema
   - visual treatment that follows the current Studio panel style

3. Implement dynamic controls:
   - number -> slider plus value display
   - color -> color input
   - boolean -> switch or checkbox
   - select -> dropdown

4. Add `MeshPanel`:
   - extrusion depth
   - rotation x/y/z
   - uniform scale
   - position x/y
   - auto-rotate toggle
   - auto-rotate speed
   - optional background color

5. Add `DisplacementPanel`:
   - pattern image selector from `public/images/patterns`
   - displacement strength
   - displacement bias
   - status text or indicator when current shader preset does not use image distortion

6. Remove old StylePanel as character color controls.

7. Remove old SVG-filter EffectPanel once the replacement panels are connected.

8. Run:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

9. Start dev server and inspect all panels.

**Checkpoint 5: PM UI Review**

Stop after UI verification. PM should verify:

- Panels are split into Character, Shader, Mesh, and Displacement.
- Shader controls are schema-driven, not hard-coded per shader.
- Switching shader presets resets only preset params.
- Mesh and displacement settings persist across preset switches.
- StylePanel behavior is gone except optional view background color.

## Phase 6: Displacement Map Behavior

**Purpose:** Make the existing pattern images drive geometry displacement and optional shader image distortion.

**Files:**
- Create: `utils/patternAssets.ts`
- Modify: `components/studio/ShaderCanvas.tsx`
- Modify: `components/studio/CharacterMesh.tsx`
- Modify: `components/studio/DisplacementPanel.tsx`
- Modify: `shaders/shared/default-vertex.glsl`
- Modify relevant preset fragment shaders that opt into image distortion

**Steps:**

1. Add a typed list of available pattern URLs from `public/images/patterns`.

2. Load selected pattern image as a Three texture.

3. Pass texture to `u_displacementMap`.

4. Apply geometry displacement in the shared vertex shader with:
   - `u_displacementStrength`
   - `u_displacementBias`
   - displacement along normals

5. For presets with `usesDisplacementMap: true`, sample the map in fragment shader to distort `v_uv`.

6. Keep displacement strength conservative by default.

7. Run visual checks with several patterns and characters.

8. Run:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

**Checkpoint 6: PM Visual Review**

Stop after visual verification. PM should verify:

- Pattern selection visibly affects mesh displacement.
- Strength and bias controls have understandable effects.
- Presets that use image distortion visibly react to the same pattern.
- Displacement controls remain visible even for presets that do not use image distortion.
- If displacement is too faceted to be useful, stop and re-plan geometry density.

## Phase 7: Error Handling And Cleanup

**Purpose:** Finish compile-error resilience and remove obsolete SVG-filter implementation paths.

**Files:**
- Modify: `components/studio/ShaderCanvas.tsx`
- Modify: `components/studio/ShaderErrorOverlay.tsx`
- Remove or retire: `components/studio/SvgEffectView.tsx`
- Remove or retire: `components/studio/EffectPanel.tsx`
- Remove or retire: `components/studio/StylePanel.tsx`
- Remove or retire after all consumers are migrated: `app/studio/studio-context.tsx`
- Update: `tasks/todo.md`

**Steps:**

1. Implement preview-area blocking error overlay.

2. Overlay must show:
   - selected preset name
   - shader file path
   - short compile/runtime error summary where available

3. Keep controls usable while overlay is visible.

4. Keep previous valid `ShaderMaterial` in a ref until the new material renders without a WebGL program error.

5. If compile-error detection is unreliable because Three logs instead of throwing, stop and re-plan before adding invasive console interception.

6. Remove obsolete SVG-filter effect components after no imports remain.

7. Remove `studio-context.tsx` only after all consumers use the Zustand store.

8. Run removed-import searches:

   ```sh
   rg -n "SvgEffectView|EffectPanel|StylePanel|useStudio|StudioProvider|studio-context"
   ```

9. Run final local verification:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

10. Run final Codex/browser visual verification:
    - nonblank WebGL canvas
    - character switching
    - preset switching
    - schema-driven controls
    - mesh controls
    - displacement controls
    - refresh persistence
    - orbit inspection
    - error overlay if a deliberately broken local shader is temporarily introduced and then removed

**Checkpoint 7: Final PM Review**

Stop after final verification. PM should verify:

- The editor matches the product contract in `CONTEXT.md`.
- The implementation follows `tasks/shader-effect-redesign-plan.md`.
- The old SVG filter playground is no longer the active preview path.
- There are no hard-coded shader-specific control panels.
- No out-of-scope export/upload/mint/backend/AI features were added.
- Final verification commands and browser visual checks are documented in the implementation report.

## Final Handoff For Dev

Implement with `superpowers:executing-plans`.

At each checkpoint, provide:

- current phase number
- changed files
- test and build commands run
- visual checks performed
- open risks or blockers
- whether PM approval is needed before continuing

Do not batch all phases into one unchecked implementation pass.
