# Phase 7: Cleanup And Verification

**Purpose:** Remove obsolete mesh/displacement paths and complete full verification for the Character Surface redesign.

## Scope

- Cleanup stale active code and docs.
- Verify build, tests, lint, and browser behavior.
- Record implementation report.

## Files

- Remove or retire: `components/studio/CharacterMesh.tsx`
- Remove or retire: `components/studio/MeshPanel.tsx`
- Remove or retire: `components/studio/DisplacementPanel.tsx`
- Remove or retire: `components/studio/character-mesh-geometry.ts`
- Remove or retire related mesh/displacement tests after replacement coverage exists.
- Modify: `tasks/todo.md`
- Modify: `CONTEXT.md` only if implementation discovers domain drift.

## Cleanup Rules

- Do not remove old code until Character Surface replacement is verified.
- Do not delete test coverage without replacement coverage.
- Keep route-local state ownership.
- Keep introduction page `/`.
- Keep `/studio` route.

## Steps

1. Search active code for obsolete terms:

   ```sh
   rg -n "CharacterMesh|Character Mesh|ExtrudeGeometry|MeshPanel|DisplacementPanel|Displacement Map|AspectRatio" app components shaders tasks/v2.1
   ```

2. Remove or quarantine obsolete active code once replacement coverage passes.

3. Run full verification:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

4. Browser visual smoke:
   - desktop `/studio`
   - mobile `/studio`
   - character switching
   - Morph Stack add/reorder/randomize/lock
   - shader foreground/background changes
   - Pattern Layer max/target/lock
   - refresh persistence
   - no page console errors

5. Record final report in `tasks/todo.md`:
   - changed files
   - verification commands
   - visual smoke results
   - residual risks
   - follow-up candidates

## Checkpoint 7

- [ ] Full test/build/lint verification passes.
- [ ] Browser smoke passes on desktop and mobile.
- [ ] Obsolete mesh/displacement active paths are removed or clearly superseded.
- [ ] `tasks/todo.md` contains implementation report.

