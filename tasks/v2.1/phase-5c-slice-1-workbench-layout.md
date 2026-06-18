# Phase 5C Slice 1: Efecto Workbench Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the one-sided `/studio` shell with an Efecto-inspired three-column workbench: left source/object controls, center canvas, and right effect/post controls.

**Architecture:** Keep the current Character Surface renderer active while changing the shell around it. `StudioShell` owns the desktop left/canvas/right layout and mobile panel drawers. `StudioControls` becomes placement-aware so the existing panels can be split without duplicating store state.

**Tech Stack:** Next.js App Router, React client components, Mantine AppShell/Accordion, CSS Modules, Vitest static contract tests.

---

## Task 1: Write The Layout Contract Test

**Files:**

- Create: `components/studio/studio-workbench-layout-contract.test.ts`

**Steps:**

1. Add a failing static contract test that reads `StudioShell.tsx` and `StudioControls.tsx`.
2. Require `StudioShell` to expose `data-studio-workbench`, `data-studio-left-panel`, `data-studio-canvas`, and `data-studio-right-panel`.
3. Require `StudioShell` to render `<StudioControls placement="left" />` and `<StudioControls placement="right" />`.
4. Require `StudioControls` to define left/right placement groups.
5. Run `pnpm test components/studio/studio-workbench-layout-contract.test.ts` and confirm it fails for the missing three-column contract.

## Task 2: Implement The Three-Column Shell

**Files:**

- Modify: `components/studio/StudioShell.tsx`
- Create: `components/studio/StudioShell.module.css`

**Steps:**

1. Use Mantine `AppShell` with header, navbar, main canvas, and aside.
2. Add separate mobile toggles for the left and right panels.
3. Keep `StudioCanvas` in the center `AppShell.Main`.
4. Use CSS module styles for dense workbench panel borders, scroll containment, and stable center canvas sizing.
5. Avoid cards around the canvas.

## Task 3: Split Control Ownership

**Files:**

- Modify: `components/studio/StudioControls.tsx`

**Steps:**

1. Add `placement?: 'left' | 'right' | 'all'`.
2. Keep existing default behavior as `all` for compatibility.
3. Route Character, Shader, and Animation panels to the left placement.
4. Route Morph Stack, Pattern Layers, Post FX, and Randomize panels to the right placement.
5. Add compact column headings that name the ownership model without adding fake ASCII controls before the renderer exists.

## Task 4: Verify

**Commands:**

```sh
pnpm test components/studio/studio-workbench-layout-contract.test.ts
pnpm exec tsc --noEmit
git diff --check
```

**Manual QA Handoff:**

- Ask the user to open `/studio` on desktop and confirm left panel, center canvas, and right panel are visible at once.
- Ask the user to check mobile/tablet width and confirm both side panels collapse while the canvas remains primary.

## Review Result

- Added `components/studio/studio-workbench-layout-contract.test.ts` and verified it failed against the old one-sided shell before implementation.
- Replaced the `/studio` shell with a Mantine `AppShell` layout using left navbar, center main canvas, and right aside.
- Added `components/studio/StudioShell.module.css` for dense workbench panel styling, scroll containment, and stable canvas sizing.
- Updated `StudioControls` with `placement?: 'left' | 'right' | 'all'`.
- Routed current active controls as an interim Phase 5C shell:
  - left: Selected Text, Color / Material, Interaction;
  - right: Effect, Style Setting, Post Process, Randomize.
- Did not add fake ASCII controls before the renderer exists; the right panel is ASCII-ready by ownership and will receive true ASCII controls in the renderer/control slices.
- Verification passed:
  - `pnpm test components/studio/studio-workbench-layout-contract.test.ts`
  - focused panel contract tests
  - `pnpm exec tsc --noEmit`
  - `pnpm test`
  - `pnpm lint` with two existing warnings
  - `pnpm build`
  - `git diff --check`
