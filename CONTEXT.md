# Hanzi Studio

Hanzi Studio is a visual editor for Hanzi SVG character artwork. The product exists to let a user select a character SVG and experiment with shader-based surface deformation, not to publish, export, mint, store, or generate assets.

## Language

**Hanzi Studio**:
The product context for experimenting with shader-driven deformation of Hanzi SVG character shapes.
_Avoid_: minting app, NFT studio, export tool

**Introduction Page**:
The entry page that introduces Hanzi Studio before the user enters the editor.
_Avoid_: editor, mint entry

**Character Editor**:
The workspace where a user selects a Hanzi character SVG and adjusts surface, shader, pattern, color, and morph settings.
_Avoid_: mint page, upload flow, NFT creator, text editor

**Character Surface**:
The fullscreen live preview surface where the selected Hanzi character SVG is rasterized into a mask texture, with distance-field support added only when morphology or contour effects need it, and transformed by shader deformation.
_Avoid_: character mesh, export preview, mint preview, SVG filter preview, centered aspect-ratio preview

**Morph Stack**:
The control system for composing shader deformation layers on the **Character Surface**. By default, layers compose as a sequential warp chain where each layer transforms the sampling coordinates before the next layer runs. The implementation may use separate pre-raster, coordinate, mask, surface, and post phases, but the user-facing model remains one ordered **Morph Stack**. Each layer can contribute a controllable amount of distortion. Random generation creates a complete **Morph Stack** preset from a reproducible seed rather than changing only one layer or producing unrecoverable one-off randomness.
_Avoid_: single distortion mode, mesh controls, random-only effect

**Morph Layer Catalogue**:
The extensible option set of deformation layer types that can be added to a **Morph Stack**. The catalogue should include multiple deformation families and should not be limited to fluid or ink-style effects. Catalogue options can be marked Stable or Experimental.
_Avoid_: fixed six-effect list, fluid-only controls, hard-coded one-off shader modes

**Experimental Extension**:
An optional extension module for heavier, rougher, or less proven Character Surface capabilities. Experimental Extensions can add Morph Layer Catalogue options, renderer experiments, or vector pre-morph capabilities without changing the Stable pipeline by default. Experimental Extensions are visible in the UI with explicit Experimental labeling, but they do not create a second Morph Stack.
_Avoid_: separate product, hidden behavior change, required core dependency

**Vector Pre-Morph**:
An Experimental Morph Layer type that deforms the selected character SVG path before the Character Surface rasterizes it. It appears inside the Morph Stack even though it executes before rasterization.
_Avoid_: separate vector panel, second morph stack, replacement renderer

**Surface Shader Layers**:
The two shader styling layers applied to the **Character Surface**: one foreground layer for the rasterized character mask and one background layer for the canvas outside the character.
_Avoid_: single shader color, one global color, mesh material

**Pattern Layer**:
A UI-configurable pattern layer that selects one pattern source and exactly one Character Surface layer selector target. Pattern sources can be built-in pattern assets or local session-only files. The Character Editor supports up to three Pattern Layers.
_Avoid_: background image, AI background, DALL-E image, one global pattern source, displacement map

**Renderer Mode**:
The Character Editor setting that selects the Stable WebGL renderer or an explicitly Experimental renderer capability. WebGL is the default and Stable fallback.
_Avoid_: Morph Layer, hidden renderer switch, required WebGPU path

**Character Panel**:
The editor control panel for selecting the Hanzi character SVG.
_Avoid_: Text panel, typography panel

**Shader Effect Preset**:
A built-in shader option that defines an effect, its user-adjustable parameters, and default values.
_Avoid_: background image, AI background, DALL-E image

## Relationships

- **Hanzi Studio** has one **Introduction Page** and one primary **Character Editor**.
- The **Introduction Page** leads into the **Character Editor**.
- A **Character Editor** includes a **Character Panel** for selecting the Hanzi character SVG.
- A **Character Editor** produces one live **Character Surface**.
- A **Character Editor** derives the **Character Surface** from the selected character SVG by rasterizing the SVG into a mask texture, with distance-field support added only when morphology or contour effects need it.
- A **Character Surface** keeps the selected Hanzi character fully visible, centered, upright, and aspect-ratio preserving; moving to a fullscreen surface must not shrink, enlarge, crop, stretch, or otherwise change the default visual scale of the character from the current preview baseline.
- A **Character Editor** applies one **Morph Stack** to the **Character Surface**.
- A **Morph Stack** draws its layer types from a **Morph Layer Catalogue**.
- A **Morph Layer Catalogue** can include Experimental options when they still fit the Character Surface pipeline and are clearly marked as heavier, rougher, or less predictable than Stable options.
- Experimental capabilities should be added as **Experimental Extensions** so they are opt-in and do not change the Stable Character Surface pipeline by default.
- Experimental **Morph Layer Catalogue** entries appear inside the same **Morph Stack** as Stable entries rather than in a separate experimental stack.
- **Vector Pre-Morph** is selected and ordered in the **Morph Stack** like other morph layers, but the runtime applies it before SVG rasterization.
- A **Character Surface** may use shader colors, patterns, background styling, 2D distortion, and surface-depth effects.
- A **Character Surface** has two **Surface Shader Layers**: a foreground shader layer for the character and a background shader layer for the canvas.
- A **Character Surface** may use up to three **Pattern Layers**. Each Pattern Layer selects a pattern source and exactly one layer selector target.
- When a **Pattern Layer** targets the **Morph Stack**, it applies to the entire Morph Stack pipeline rather than one individual morph layer.
- Pattern Layer randomization can change existing unlocked Pattern Layers, but default randomization does not add or remove Pattern Layers.
- A **Morph Stack** has ordered layers by default; changing layer order can change the resulting deformation, so users must be able to reorder layers.
- A **Morph Stack** randomization action produces a complete preset, including seed, layer count, layer order, layer types, layer parameters, and shader colors for both **Surface Shader Layers**. By default, randomization draws only from Stable **Morph Layer Catalogue** entries; users may opt into Experimental entries explicitly. Locked Morph Stack layers, locked Surface Shader Layers, and locked Pattern Layers are preserved across randomization.
- A **Character Editor** has one **Renderer Mode**. WebGPU-like capabilities are Experimental renderer capabilities, not Morph Stack layers.
- **Character Surface** is local to the browser session and is not exported, stored remotely, minted, or generated by an AI service.
- **Character Editor** settings persist locally so a page refresh does not accidentally discard work. Persisted settings include selected character, Morph Stack layers/order/params/locks, Surface Shader Layer settings/locks, Pattern Layer metadata/locks, random seed, and renderer mode selection.
- The **Character Editor** exposes controls only; it has no queue, mint, export, remote upload, or modal action workflow.

