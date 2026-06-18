# Phase 5C Slices 2-6: 3D ASCII Renderer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish the Phase 5C renderer path so `/studio` shows a true SVG-derived 3D mesh with procedural ASCII shader output and Y-axis auto-spin animation.

**Architecture:** Keep the Slice 1 three-column workbench. Replace the center preview with `CharacterAsciiCanvas`, which parses the selected SVG into normalized extruded geometry, applies a mesh-attached ASCII shader material, and rotates the mesh group on the Y axis through `useFrame`. Add compact ASCII controls and style controls to the right panel, backed by serializable store state.

**Tech Stack:** React Three Fiber, Three.js `SVGLoader`/`ExtrudeGeometry`/`ShaderMaterial`, Zustand persisted compact controls, Mantine panels, Vitest contract/unit tests.

---

## Task 1: Store Contract For ASCII And Auto Spin

- Add failing tests for default ASCII controls and default mesh `autoRotate: true`.
- Add `ascii` state with cell size, density, contrast, invert, style, palette, depth/normal influence, scanlines, bloom, curvature, vignette, chromatic offset, and grain.
- Add `setAsciiControl`.
- Persist compact ASCII choices.

## Task 2: ASCII Shader Material

- Add failing unit tests for a material factory with required uniforms and procedural ASCII shader source.
- Implement `createAsciiShaderMaterial`.
- Include shader uniforms for time, mouse, resolution, cell size, density, contrast, invert, charset style, depth/normal influence, palette, scanline, bloom, curvature, vignette, chromatic offset, and grain.
- Draw procedural glyph cells in the fragment shader so the output is visibly ASCII rather than only pixelated.

## Task 3: Active 3D ASCII Canvas

- Add failing contract tests requiring the active `StudioCanvas` to mount `CharacterAsciiCanvas`.
- Implement `CharacterAsciiCanvas`.
- Parse selected SVG data with `SVGLoader`.
- Reuse `createCharacterMeshGeometries` for normalized extruded mesh geometry.
- Apply the ASCII material to the mesh group.
- Use `useFrame` for `u_time`, `u_resolution`, and Y-axis `group.rotation.y` auto-spin.
- Freeze time/spin when animation speed is `0` or playback is paused.

## Task 4: Right Panel ASCII Controls

- Add failing contract tests for `AsciiPanel` and `AsciiStylePanel`.
- Add the panels to the right side between Effect and Style Setting.
- Wire controls to `ascii` state.
- Do not add controls that do not affect the active renderer.

## Task 5: Replace Active Preview And Verify

- Make `/studio` center canvas render `CharacterAsciiCanvas`.
- Keep `CharacterSurfaceCanvas` as inactive fallback/source history only.
- Run focused tests, full tests, TypeScript, lint, build, and diff check.
- Do not run automated visual browser QA; provide the user a manual checklist for ASCII visibility and mesh auto-spin.

## Review Result

- Added `ascii` store state with serializable controls for cell size, density, contrast, inversion, charset style, palette, depth/normal influence, scanlines, bloom, curvature, vignette, chromatic offset, and grain.
- Added `setAsciiControl` with sanitization and persistence.
- Changed default mesh state to `autoRotate: true` and default animation speed to `1`, so the active mesh visibly spins unless the user pauses playback or sets speed to `0`.
- Added `components/studio/character-ascii-material.ts` with a Three `ShaderMaterial`, required ASCII uniforms, a procedural `glyph5x7` function, cell-grid sampling, normal/depth cues, palette mapping, scanlines, bloom, curvature, vignette, chromatic offset, and grain.
- Added `components/studio/CharacterAsciiCanvas.tsx`, which parses the selected SVG with `SVGLoader`, converts paths to true extruded 3D geometry through `createCharacterMeshGeometries`, applies the ASCII material, and updates Y-axis rotation with `groupRef.current.rotation.y` in `useFrame`.
- Replaced the active `StudioCanvas` renderer with `CharacterAsciiCanvas`; `CharacterSurfaceCanvas` remains in the repo as inactive Phase 5B history/fallback material.
- Added active renderer panels:
  - left: `AsciiMaterialPanel` for colors and mesh material shape controls;
  - left: `AsciiInteractionPanel` for global speed, Y rotation, mesh auto-spin, and spin speed;
  - right: `AsciiPanel` for ASCII cell/density/contrast/depth/normal controls;
  - right: `AsciiStylePanel` for charset, palette, and post-process style controls.
- Added tests:
  - `app/studio/studio-ascii-state.test.ts`
  - `components/studio/character-ascii-material.test.ts`
  - `components/studio/character-ascii-renderer-contract.test.ts`
  - `components/studio/ascii-panel-contract.test.ts`
- Verification passed:
  - `pnpm test app/studio/studio-ascii-state.test.ts components/studio/character-ascii-material.test.ts components/studio/character-ascii-renderer-contract.test.ts components/studio/ascii-panel-contract.test.ts`
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm lint` with two existing warnings
  - `pnpm build`
  - `git diff --check`

Manual QA checklist:

- Open `/studio` on desktop.
- Confirm the center canvas shows the selected Hanzi as a 3D object rendered with ASCII glyph/cell texture, not only a flat mask or pixelated surface.
- Confirm the mesh rotates on the Y axis by default.
- In the left `Interaction` panel, turn `Mesh Auto Spin` off and confirm rotation stops.
- Set `Global Speed` to `0` and confirm shader animation and auto-spin freeze.
- In the right `ASCII` panel, change `Cell Size`, `Density`, and `Contrast`; confirm the glyph/cell output changes visibly.
- In the right `ASCII Style` panel, change `Charset Style`, `Palette`, `Scanlines`, and `Curvature`; confirm visible changes.
