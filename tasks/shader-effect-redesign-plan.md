# Shader Effect Redesign Implementation Plan

Status: planning only. Do not implement application code until explicit implementation approval.

## Goal

Replace the current SVG filter effect playground with a shader-based 3D character mesh playground on `/studio`. Preserve the existing introduction page and character SVG preset selection. The selected character SVG should be parsed into extruded geometry, rendered in a WebGL canvas, and shaded with selectable shader presets whose parameters update in real time.

## Non-goals

- Do not implement export, download, upload, mint, queue, NFT, auth, backend routes, database storage, or AI prompt generation.
- Do not reintroduce Web3, OpenAI, DALL-E, upload, or server-side conversion paths.
- Do not add source/license metadata to shader preset schema in v1.
- Do not hard-code one control panel per shader.
- Do not persist runtime objects such as Three.js textures, geometries, materials, compile errors, or loaded SVG text.

## Resolved Product Contract

- The current SVG effect view is replaced by a **Shader Effect View**.
- Character selection remains the existing Hanzi SVG preset feature.
- The shader preview target is an extruded **Character Mesh** derived from selected SVG paths.
- Shader presets apply an unlit `THREE.ShaderMaterial` to all faces of the extruded mesh.
- The editor persists safe serializable settings locally so refresh does not discard work.
- Global mesh controls are separate from shader preset params.
- Global displacement controls are separate from shader preset params.
- The same selected displacement map can drive both geometry displacement and shader image distortion when a preset opts in.

## Dependencies And Tooling

Add runtime dependencies with pnpm:

```sh
pnpm add three @react-three/fiber @react-three/drei zustand
```

Add unit-test tooling:

```sh
pnpm add -D vitest
```

Update `package.json`:

- `test`: `vitest run`
- Keep `lint`, `build`, `dev`, and `start` behavior intact.

Update `next.config.ts`:

- Add a minimal webpack rule for `.glsl` imports as raw source.
- Preserve existing production `removeConsole` behavior.

Add a TypeScript declaration:

- Add `declare module '*.glsl'` in a local declaration file such as `@types/glsl.d.ts`.

## Target File Shape

Prefer focused new files and remove old SVG-effect-specific files only when their replacement is in place.

```txt
app/studio/
  page.tsx
  studio-store.ts

components/studio/
  CharacterPanel.tsx
  ShaderPanel.tsx
  MeshPanel.tsx
  DisplacementPanel.tsx
  ShaderCanvas.tsx
  CharacterMesh.tsx
  ShaderErrorOverlay.tsx
  StudioControls.tsx
  StudioShell.tsx

shaders/
  types.ts
  registry.ts
  uniforms.ts
  validation.ts
  shared/
    default-vertex.glsl
  presets/
    flowing-noise/
      fragment.glsl
      preset.ts
    kaleidoscope-noise/
      fragment.glsl
      preset.ts
    grid-pulse/
      fragment.glsl
      preset.ts

utils/
  patternAssets.ts
```

Old components to retire or replace:

- Replace `SvgEffectView.tsx` with `ShaderCanvas.tsx` plus `CharacterMesh.tsx`.
- Replace `EffectPanel.tsx` with `ShaderPanel.tsx`, `MeshPanel.tsx`, and `DisplacementPanel.tsx`.
- Remove `StylePanel.tsx` as character color controls. Keep a simple canvas/background color setting only if the view needs it.
- Retire `app/studio/studio-context.tsx` as the state owner after the Zustand store is wired.

## Shader Preset Contract

Use one folder per preset plus a central typed registry.

```ts
type ShaderPreset = {
  id: string
  name: string
  category: string
  fragmentShader: string
  vertexShader?: string
  shaderPath: string
  usesDisplacementMap?: boolean
  params: ShaderParam[]
}
```

`category` is a free string.

Preset params use separate UI ids and GLSL uniform names:

```ts
type ShaderParam =
  | NumberParam
  | ColorParam
  | BooleanParam
  | SelectParam

type NumberParam = {
  type: 'number'
  id: string
  uniformName: string
  label: string
  default: number
  min: number
  max: number
  step: number
  unit?: string
}

type ColorParam = {
  type: 'color'
  id: string
  uniformName: string
  label: string
  default: string
}

type BooleanParam = {
  type: 'boolean'
  id: string
  uniformName: string
  label: string
  default: boolean
}

type SelectParam = {
  type: 'select'
  id: string
  uniformName: string
  label: string
  default: string
  options: Array<{ id: string; label: string; value: number }>
}
```

Param values:

```ts
type ShaderParamValue = number | string | boolean
type ShaderParamValues = Record<string, ShaderParamValue>
```