## Example dialogue

> **Dev:** "After the user adjusts the shader on a character, should we offer export or mint actions?"
> **Domain expert:** "No. **Hanzi Studio** is only for experimenting with shader effects in the **Character Editor**."

## Flagged ambiguities

- "Next.js 16 app architecture" does not mean a product expansion. The repo already declares Next.js 16 and uses `app/`; the architectural goal is to align the app around **Hanzi Studio** and remove legacy Web3, NFT, upload, queue, export, and AI-generation flows.
- "SVG effect playground" is retired as the current product target. The **Character Editor** now uses a fullscreen **Character Surface** backed by a rasterized SVG mask texture while preserving character SVG selection. Distance-field support is deferred until morphology or contour effects need it.
- "3D" in the new direction means surface-depth illusion, heightfield-like deformation, lighting, or parallax on the **Character Surface**. It does not mean returning to an extruded **Character Mesh** as the primary preview object.
- **Morph Stack** controls are separate from shader style parameters, but the default randomization action may update both. Morph controls change sampling coordinates, stroke morphology, surface-depth effects, or time/random behavior; shader style parameters change foreground character color, background canvas color, pattern, lighting, and presentation.
- "Morph Stack" should not be reduced to independent sliders for mutually exclusive modes. The default mental model is an ordered pipeline of deformation layers.
- Locked Morph Stack layers should not be replaced, reordered, or have their parameters changed by randomization.
- Locked **Surface Shader Layers** should keep their shader color/style settings during randomization.
- Locked **Pattern Layers** should keep their pattern source and layer selector target during randomization.
- "Morph Stack" should not be limited to fluid, ink, or flow effects. The **Morph Layer Catalogue** should stay broad enough to include lens warps, pixel/glitch operations, morphology, vector/SDF-inspired deformation, surface-depth effects, and other researched shader deformation families.
- Experimental morph options are allowed, but they should remain explicit catalogue choices rather than silently changing the behavior of Stable layers.
- **Experimental Extensions** are still part of **Hanzi Studio**, not separate products or separate canvases. They should plug into the Character Surface architecture through explicit registries or renderer tracks.
- Experimental options should be visible in the same panel system as Stable options, with Experimental labeling. They should not require users to manage a second parallel Morph Stack.
- **Vector Pre-Morph** should not become a separate panel or a replacement for the raster shader pipeline. It is an Experimental Morph Layer that feeds the Character Surface rasterization step.
- Pattern images are configured through **Pattern Layers**, not one global pattern picker. A **Pattern Layer** chooses exactly one target through a layer selector, and local pattern uploads remain session-only inputs, not remote upload or asset-storage workflows.
- Pattern routing should not become per-morph-layer routing in the first Character Surface design. A Pattern Layer that targets **Morph Stack** acts as a pipeline-level input.
- Local persistence is for serializable editor choices only. It must not store uploaded image binaries or data URLs, generated mask textures, future generated SDF textures, WebGPU availability, or transient render errors.
- "Metadata" referred to NFT metadata fields and is removed from the editor. Character identity may still exist only as part of SVG character selection.
- Contract and chain tooling is not part of **Hanzi Studio**. The full `hardhat/` workspace and contract-related state belong to the removed minting product boundary.
- Public product copy should describe Hanzi SVG character shader editing, not NFT, minting, wallet, chain, or Optimism positioning.
- Studio-specific UI should use Studio language: **Character Panel**, **Character Surface**, **Morph Stack**, **Pattern Layer**, shader settings, pattern settings, and color settings.
- Global app chrome should not own Studio editor state; Studio state belongs to the **Character Editor** route boundary.
- Studio settings are locally persisted for refresh safety, but they are not synced to a backend or exported as files in v1.
