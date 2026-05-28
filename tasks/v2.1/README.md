# Hanzi Studio v2.1 Character Surface Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Status:** Planning package. Do not implement application code until explicit implementation approval.

**Goal:** Replace the current 3D Character Mesh direction with a fullscreen **Character Surface** that rasterizes selected Hanzi SVGs into mask textures and applies shader-driven deformation through a **Morph Stack**. SDF support is deferred until morphology or contour effects need it.

**Architecture:** The stable path is a single Three/WebGL fullscreen Character Surface. SVG selection remains the entry point, but the preview no longer uses `AspectRatio`, `ExtrudeGeometry`, mesh controls, or displacement-map-only semantics. Morph, shader color, pattern, randomization, locks, and experimental extensions are registry-driven editor controls that persist only serializable choices.

**Tech Stack:** Next.js 16 App Router, React 19, Mantine, Three.js, `@react-three/fiber`, Zustand, Vitest, GLSL shader modules, Canvas 2D rasterization.

---

## Development Branch

Develop this architecture directly on the `v2.1` branch. Do not move v2.1 implementation into another feature branch or worktree unless the user explicitly asks for that later.

## Source Of Truth

This `tasks/v2.1/` package supersedes:

- `tasks/shader-effect-redesign-plan.md`
- `tasks/shader-effect-redesign-phased-implementation-plan.md`

Those older plans target **Character Mesh**, `ExtrudeGeometry`, square `AspectRatio` preview, mesh controls, and **Displacement Map** behavior. v2.1 uses **Character Surface**, **Morph Stack**, **Morph Layer Catalogue**, **Surface Shader Layers**, and **Pattern Layers** from `CONTEXT.md`.

## Phase Index

1. [Phase 0: Plan And Architecture Lock](./phase-0-architecture-lock.md)
2. [Phase 1: Character Surface Foundation](./phase-1-character-surface-foundation.md)
3. [Phase 2: Morph Layer Catalogue](./phase-2-morph-layer-catalogue.md)
4. [Phase 3: Morph Stack State And Randomization](./phase-3-morph-stack-state-randomization.md)
5. [Phase 4: Surface Shader And Pattern Layers](./phase-4-surface-shaders-pattern-layers.md)
6. [Phase 5: Studio Panel UX](./phase-5-studio-panel-ux.md)
7. [Phase 6: Experimental Extensions](./phase-6-experimental-extensions.md)
8. [Phase 7: Cleanup And Verification](./phase-7-cleanup-verification.md)

Supporting docs:

- [Morph Layer Catalogue](./morph-layer-catalogue.md)
- [Checkpoint List](./checkpoints.md)

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

## Stable Product Contract

- Canvas preview becomes fullscreen within the right-side preview area; remove the square `AspectRatio` wrapper.
- Selected Hanzi SVG is rasterized to a mask texture first. SDF support is deferred until morphology and contour effects require it.
- **Morph Stack** is a sequential warp chain with reorderable layers.
- **Morph Layer Catalogue** contains Stable and Experimental entries.
- The first Stable implementation set is `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.
- Randomize creates a complete Morph Stack preset from a seed.
- Randomize defaults to Stable layers only and can explicitly include Experimental entries.
- Randomization respects locks on Morph layers, Surface Shader Layers, and Pattern Layers.
- Randomization may update existing unlocked Pattern Layers, but it does not add or remove Pattern Layers by default.
- **Surface Shader Layers** are separate foreground character and background canvas layers.
- **Pattern Layers** are UI layers, not a global pattern picker. There are at most three; each targets exactly one selector.
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