Initial implementation should include 3 curated built-in presets. Start with fragment-shader-only presets from the provided samples:

- flowing noise or rainbow flow
- kaleidoscope/noise
- grid, dots, or dithering

## Reserved Uniforms

Fail fast if a preset param `uniformName` collides with reserved global uniforms:

```txt
u_time
u_mouse
u_resolution
u_displacementMap
u_displacementStrength
u_displacementBias
u_boundsMin
u_boundsMax
```

If optional custom vertex shaders are used, they must honor the same global uniform contract and must set `v_uv`.

## Uniform Conversion

Implement helpers:

- `hexToVector3(hex: string): THREE.Vector3`
- `createDefaultParams(preset: ShaderPreset): ShaderParamValues`
- `createUniformsFromParams(preset: ShaderPreset, params: ShaderParamValues)`
- `validateShaderPreset(preset: ShaderPreset)`
- `sanitizeParamsForPreset(preset: ShaderPreset, params: ShaderParamValues)`

Conversion rules:

- number param -> float uniform
- color hex string -> `THREE.Vector3`
- boolean param -> float uniform, `1.0` or `0.0`
- select option id string -> explicit option numeric `value`

Do not use `any`. Prefer discriminated unions and narrow by `param.type`.

## Zustand Store

Create a route-local Zustand store, likely in `app/studio/studio-store.ts`.

State should include only serializable editor choices:

```ts
type StudioState = {
  character: {
    country: string
    year: string
    isTc: boolean
  }
  shader: {
    selectedPresetId: string
    currentParams: ShaderParamValues
  }
  mesh: {
    extrusionDepth: number
    rotation: { x: number; y: number; z: number }
    scale: number
    position: { x: number; y: number }
    autoRotate: boolean
    autoRotateSpeed: number
  }
  displacement: {
    patternUrl: string
    strength: number
    bias: number
  }
  view: {
    activePanel: 'character' | 'shader' | 'mesh' | 'displacement'
    backgroundColor: string
  }
}
```

Actions:

- `setCharacter(country, year, isTc?)`
- `setSelectedPreset(presetId)`
- `resetParamsForPreset(presetId?)`
- `updateParam(paramId, value)`
- `setMeshControl(partial)`
- `setDisplacementControl(partial)`
- `setActivePanel(panel)`
- `setBackgroundColor(color)`

Persistence:

- Use Zustand `persist` middleware with `localStorage`.
- Use a versioned storage key such as `hanzi-studio-shader-editor-v1`.
- Persist only serializable state.
- On hydration, if `selectedPresetId` no longer exists, reset only shader preset and params.
- If params are missing, invalid, or stale for the selected preset, rebuild params from current preset defaults.
- Preserve character, mesh controls, displacement controls, and view state when shader state is invalid.

Preset switching:

- Reset only `currentParams` to the new preset defaults.
- Preserve character, mesh controls, displacement controls, and view controls.

## Geometry Pipeline

Load the selected character SVG text on the client when `character` changes.

Recommended flow:

1. Resolve the selected character URL from existing `chars` helpers.
2. Fetch SVG text with abort handling.
3. Parse with `SVGLoader`.
4. For each parsed path, create shapes with `SVGLoader.createShapes(path)`.
5. Create one `ExtrudeGeometry` per shape.
6. Render all geometries as a grouped set of meshes sharing one `ShaderMaterial`.
7. Compute the group bounding box and center the geometries or group.
8. Provide `u_boundsMin` and `u_boundsMax` uniforms for normalized object-space UV calculation.

Extrusion defaults:

- Expose extrusion depth as a global mesh control.
- Use fixed geometry options first. Do not expose geometry-detail controls in v1 unless displacement quality is unacceptable.
- Use `bevelEnabled: false` initially unless visual QA proves bevel is needed.

Known risk:

- Image-based displacement quality depends on geometry density. `ExtrudeGeometry` may not have enough internal vertices for smooth front-face displacement. Keep initial displacement strength modest. If displacement looks too faceted, stop and re-plan the geometry-detail strategy instead of hiding the issue.

## Shader Canvas

`ShaderCanvas` must be a client component.

Use `@react-three/fiber`:

- Render a full-size `<Canvas>` inside the preview area.
- Render `CharacterMesh` as the main scene object.
- Use `OrbitControls` for inspection.
- Do not write orbit changes into Zustand.
- Animate `u_time` with `useFrame`.
- Track mouse over the canvas and update `u_mouse`.
- Update `u_resolution` from canvas size.
- Apply global mesh transform controls to the character group:
  - XYZ rotation
  - uniform scale
  - XY position
  - auto-rotation and speed

