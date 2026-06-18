# Hanzi Studio v2.1 Rendering Architecture Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status:** Planning package. Do not implement application code until explicit implementation approval.

**Goal:** Replace the current flat Character Surface direction with a true **3D ASCII Effect** renderer. Phase 5B upgraded the fullscreen Character Surface into a shader-first effect engine, but user visual feedback on 2026-06-18 rejected that flat renderer as insufficient. Phase 5C now focuses on an Efecto-inspired pipeline: selected SVG -> rotating 3D geometry -> offscreen render -> ASCII shader/post-processing output.

**Architecture:** Phase 5B's stable path is a single Three/WebGL fullscreen Character Surface. Phase 5C proposes replacing the active preview with a true Three.js scene where SVG paths compile to 3D geometry, rotate on the Y axis, render into color/depth/normal buffers, and feed an ASCII post shader. The Studio UI also changes to an Efecto-style three-column workbench: left panel for selected text/character, color, material, and interaction; center canvas for the live 3D ASCII preview; right panel for effect, ASCII, ASCII style, style settings, and post process. The first-class effect controls are ASCII cell size, character set/style, density, contrast, palette, depth/normal influence, bloom, CRT finishing, animation speed, and pointer response. Morph, Shader, Pattern, Post, Animation, Randomize, locks, and experimental extensions remain registry-driven editor controls that persist only serializable choices and render only through visible panel rows.

**Tech Stack:** Next.js 16 App Router, React 19, Mantine, Three.js, `@react-three/fiber`, Zustand, Vitest, GLSL shader modules, Canvas 2D rasterization.

---

## Development Branch

Develop this architecture directly on the `v2.1` branch. Do not move v2.1 implementation into another feature branch or worktree unless the user explicitly asks for that later.

## Source Of Truth

This `tasks/v2.1/` package supersedes:

- `tasks/shader-effect-redesign-plan.md`
- `tasks/shader-effect-redesign-phased-implementation-plan.md`

Those older plans target the old **Character Mesh** product shape: `ExtrudeGeometry`, square `AspectRatio` preview, mesh controls, and **Displacement Map** behavior. Phase 5C may salvage geometry and shader seams from that old implementation, but it must not restore the old mesh/displacement UI or product contract unchanged.

## Phase Index

1. [Phase 0: Plan And Architecture Lock](./phase-0-architecture-lock.md)
2. [Phase 1: Character Surface Foundation](./phase-1-character-surface-foundation.md)
3. [Phase 2: Morph Layer Catalogue](./phase-2-morph-layer-catalogue.md)
4. [Phase 3: Morph Stack State And Randomization](./phase-3-morph-stack-state-randomization.md)
5. [Phase 4: Surface Shader And Pattern Layers](./phase-4-surface-shaders-pattern-layers.md)
6. [Phase 5: Studio Panel UX](./phase-5-studio-panel-ux.md)
7. [Phase 5B: Shader-First Effect Engine Plan](./phase-5b-shader-first-effect-engine-plan.md)
8. [Phase 5C: 3D ASCII Shader Effect Research](./phase-5c-true-3d-shader-art-engine.md)
9. [Phase 6: Experimental Extensions](./phase-6-experimental-extensions.md)
10. [Phase 7: Cleanup And Verification](./phase-7-cleanup-verification.md)

Supporting docs:

- [Morph Layer Catalogue](./morph-layer-catalogue.md)
- [Phase 5 Layer Compositing Guidelines](./phase-5-layer-compositing-guidelines.md)
- [Checkpoint List](./checkpoints.md)

## Current Phase 5C Re-Plan

Phase 5C is the active architecture checkpoint after user feedback rejected the Phase 5B flat Character Surface visual result.

Phase 5C direction:

1. Stop extending the fullscreen-plane/fake-3D path.
2. Salvage old true-3D seams from `CharacterMesh`, `character-mesh-geometry`, and mesh `shader-material`.
3. Make the selected SVG compile into true 3D geometry.
4. Render that 3D geometry into offscreen buffers, then transform the result through a procedural ASCII shader/post effect.
5. Rebuild `/studio` as a three-column workbench: left source/object panel, center canvas, right ASCII/effect panel.
6. Make Y-axis rotation, time uniforms, pointer uniforms, ASCII style, ASCII density, depth/normal influence, palette, bloom, and CRT finishing first-class renderer behavior.
7. Keep Phase 5B's registry/control discipline so every visible effect remains panel-backed.
8. Implement only after the user approves the Phase 5C architecture and layout.

