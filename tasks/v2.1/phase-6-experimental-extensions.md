# Phase 6: Experimental Extensions

**Purpose:** Add opt-in experimental capabilities without destabilizing the Stable Character Surface path.

## Scope

- Experimental registry hooks.
- Vector Pre-Morph as a Morph Stack layer.
- Optional WebGPU renderer prototype.
- Optional feedback/pixel-sort prototypes.

## Files

- Create: `experimental/extensions.ts`
- Create: `experimental/vector-pre-morph.ts`
- Create: `experimental/vector-pre-morph.test.ts`
- Create: `experimental/webgpu-renderer.ts`
- Create: `experimental/feedback-advection.ts`
- Modify: `morph/catalogue.ts`
- Modify: `components/studio/CharacterSurfaceCanvas.tsx`

## Rules

- Experimental options are visible, labelled, and opt-in.
- Experimental Morph Layers live in the same Morph Stack.
- Experimental catalogue entries may be disabled metadata-only entries until their runtime is implemented.
- Add Layer UI enables only addable Experimental entries and shows a reason for disabled entries.
- Vector Pre-Morph executes before SVG rasterization.
- WebGPU is renderer-level, not a Morph Stack layer.
- Persist renderer selection as `webgl` or `webgpu-experimental`; default to `webgl`.
- WebGL remains the Stable fallback.
- Experimental failure must not blank the Stable Character Surface.

## Steps

1. Add extension registry tests:
   - extension ids are unique
   - capabilities are explicit
   - unsupported capabilities disable cleanly

2. Implement Vector Pre-Morph metadata and a minimal path deformation prototype.

3. Wire Vector Pre-Morph execution before rasterization while keeping it represented in Morph Stack.

4. Add WebGPU renderer capability detection behind explicit renderer mode.

5. Add feedback/pixel-sort Experimental entries as disabled or prototype-only if not production-ready.

6. Run:

   ```sh
   pnpm vitest run experimental/vector-pre-morph.test.ts
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

7. Ask the user to perform manual browser smoke checks:
   - Stable WebGL path still works
   - Experimental Vector Pre-Morph can be added and removed
   - WebGPU unsupported path falls back or disables cleanly

   Do not run automated browser visual checks unless the user explicitly asks for them.

## Checkpoint 6

- [ ] Experimental Extensions are opt-in.
- [ ] Vector Pre-Morph appears inside Morph Stack.
- [ ] WebGPU does not become required for Stable mode.
- [ ] Experimental failures do not blank Stable preview.