Use one unlit `THREE.ShaderMaterial`.

Shader stage behavior:

- Use shared `default-vertex.glsl` for v1.
- Presets provide `fragment.glsl`.
- Preserve optional `vertexShader` support in the preset contract for displacement or deformation presets.
- Default shared vertex shader computes normalized object-space `v_uv`.
- Default shared vertex shader applies global displacement-map geometry displacement.
- Fragment shaders can opt into image distortion by using the global displacement map uniforms when `usesDisplacementMap` is true.

## Displacement Maps

Reuse existing `public/images/patterns` images.

Controls:

- pattern image
- displacement strength
- displacement bias

Uniforms:

- `u_displacementMap`
- `u_displacementStrength`
- `u_displacementBias`

Panel behavior:

- Always show global displacement controls.
- Indicate when the selected shader preset does not use image-based shader distortion.
- Mesh displacement remains global even when the fragment shader does not use the displacement map.

Implementation detail:

- Load public pattern assets directly as Three textures.
- Do not reuse the old SVG filter `ptnUrl -> ptnData -> feImage` path for WebGL textures.

## Error Handling

Shader compile/runtime errors should not crash the whole page.

Behavior:

- Show a blocking overlay inside the preview area.
- Include selected preset name and `shaderPath`.
- Keep controls usable so the user can switch presets or adjust params.
- Optimistically switch shaders in v1.
- Keep the previous `ShaderMaterial` in a ref until the new material renders without a WebGL program error.
- If compile-error capture is unreliable because Three logs instead of throwing, stop and re-plan before adding invasive console interception.

## UI Plan

Keep `/` as the introduction page and `/studio` as the editor route.

Studio panels:

- `Character`: existing character SVG preset selection.
- `Shader`: preset selector, preset name, category, and schema-driven param controls.
- `Mesh`: extrusion depth, rotation, scale, position, auto-rotate, auto-rotate speed, optional background color.
- `Displacement`: pattern image selector, strength, bias, and selected-preset image-distortion support status.

Dynamic controls:

- number -> slider plus value display
- color -> color input
- boolean -> switch or checkbox
- select -> dropdown

Do not create one custom panel per shader.

## Verification Plan

Run local static checks:

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Browser visual verification:

1. Start the dev server with `pnpm dev`.
2. Open `/studio` in the Codex/browser tool.
3. Verify the WebGL preview is nonblank.
4. Verify character selection changes the 3D mesh.
5. Verify shader preset switching updates the material and resets only preset params.
6. Verify mesh controls affect extrusion, rotation, scale, position, and auto-rotation.
7. Verify displacement pattern/strength/bias visibly affects the mesh.
8. Verify the Displacement panel indicates when the selected shader does not use image distortion.
9. Verify OrbitControls inspect the mesh without mutating editor state.
10. Verify refresh preserves safe editor state.
11. Verify production build still succeeds after `.glsl` import configuration.

Focused unit tests:

- `createDefaultParams` creates complete params for all param types.
- `createUniformsFromParams` converts number/color/boolean/select correctly.
- `hexToVector3` handles valid hex colors.
- preset validation rejects reserved uniform collisions.
- stale persisted params are sanitized against the current preset schema.
- missing persisted preset id falls back without clearing character/mesh/displacement state.

## Implementation Order

1. Add dependencies, Vitest, `.glsl` import support, and declarations.
2. Add shader types, validation, uniform helpers, and unit tests.
3. Add 3 shader preset folders and central registry.
4. Add Zustand store with persistence and stale-state sanitization.
5. Replace context consumers with store selectors for existing character selection.
6. Build `ShaderCanvas` and basic Three scene with a placeholder mesh.
7. Implement SVG parsing into grouped extruded meshes.
8. Add shared material, common uniforms, `useFrame` updates, and preset switching.
9. Add global mesh controls.
10. Add displacement map texture loading and geometry displacement.
11. Add schema-driven `ShaderPanel`.
12. Split controls into Character, Shader, Mesh, and Displacement panels.
13. Add preview error overlay and last-valid material fallback.
14. Remove retired SVG filter effect components and stale style controls.
15. Run full verification and fix issues found by visual QA.

## Stop And Re-plan Triggers

Stop implementation and re-plan if any of these happen:

- SVG parsing fails for a meaningful portion of current character assets.
- `ExtrudeGeometry` displacement is too faceted to be useful without a geometry-density strategy.
- Shader compile errors cannot be detected well enough to show the requested overlay.
- Zustand persistence causes hydration mismatch or stale state crashes.
- `.glsl` raw imports work in dev but fail production build.
