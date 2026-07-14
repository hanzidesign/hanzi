# Phase 5R Correction — Independent Pixel Sort Renderer

## Decision

The existing Pixel Sort renderer is rejected. A source render target followed by one fragment shader that reconstructs and sparsely samples a span independently for every fragment cannot express coherent whole-run pixel permutation. Pixel Sort will own a dedicated asynchronous render pipeline; the generic Studio effect shader framework remains unchanged for every other effect.

## Render graph

1. Render the selected extruded/deformed Character into a Pixel-Sort-owned RGBA8 target with its current Model transform and 3D Motion state.
2. Read the completed target into an effect-owned pixel buffer.
3. Send the buffer and sanitized Pixel Sort settings to a dedicated worker.
4. Traverse each horizontal, vertical, or integer-diagonal line exactly once. Detect contiguous threshold-eligible runs, partition them into deterministic line-anchored chunks no longer than Streak Length, and stably reorder every pixel in each chunk by Rec.601 luminance.
5. Reverse changes ordering; Intensity blends source and reordered pixels; Brightness and Contrast apply only after reordering.
6. Upload the complete returned frame to a nearest-filtered `DataTexture` and present it on one fullscreen plane.
7. Shared Processing/Post runs exactly once after presentation. Pixel Sort does not use the generic effect compiler or another effect material.

## Scheduling and lifecycle

- Allow at most one GPU readback/worker job in flight.
- Coalesce changes while a job is in flight and discard stale generations.
- Cap preview processing resolution while preserving aspect ratio; export uses the exact hidden-square resolution.
- Preview may update at a capped cadence during motion; static control/model changes request an immediate frame.
- Resize/dispose the source target, presentation texture/material, geometry, source material, and worker explicitly.
- Export acknowledgement must occur only after the sorted texture is presented; other effects retain automatic acknowledgement.

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
- Horizontal/vertical transpose equivalence and integer-diagonal membership are deterministic.
- A run with more than 24 unique pixels retains all unique pixels after sorting.
- Intensity zero is the adjusted source; Intensity one is the full permutation.
- Randomness is deterministic and independent of animation time.
- Stale worker responses never replace a newer frame.
- Export captures the final sorted frame, never an intermediate source frame.