See [Phase 5C: 3D ASCII Shader Effect Research](./phase-5c-true-3d-shader-art-engine.md).

## Previous Phase 5B Overlay

Phase 5B was the shader-first overlay for making the Studio output closer to the reference-image direction. It strengthened the Character Surface model, but user feedback on 2026-06-18 rejected that flat renderer as the primary path.

Execution order:

1. Effect Registry and catalogue tests.
2. Derived glyph buffers and `glyphDistancePack`.
3. Shader Layer stack state and compact detail surface.
4. Tracer A: SDF Relief Character.
5. Tracer B: Print Damage Character.
6. Tracer C: Chrome/Glass Character.
7. Animation panel with `Speed = 0` freeze behavior.
8. Pattern modulation and Post FX foundation.
9. Tracer D: Experimental Feedback Character.
10. Coherent Randomize presets and manual `/studio` QA.

Phase 5B confidence gates:

- Every visible effect must have a compact panel row and UI parameter schema.
- No grid, paper, scanline, shadow, stain, trail, or background mark may render without a corresponding enabled row.
- SDF, edge, height, normal, flow, and scatter buffers are runtime data derived from the selected SVG, not new source assets.
- The first visual proof path is SDF relief, then print damage, then chrome/glass, then feedback simulation.
- Feedback, reaction-diffusion, advection, pixel-sort, and raymarched interior effects remain Experimental until their reset, freeze, and disable behavior is proven.

## PM Execution Rules

- Work phase by phase. Stop after each checkpoint.
- Implement directly on branch `v2.1`.
- Do not keep implementing if a checkpoint reveals a wrong assumption; re-plan first.
- Preserve `/` as the introduction page and `/studio` as the editor route.
- Preserve current Studio panel visual style unless the user explicitly asks for a new design system.
- Do not reintroduce export, mint, queue, NFT, wallet, AI-generation, backend storage, or remote upload workflows.
- Use `pnpm` for all commands.
- Treat local uploads as session-only. Do not persist uploaded data URLs, generated mask textures, future generated SDF textures, WebGPU availability, or transient render errors.
- During checkpoint visual QA, do not automatically run browser automation. Tell the user which `/studio` checks to perform and wait for their report unless they explicitly request automated browser verification.

## Pre-5C Stable Product Contract

The following contract describes the Phase 5B Character Surface renderer. Phase 5C can replace renderer-specific clauses after the true-3D architecture is approved, while preserving the non-renderer product boundaries such as `/studio`, no export/mint/upload workflows, local persistence rules, visible panel-backed controls, and manual visual QA.

- Canvas preview becomes fullscreen within the right-side preview area; remove the square `AspectRatio` wrapper.
- Selected Hanzi SVG is rasterized to a mask texture first. Phase 5B derives SDF, edge, height, normal, flow, and scatter buffers from that mask for material, contour, print, distortion, and feedback effects.
- **Morph Stack** is a sequential warp chain with reorderable layers.
- Morph, Shader, Pattern, Post, and Animation-capable effect layers use a shared stack control language: compact row, visibility, order where meaningful, strength/intensity, blend mode where meaningful, lock, params, target, tier, and detail affordance.
- **Morph Layer Catalogue** contains Stable and Experimental entries.
- The first Stable implementation set is `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.
- Randomize creates a complete Morph Stack preset from a seed.
- Randomize defaults to Stable layers only and can explicitly include Experimental entries.
- Randomization respects locks on Morph layers, Surface Shader Layers, and Pattern Layers.
- Randomization may update existing unlocked Pattern Layers, but it does not add or remove Pattern Layers by default.
- **Surface Shader Layers** are separate foreground character and background canvas layers.
- Shader Layers must expose algorithmic controls, not only color controls.
- **Pattern Layers** are UI layers, not a global pattern picker. There are at most three; each targets exactly one selector.
- Pattern Layers must visually accumulate within their target instead of only the first valid texture applying.
- Pattern Layer target `Morph Stack` applies to the entire morph pipeline, not an individual morph layer.
- Persisted v2.1 editor state starts from a clean storage key rather than migrating old mesh/displacement state.
- Renderer selection persists as `webgl` or `webgpu-experimental`, defaulting to `webgl`; WebGPU is a renderer capability, not a Morph Layer.

## Verification Baseline

Run at every implementation checkpoint unless the phase explicitly narrows scope:

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Manual browser visual verification must cover:

- desktop `/studio`
- mobile `/studio`
- fullscreen Character Surface is nonblank
- character switching updates the rasterized surface
- randomization changes visible output while locked controls stay stable
- no page console errors
