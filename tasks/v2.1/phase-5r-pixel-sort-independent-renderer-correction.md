# Phase 5R Correction — Independent Pixel Sort Renderer

## Decision

The existing CPU-per-preview-frame renderer is too expensive for interactive updates. Pixel Sort keeps its independent two-stage renderer, but preview and export now have separate execution contracts: preview is a bounded GPU approximation with no readback or Worker work, while export uses the exact CPU sorter. The generic Studio effect shader framework remains unchanged for every other effect.

## Render graph

1. Render the selected extruded/deformed Character into a Pixel-Sort-owned RGBA8 target with its current Model transform and 3D Motion state.
2. For preview, sample that target directly in a bounded two-sample GPU presentation pass. Approximate the selected direction and threshold response without allocating sort arrays, reading pixels back, starting the Worker, or uploading a replacement texture. Distribute Shadow, Midtone, and Highlight by directional streak position rather than source luminance so every palette role remains visible.
3. For export, read the exact hidden-square source target into an effect-owned pixel buffer and send it with sanitized settings to the dedicated Worker.
4. Traverse each horizontal, vertical, 45-degree, -45-degree, or radial line exactly once. Detect contiguous threshold-eligible runs, partition them into deterministic line-anchored chunks no longer than Streak Length, and stably reorder every pixel in each chunk by Rec.601 luminance.
5. The -45-degree direction preserves `x + y`; radial rays are deterministic angle sectors sorted center-out from `((width - 1) / 2, (height - 1) / 2)`.
6. Reverse changes ordering; Intensity blends source and reordered pixels; Brightness and Contrast apply only after reordering.
7. Present the exact Worker result for export acknowledgement. Shared Processing/Post runs exactly once after presentation. Pixel Sort does not use the generic effect compiler or another effect material.

## Scheduling and lifecycle

- Preview never creates the Worker and never performs GPU readback.
- Render the preview source only when its source is dirty, auto-rotation is active, or an enabled GPU deform is moving; paused/static scenes do not redraw continuously.
- Serialize exact export requests, coalesce replacements, and reject stale generations so an older Worker result cannot acknowledge or replace a newer request.
- Create the Worker lazily for export and dispose the source target, presentation material, geometry, source material, coordinator, and Worker explicitly.
- Export acknowledgement occurs only on the frame after the exact sorted result is presented; other effects retain automatic acknowledgement.

## Preserved contracts

- Selected Character input and loading/error behavior.
- Pixel Sort Settings rows and persisted values.
- Model geometry and transforms.
- 3D Motion timing.
- Shared Processing/Post UI behavior, applied once.
- Hidden-square export sizes and repeated animated-frame requests.
- No changes to any non-Pixel-Sort renderer.

## Rejected contracts

- Per-fragment two-sided sliding span reconstruction.
- Fixed 24-sample color arrays.
- Bubble sorting sparse samples in GLSL.
- Bilinear interpolation that expands sparse colors into displaced Character slabs.
- Routing tests that require Pixel Sort to resemble the generic offscreen-source material pattern.

## Acceptance

- Every sortable chunk preserves its complete RGBA pixel multiset.
- Sort keys are monotonic within each chunk; Reverse flips that order.
- No pixel crosses a direction line or chunk boundary.
- Runs are coherent and no longer than Streak Length.
- Horizontal/vertical transpose equivalence, `x - y` 45-degree membership, `x + y` -45-degree membership, and radial-sector membership are deterministic.
- All five Direction values persist and reset through the effect-local theme state; Horizontal remains the default.
- A run with more than 24 unique pixels retains all unique pixels after sorting.
- Intensity zero is the adjusted source; Intensity one is the full permutation.
- Randomness is deterministic and independent of animation time.
- Preview produces no Worker construction, GPU readback, or replacement `DataTexture` upload.
- Stale exact-export responses never replace or acknowledge a newer request, and a current failure can be retried.
- Export captures the final sorted frame, never an intermediate source frame.
