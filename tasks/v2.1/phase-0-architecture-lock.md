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

## Checkpoint 0

- [ ] v2.1 plan exists under `tasks/v2.1/`.
- [ ] Old mesh plans clearly point to v2.1 as superseding source of truth.
- [ ] `tasks/todo.md` points to v2.1 as active planning baseline.
- [ ] v2.1 implementation is marked for direct development on branch `v2.1`.
- [ ] No implementation code changed in this phase.
