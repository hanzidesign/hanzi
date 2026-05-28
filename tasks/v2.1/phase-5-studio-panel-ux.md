# Phase 5: Studio Panel UX

**Purpose:** Replace mesh/displacement controls with Character Surface, Morph Stack, shader, and Pattern Layer controls while preserving current Studio panel style.

## Scope

- UI panels and controls.
- No new visual design system.
- No export/timeline workflow.

Preserve the current Studio panel visual style: Mantine Accordion structure, `PanelBox`/`PanelLabel`, current spacing and typography rhythm, dark controls, and the existing route layout.

## Files

- Modify: `components/studio/StudioControls.tsx`
- Create: `components/studio/MorphStackPanel.tsx`
- Create: `components/studio/MorphLayerCard.tsx`
- Create: `components/studio/SurfaceShaderPanel.tsx`
- Create: `components/studio/PatternLayerPanel.tsx`
- Modify: `components/studio/CharacterPanel.tsx`
- Remove or retire: `components/studio/MeshPanel.tsx`
- Remove or retire: `components/studio/DisplacementPanel.tsx`

## Panel Set

Recommended panels:

- `Character`
- `Morph Stack`
- `Shaders`
- `Patterns`
- `Surface`

## Morph Stack UI Requirements

- Add layer
- Duplicate layer
- Delete layer
- Enable/disable layer
- Lock layer
- Collapse/expand layer controls
- Drag reorder
- Stable/Experimental badge
- Category-based Add Layer picker
- Randomize with:
  - seed
  - regenerate
  - include Experimental opt-in
  - lock awareness

## Steps

1. Add component tests where practical for control rendering and actions.

2. Replace panel list in `StudioControls.tsx`.

3. Implement `MorphStackPanel` using current accordion/PanelBox visual style.

4. Implement layer card controls with stable dimensions and no text overflow.

5. Implement shader layer controls:
   - foreground character layer
   - background canvas layer
   - separate locks

6. Implement Pattern Layer controls:
   - add up to three
   - single target selector
   - lock
   - upload remains session-only

7. Run:

   ```sh
   pnpm test
   pnpm exec tsc --noEmit
   pnpm lint
   pnpm build
   ```

8. Ask the user to perform manual browser smoke checks:
   - desktop and mobile
   - open each panel
   - add/reorder/lock Morph layer
   - randomize with locked layer
   - add three Pattern Layers and verify fourth is blocked

   Do not run automated browser visual checks unless the user explicitly asks for them.

## Checkpoint 5

- [ ] New panels preserve current visual style.
- [ ] Morph Stack UI is usable and reorderable.
- [ ] Experimental options are visible but labelled.
- [ ] Pattern Layer UI enforces max three and single target.
- [ ] No mesh/displacement language remains in active UI.
