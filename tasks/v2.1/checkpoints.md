# Hanzi Studio v2.1 Checkpoints

Use this checklist as the PM review gate for each phase. A phase is not complete until its checkpoint is satisfied and results are recorded in `tasks/todo.md`.

For browser visual checks, provide the user with the relevant `/studio` checklist and wait for their report. Do not automatically run browser visual automation unless the user explicitly requests it.

## Checkpoint 0: Architecture Lock

- [x] `CONTEXT.md` uses Character Surface/Morph Stack language.
- [x] Old mesh/displacement plans are marked superseded.
- [x] `tasks/v2.1/` is the visible active source of truth.
- [x] Implementation has not started before the v2.1 plan is approved.

## Checkpoint 1: Character Surface Foundation

- [ ] `/studio` right preview is fullscreen within its panel area.
- [ ] Square `AspectRatio` preview wrapper is gone.
- [ ] SVG character selection still works.
- [ ] Selected SVG is rasterized into a stable mask texture.
- [ ] Mask orientation is correct, not upside down.
- [ ] WebGL surface is nonblank on desktop and mobile.
- [ ] No Character Mesh or `ExtrudeGeometry` path remains in the active preview.

## Checkpoint 2: Morph Layer Catalogue

- [ ] Catalogue registry exists with Stable and Experimental tiers.
- [ ] Stable entries cover more than fluid/ink effects.
- [ ] Experimental entries are explicit and labelled.
- [ ] Each layer has schema-driven params and randomization bounds.
- [ ] Catalogue tests cover ids, duplicate detection, params, tier labels, and defaults.

## Checkpoint 3: Morph Stack State And Randomization

- [ ] Morph Stack layers are persisted as serializable editor state.
- [ ] Layer order is persisted and reorderable.
- [ ] Locked layers are preserved by randomization.
- [ ] Randomization defaults to Stable entries only.
- [ ] Random seed can reproduce a generated preset.
- [ ] Uploaded data URLs and runtime textures are not persisted.

## Checkpoint 4: Surface Shader And Pattern Layers

- [ ] Foreground character shader layer and background canvas shader layer are separate.
- [ ] Shader layer locks are honored by randomization.
- [ ] Pattern Layer UI supports at most three layers.
- [ ] Each Pattern Layer has exactly one target selector.
- [ ] Pattern Layer target `Morph Stack` applies to the whole morph pipeline.
- [ ] Pattern Layer locks preserve source and target.

## Checkpoint 5: Studio Panel UX

- [ ] UI preserves current Studio panel visual style.
- [ ] Morph Stack panel supports add, duplicate, delete, enable/disable, collapse/expand, lock, and drag reorder.
- [ ] Add Layer UI groups effects by category.
- [ ] Experimental entries display an Experimental badge.
- [ ] Randomize controls expose seed, Stable default, Include Experimental opt-in, and lock behavior.
- [ ] Text does not overflow controls on desktop or mobile.

## Checkpoint 6: Experimental Extensions

- [ ] Vector Pre-Morph appears inside Morph Stack and executes before rasterization.
- [ ] WebGPU renderer is optional and falls back gracefully.
- [ ] Experimental entries do not affect Stable randomization unless opted in.
- [ ] Unsupported Experimental capabilities are disabled with clear UI state.
- [ ] Experimental failures do not blank the Stable Character Surface.

## Checkpoint 7: Cleanup And Verification

- [ ] Obsolete mesh/displacement active code is removed or quarantined.
- [ ] Old compatibility state is removed if no longer used.
- [ ] Full verification commands pass.
- [ ] User-reported browser visual smoke passes desktop and mobile.
- [ ] `tasks/todo.md` records final changed files, verification, and residual risks.
