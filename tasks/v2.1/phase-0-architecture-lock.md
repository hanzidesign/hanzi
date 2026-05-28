# Phase 0: Plan And Architecture Lock

**Purpose:** Freeze the v2.1 direction before implementation starts and prevent the old Character Mesh plan from being reused accidentally.

## Scope

- Documentation and planning only.
- No application code changes.
- Establish `tasks/v2.1/` as the active implementation package.
- Mark v2.1 implementation as direct development on branch `v2.1`.

## Files

- Modify: `CONTEXT.md`
- Modify: `tasks/todo.md`
- Modify: `tasks/shader-effect-redesign-plan.md`
- Modify: `tasks/shader-effect-redesign-phased-implementation-plan.md`
- Create: `tasks/v2.1/*`

## Steps

1. Verify `CONTEXT.md` defines:
   - **Character Surface**
   - **Morph Stack**
   - **Morph Layer Catalogue**
   - **Surface Shader Layers**
   - **Pattern Layer**
   - **Experimental Extension**
   - **Vector Pre-Morph**

2. Mark old shader-effect redesign docs as superseded by `tasks/v2.1/README.md`.

3. Update `tasks/todo.md` so the active source of truth points to `tasks/v2.1/README.md`.

4. Confirm the v2.1 package includes phase docs and checkpoint lists.

5. Confirm future implementation work is marked for direct development on branch `v2.1`.

6. Run a doc consistency grep:

   ```sh
   rg -n "Character Mesh|ExtrudeGeometry|Displacement Map|AspectRatio" CONTEXT.md tasks/v2.1
   ```

   Expected: hits are limited to superseded references, avoidance notes, or cleanup checks. No active v2.1 phase should direct implementation of those old concepts as the primary preview architecture.

## Resolved Architecture Lock Decisions

- Phase 0 is the final architecture approval gate for the v2.1 planning package. After Checkpoint 0, stop before Phase 1 application code until explicit implementation approval.
- Phase 1 starts with mask-texture rasterization. SDF support is allowed as a later extension when morphology or contour effects need it; do not build a full SDF pipeline during the first Character Surface foundation pass.
- Detach the active preview from `CharacterMesh`, `ExtrudeGeometry`, `AspectRatio`, mesh controls, and displacement-primary semantics before deleting old code. Remove or quarantine obsolete mesh/displacement files only after replacement coverage passes.
- Use a clean v2.1 persisted-state key. Do not migrate old mesh/displacement state into the v2.1 store.
- Keep **Morph Stack** as one ordered user-facing stack, but allow implementation phases such as pre-raster, coordinate, mask, surface, and post effects where needed.
- The authoritative first Stable Morph Layer implementation set is: `sine-bend`, `swirl-well`, `curl-flow`, `band-slice`, `pixelate-grid`, `ink-compression`, and `surface-depth`.
- Phase 2 implements typed Morph Layer definitions, params, defaults, bounds, tier/category validation, and seeded randomization. Full visual shader composition can land after the catalogue/state foundation.
- Invalid Pattern Layer targets sanitize to `foreground-shader`; invalid or missing Pattern Layer sources fall back to the first built-in pattern.
- Randomization may update existing unlocked Pattern Layers, but it does not add or remove Pattern Layers by default.
- If a local Pattern Layer file fails to load, keep the last valid runtime texture, show a non-persisted UI error, and fall back to a built-in pattern only when there is no prior valid texture.
- Persist renderer selection as `rendererMode: 'webgl' | 'webgpu-experimental'`, defaulting to `webgl`. WebGPU is a renderer capability, not a Morph Layer.
- Experimental catalogue entries may be metadata-only or disabled until implemented. Add Layer UI should only enable entries that are addable, and disabled entries must show a reason.
- Preserve the current Studio panel visual style: Mantine Accordion structure, `PanelBox`/`PanelLabel`, current spacing and typography rhythm, dark controls, and the existing route layout.
- No ADR is needed for this lock. The `tasks/v2.1/` package is the active architecture record unless future drift makes a durable ADR useful.
- Browser visual checks are manual during implementation checkpoints. Do not use automated browser tooling for visual QA unless the user explicitly asks; provide the exact `/studio` checklist and wait for the user's report.

## Checkpoint 0

- [x] v2.1 plan exists under `tasks/v2.1/`.
- [x] Old mesh plans clearly point to v2.1 as superseding source of truth.
- [x] `tasks/todo.md` points to v2.1 as active planning baseline.
- [x] v2.1 implementation is marked for direct development on branch `v2.1`.
- [x] No implementation code changed in this phase.
