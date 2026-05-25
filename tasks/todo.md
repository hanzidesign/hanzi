# Hanzi Studio Refactor Planning

Detailed implementation plan: `tasks/hanzi-studio-refactor-plan.md`.
Shader redesign implementation plan: `tasks/shader-effect-redesign-plan.md`.
Shader redesign phased implementation plan: `tasks/shader-effect-redesign-phased-implementation-plan.md`.

## Phase 1 Grill Session: Shader Preset Registry

- [x] Review current lessons, glossary, Phase 1 plan, and existing shader helper code before asking questions.
- [x] Resolve whether Phase 1 is a design-review checkpoint only or includes immediate implementation.
- [x] Grill unresolved registry decisions one at a time against `CONTEXT.md` and the current code.
- [x] Update `CONTEXT.md` inline only when a domain term or relationship is newly resolved.
- [x] Add a Phase 1 grill review note with decisions, open questions, and verification expectations.

### Phase 1 Grill Notes

- Resolved: include `shaders/shared/default-vertex.glsl` in Phase 1 so raw shader imports and the shared vertex contract are verified before WebGL canvas work; keep built-in presets fragment-shader-only in Phase 1.
- Resolved: create original built-in GLSL presets in Phase 1 instead of waiting for an external sample set.
- Resolved: set `usesDisplacementMap: false` for all Phase 1 presets and avoid sampling `u_displacementMap` in fragment shaders until the later Displacement phase.
- Resolved: `getShaderPresetById` returns `ShaderPreset | undefined`; `getDefaultShaderPreset()` owns the hard fallback behavior.
- No `CONTEXT.md` update needed: the resolved items refine the existing shader preset implementation contract, not the domain glossary.

## Phase 1 Execution: Shader Preset Registry

- [x] Add failing registry tests for built-in preset validation, uniqueness, defaults, and lookup helpers.
- [x] Add shared default vertex shader.
- [x] Add three original built-in fragment shader presets and preset modules.
- [x] Add central shader preset registry helpers.
- [x] Run focused registry tests.
- [x] Run full verification: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`.

### Phase 1 Review - 2026-05-25

- Added a typed registry with `shaderPresets`, `getShaderPresetById`, `getDefaultShaderPreset`, and exported shared `defaultVertexShader`.
- Added original built-in presets: `Flowing Noise`, `Kaleidoscope Noise`, and `Grid Pulse`.
- Added real `.glsl` fragment files for each preset and a shared default vertex shader.
- Kept Phase 1 presets fragment-only and `usesDisplacementMap: false`; no fragment shader samples `u_displacementMap`.
- Added a Vitest raw GLSL loader so registry tests exercise shader source imports as strings.
- Added registry tests for preset ids, validation, defaults, uniforms, categories, lookup fallback, Phase 1 displacement scope, and shared vertex shader contract.
- No open grill questions remain for Phase 1.
- Verification: `pnpm test` passed with 3 files and 20 tests; `pnpm exec tsc --noEmit` passed; `pnpm lint` exited 0 with the pre-existing `StudioCanvas.tsx` unused `Box` warning; `pnpm build` passed with Next 16.2.6 Turbopack.

## Phase 2 Grill Session: Persisted Studio Store

- [x] Review current lessons, glossary, Phase 2 plan, and existing Studio context consumers before asking questions.
- [x] Resolve whether Phase 2 wires the current `/studio` UI through the Zustand store or only creates an unused store module.
- [x] Grill unresolved store decisions one at a time against `CONTEXT.md` and the current code.
- [x] Update `CONTEXT.md` inline only when a domain term or relationship is newly resolved.
- [x] Add a Phase 2 grill review note with decisions, open questions, and verification expectations.

### Phase 2 Grill Notes

- Resolved: wire the current `/studio` UI through the Zustand store now, using `studio-context.tsx` as a compatibility wrapper for existing consumers.
- Resolved: keep compatibility state in the store for the current SVG-filter UI until the renderer swap, while also owning the planned shader, mesh, displacement, and view state fields.
- Resolved: do not persist uploaded pattern image data URLs because localStorage has size limits; uploaded pattern data stays session-only.
- No `CONTEXT.md` update needed: the existing refresh-safety and no-backend persistence language already covers the Phase 2 store behavior.

## Phase 2 Execution: Persisted Studio Store

- [x] Add failing store tests for defaults, persistence serialization shape, stale preset hydration, stale param sanitization, and preset switching preservation.
- [x] Add route-local persisted Zustand store in `app/studio/studio-store.ts`.
- [x] Wire `studio-context.tsx` to use the Zustand store while preserving the current `useStudio()` consumer API.
- [x] Preserve current `/studio` SVG-effect behavior until the renderer swap.
- [x] Run focused store tests.
- [x] Run full verification: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`.

### Phase 2 Review - 2026-05-25

- Added route-local persisted Zustand store in `app/studio/studio-store.ts` with character, shader, mesh, displacement, view, compatibility SVG-effect, and runtime-only fields.
- Wired `studio-context.tsx` to the Zustand store as a compatibility wrapper, preserving the current `useStudio()` API and existing `/studio` panels.
- Fixed the review finding where subscribing to the whole Zustand state would have retriggered SVG and pattern fetch effects after unrelated store updates; the wrapper now uses narrow store selectors and stable action dependencies.
- Persisted only compact serializable editor choices. Runtime `svgData`, derived `ptnData`, and uploaded pattern data URLs are excluded from persistence.
- Added hydration sanitization for stale shader preset ids and stale shader params while preserving valid character, mesh, displacement, and view state.
- Added store tests for defaults, preset switching, stale persisted shader state, missing preset fallback, and compact persistence payloads.
- No open grill questions remain for Phase 2.
- Verification: `pnpm test` passed with 4 files and 25 tests; `pnpm exec tsc --noEmit` passed; `pnpm lint` exited 0 with the pre-existing `StudioCanvas.tsx` unused `Box` warning; `pnpm build` passed with Next 16.2.6 Turbopack; browser smoke opened `/studio`, opened the Effect panel, and found no page console errors.

## Phase 3 Grill Session: WebGL Canvas Skeleton

- [x] Review current lessons, glossary, Phase 3 plan, and existing Studio canvas/store code before asking questions.
- [x] Resolve whether Phase 3 fully replaces the old SVG-filter preview or keeps it as a fallback beside WebGL.
- [x] Grill unresolved WebGL skeleton decisions one at a time against `CONTEXT.md` and the current code.
- [x] Update `CONTEXT.md` inline only when a domain term or relationship is newly resolved.
- [x] Add a Phase 3 grill review note with decisions, open questions, and verification expectations.

### Phase 3 Grill Notes

- Resolved: fully replace `StudioCanvas` preview content with `ShaderCanvas`; keep `SvgEffectView.tsx` untouched but unused until later cleanup.
- Resolved: the Phase 3 placeholder mesh should obey persisted mesh controls now, including rotation, scale, XY position, auto-rotation, and auto-rotate speed. Use box depth as the placeholder stand-in for extrusion depth until Phase 4.
- No `CONTEXT.md` update needed: the resolved items implement the existing **Shader Effect View** and **Character Mesh** direction without changing domain terms.

## Phase 3 Execution: WebGL Canvas Skeleton

- [x] Add failing tests for shader material/uniform assembly around selected preset params and common uniforms.
- [x] Create `components/studio/ShaderCanvas.tsx` as a full-size `@react-three/fiber` canvas with placeholder mesh.
- [x] Create `components/studio/ShaderErrorOverlay.tsx` for preview-area shader errors.
- [x] Replace the `StudioCanvas` preview content with `ShaderCanvas` while keeping the current shell/control layout.
- [x] Apply selected preset switching, schema-driven uniforms, `u_time`, `u_mouse`, `u_resolution`, displacement uniforms, and bounds uniforms.
- [x] Add OrbitControls for inspection without writing orbit changes into Zustand.
- [x] Run focused tests.
- [x] Run full verification: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`.
- [x] Run browser visual smoke for nonblank WebGL canvas and `/studio` stability.

### Phase 3 Review - 2026-05-25

- Added `ShaderCanvas` as the WebGL preview surface and replaced `StudioCanvas` preview content with it.
- Added a placeholder box mesh using the selected shader preset material, schema-driven uniforms, common uniforms, animated `u_time`, pointer-backed `u_mouse`, `u_resolution`, bounds uniforms, and displacement uniforms.
- Applied persisted mesh controls to the placeholder mesh: rotation, scale, XY position, auto-rotation, auto-rotate speed, and box depth as the temporary extrusion-depth stand-in.
- Added `OrbitControls` for inspection without writing orbit changes into Zustand.
- Added `ShaderErrorOverlay` structure for preview-area shader errors.
- Added shader material helper tests for common uniforms, preset param uniforms, canvas values, bounds values, displacement values, and stale preset fallback.
- No open grill questions remain for Phase 3. The user-facing shader preset selector remains planned for Phase 5, so preset switching is wired through store/material logic but not yet exposed as a final panel.
- Verification: `pnpm test` passed with 5 files and 28 tests; `pnpm exec tsc --noEmit` passed; `pnpm lint` passed with no warnings; `pnpm build` passed with Next 16.2.6 Turbopack; browser visual smoke passed on desktop and mobile with nonblank WebGL screenshots and pixel sampling.

## Phase 0 Execution: Tooling And Shader Source Foundation

- [x] Confirm execution location: work directly on existing `v2` branch checkout.
- [x] Install runtime shader dependencies with pnpm.
- [x] Confirm Vitest dependency is installed with pnpm.
- [x] Wire `pnpm test` to `vitest run`.
- [x] Add `.glsl` raw import support while preserving production `removeConsole`.
- [x] Add GLSL module declaration.
- [x] Add shader preset, param, validation, and uniform helper contracts.
- [x] Cover default params, uniform conversion, reserved uniforms, and stale params with Vitest.
- [x] Run `pnpm test`.
- [x] Run `pnpm exec tsc --noEmit`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.

### Phase 0 Review - 2026-05-24

- Added raw `.glsl` import support for both webpack (`asset/source`) and Turbopack (`type: raw`) while preserving production `removeConsole`.
- Added `@types/glsl.d.ts`, shader preset/param types, reserved uniform validation, default param creation, hex color conversion, uniform conversion, and stale param sanitization.
- Added Vitest coverage for number/color/boolean/select defaults, color-to-`THREE.Vector3`, boolean/select uniform conversion, reserved uniform collision rejection, and stale persisted param sanitization.
- Verification: `pnpm test` passed with 2 files and 10 tests; `pnpm exec tsc --noEmit` passed; `pnpm lint` exited 0 with one pre-existing warning in `components/studio/StudioCanvas.tsx` for unused `Box`; `pnpm build` passed with Next 16.2.6 Turbopack.
- Simplify pass: reused Three's `IUniform` type, removed duplicated sanitize/convert work in uniform creation, shared hex color validation, and tightened preset/param validation without changing exported helper names.
- No Studio UI behavior was changed in Phase 0.

## Shader Effect Playground Planning

- [x] Inspect existing product language, planning docs, dependencies, and Studio editor state boundary.
- [x] Resolve whether shader effects replace the SVG effect view or become an additional preview/effect mode.
- [x] Resolve state model: move Studio editor state to a route-local Zustand store and retire `app/studio/studio-context.tsx` as state owner.
- [x] Resolve persistence: use Zustand `persist` with `localStorage`, persisting only serializable editor state.
- [x] Resolve shader preset ownership and file layout: use one folder per preset plus a central typed registry.
- [x] Resolve shader preset metadata contract: params use separate UI `id` and GLSL `uniformName`, with common uniforms reserved.
- [x] Resolve number parameter schema: `label`, `min`, `max`, `step`, `default`, and optional `unit`.
- [x] Resolve color parameter state: store hex strings in editor state and convert to `THREE.Vector3` only when building uniforms.
- [x] Resolve select parameter mapping: editor state stores option `id`; uniform conversion uses each option's explicit numeric `value`.
- [x] Resolve boolean parameter mapping: use `0.0` / `1.0` float uniforms in v1.
- [x] Resolve rendering target: redesign targets an extruded 3D character mesh derived from SVG paths, with `ShaderMaterial` applied to the mesh.
- [x] Resolve global mesh controls: extrusion depth, rotation, scale, position, and auto-rotation live outside shader preset params.
- [x] Resolve mesh transform controls: constrained v1 with XYZ rotation, uniform scale, XY position, auto-rotate toggle, and auto-rotate speed.
- [x] Resolve dependency scope: add `three`, `@react-three/fiber`, `@react-three/drei`, and `zustand` using pnpm during implementation.
- [x] Resolve multi-path SVG rendering: render a grouped set of extruded meshes sharing one `ShaderMaterial` in v1.
- [x] Resolve preview inspection: include `OrbitControls`, but do not write camera orbit changes into editor state.
- [x] Resolve shader compile error UX: show a blocking preview overlay with preset name/file path, while keeping the last valid material visible if possible.
- [x] Resolve shader material fallback: optimistically switch in v1, but keep the previous `ShaderMaterial` in a ref until the new material renders without a WebGL program error.
- [x] Resolve shader stage scope: use one shared vertex shader in v1; presets provide fragment shaders only.
- [x] Resolve mesh UV contract: shared vertex shader computes normalized object-space `v_uv` from centered mesh coordinates.
- [x] Resolve extruded face treatment: apply the selected shader to all faces in v1.
- [x] Resolve material lighting: use unlit `ShaderMaterial` in v1.
- [x] Resolve shader attribution metadata: do not include source/license metadata in v1 preset schema.
- [x] Resolve displacement map controls: reuse existing `public/images/patterns` as global displacement maps with pattern image, strength, and bias.
- [x] Resolve image distortion continuity: the same selected displacement map should also drive image-based shader distortion like the current SVG effect workflow.
- [x] Resolve displacement uniform availability: provide displacement-map uniforms globally, while presets opt in through metadata.
- [x] Resolve displacement panel behavior: show global displacement controls all the time and indicate when the selected shader preset does not use image distortion.
- [x] Resolve schema-driven shader preset contract: `id`, `name`, `category`, `fragmentShader`, optional `vertexShader`, `shaderPath`, `usesDisplacementMap`, and `params`.
- [x] Resolve uniform collision rule: fail fast if a preset param `uniformName` collides with reserved global uniforms.
- [x] Resolve preset switching behavior: reset only preset params; preserve character, mesh controls, and displacement controls.
- [x] Resolve current param state: store a complete param object for the selected preset, created from defaults on preset switch.
- [x] Resolve param value model and uniform conversion: use `number | string | boolean` values and schema-driven conversion.
- [x] Resolve persisted state hydration: reset only invalid shader preset/params, preserving character and global mesh/displacement controls.
- [x] Resolve control panels: split controls into `Character`, `Shader`, `Mesh`, and `Displacement` panels.
- [x] Resolve old style controls: remove `StylePanel` as character color controls; keep simple canvas/background color as a view-level setting if needed.
- [x] Resolve initial preset scope: start implementation with 3 curated built-in shader presets.
- [x] Resolve preset categories: use a free string category instead of a fixed union.
- [x] Resolve shader source imports: use `.glsl` files with a minimal Next webpack rule and TypeScript module declaration.
- [x] Resolve verification shape: add focused TypeScript unit tests for helper logic plus browser smoke verification.
- [x] Resolve unit test runner: add Vitest as a dev dependency and wire `pnpm test` to run it.
- [x] Resolve browser verification: use Codex/browser visual smoke checks in v1 instead of adding Playwright as a project dependency.
- [x] Resolve preview canvas behavior, compile-error fallback behavior, and verification plan.
- [x] Update `CONTEXT.md` as domain terms are resolved.
- [x] Write detailed shader redesign implementation plan without changing application code.
- [x] Write PM phased implementation plan with developer checkpoints.

## Shader Redesign Review

- Product target: replace the current SVG filter effect playground with a WebGL **Shader Effect View** on `/studio`.
- Character selection remains the existing SVG preset workflow.
- Rendering target: parse selected SVG paths into grouped extruded `ExtrudeGeometry` meshes sharing one unlit `ShaderMaterial`.
- Shader preset system: one folder per preset plus a central typed registry; start implementation with 3 curated built-in presets.
- Shader source: use `.glsl` files imported as raw source through a minimal Next webpack rule.
- State: retire `app/studio/studio-context.tsx` as state owner and move Studio editor state into a route-local Zustand store.
- Persistence: use Zustand `persist` with `localStorage`, storing only serializable editor choices.
- Controls: split panels into `Character`, `Shader`, `Mesh`, and `Displacement`.
- Mesh controls: extrusion depth, XYZ rotation, uniform scale, XY position, auto-rotate, and auto-rotate speed.
- Displacement: reuse `public/images/patterns` as global displacement maps with pattern image, strength, and bias.
- Shader params: schema-driven dynamic UI; no shader-specific hard-coded control panels.
- Verification: add Vitest helper tests, then run TypeScript, lint, build, and Codex/browser visual smoke checks.
- Execution handoff: use the phased implementation plan and stop for PM review after each checkpoint.
- Implementation remains not started. Application code should wait for explicit implementation approval.

## Checklist

- [x] Inspect current repo structure, docs, package dependencies, and Web3/Redux/OpenAI touchpoints.
- [x] Resolve product boundary: Hanzi Studio is an SVG character editor for viewing SVG effects only.
- [x] Resolve route and naming boundary for the editor surface.
- [x] Resolve replacement state model after Redux removal.
- [x] Resolve exact removal scope for Web3/NFT/OpenAI/hardhat files and dependencies.
- [x] Resolve verification plan for the eventual implementation.
- [x] Write detailed implementation plan document without changing application code.
- [x] Wait for explicit user approval before implementation.
- [x] Implement Next 16 App Router route split with `/` introduction and `/studio` editor.
- [x] Replace Redux-owned editor state with route-local React Context.
- [x] Remove Web3, wallet, mint, queue, NFT metadata, DALL-E/OpenAI, export/conversion, and hardhat code paths.
- [x] Switch package workflow to pnpm and update dependency lockfile.
- [x] Modernize `next.config.js` into the Next 16 TypeScript config style.
- [x] Verify TypeScript, lint, production build, runtime Studio smoke path, and removed-scope grep checks.

## Review

- Current repo already declares `next: 16.2.6` and uses the App Router under `app/`.
- Current `/mint` surface still carries legacy wallet, queue, NFT storage, minting, DALL-E/OpenAI, and Redux-owned state concepts.
- Product scope is now narrower than the initial recommendation: no export, no mint, no queue, no upload, no NFT, no DALL-E background image generation, and no OpenAI.
- Route boundary: keep `/` as the introduction page and move the editor to `/studio`; remove the legacy `/mint` route name.
- State and routing boundary: replace Redux with React Provider/Context for Studio state, scoped to the Studio editor; use Next App Router route files and navigation conventions instead of React Router-style routing.
- Studio context boundary: move all surviving editor state into the React Context layer, including character selection, pattern source, SVG effect parameters, style colors, and current panel state.
- Studio context location: implement the route-local context in `app/studio/studio-context.tsx`.
- Background/effect boundary: remove the Background panel and all DALL-E/OpenAI background-image generation; keep pattern because it is one of the local SVG effects, along with the related effect controls and parameter editing.
- Pattern state boundary: keep pattern as SVG effect state managed by Studio React Context, not Redux; pattern is distinct from removed background tooling.
- Metadata boundary: remove the Metadata panel and NFT metadata fields such as `name`, `description`, and `mintBy`; keep only character selection state needed to render the SVG.
- Web3 workspace boundary: remove the full `hardhat/` workspace and all contract, chain, wallet, tx, etherscan, account, NFT, IPFS, and minting code paths.
- Studio UI boundary: remove the bottom `Queue`/`Mint` action area and modal workflow; the sidebar should only expose editor controls: `Character`, SVG effect parameters, and style controls.
- Panel naming boundary: rename the current `Text` panel to `Character` because it selects a Hanzi SVG character, not free text.
- Studio component boundary: move Studio-specific UI under `components/studio/`; rename `ToolStack` to `StudioControls`, `CharList` to `CharacterPanel`, `Effect` to `EffectPanel`, `Style` to `StylePanel`, `Img` to `StudioCanvas`, and `SvgItem` to `SvgEffectView`.
- Deleted component boundary: remove `Preview`, `Queue`, `Metadata`, and `ToolStack/dalle/*` rather than adapting them.
- Shell boundary: do not keep a global `BasicAppShell` with pathname branching for editor behavior; keep the introduction page simple and implement `/studio` with a dedicated `StudioShell`.
- Provider boundary: simplify global providers to Mantine/theme only; remove `ReduxProvider`, `EthProvider`, legacy `AppProvider`, notifications, and modal providers unless a remaining non-deleted UI proves it needs them. `/studio` owns `StudioProvider`.
- App Router boundary: keep `app/layout.tsx` as a server component with metadata; use a small client wrapper for Mantine/theme providers; make `/` a server introduction page using `next/link`; let `/studio/page.tsx` render a client `StudioApp` that owns `StudioProvider`, `StudioShell`, controls, and interactive SVG view.
- Dependency boundary: remove `@tanstack/react-query` because it is only used by the removed Wagmi/RainbowKit wallet provider.
- Dependency boundary: remove `axios`; the remaining Studio editor should rely on local assets and native browser/Next primitives if any fetch is needed later.
- API boundary: remove `app/api/svgToPng/route.ts` and `app/api/compress/route.ts`; the Studio view does not need server conversion, compression, upload, or export endpoints.
- Library boundary: remove `lib/sharp.ts`, `lib/svgToPng.ts`, and `lib/toFile.ts` because conversion/file/export/upload support is out of scope.
- Metadata/type boundary: remove NFT metadata builders, sample metadata, and types such as `Metadata`, `NftData`, `Job`, `NftTx`, IPFS, and token-related shapes; keep or recreate only Studio editor/effect state types.
- Env boundary: clean env code/types down to app UI needs such as `appName`, `webUrl`, `defaultColorScheme`, and `isDev` if still used; remove chain, contract, NFT storage, WalletConnect, and OpenAI env contracts. Do not edit `.env*` secret files unless explicitly requested.
- Public asset metadata boundary: inspect `site.webmanifest`, `browserconfig`, and public metadata-like assets for stale product naming; update NFT/Web3 copy but keep neutral favicon/logo assets unless they explicitly encode removed concepts.
- README boundary: rewrite the scaffold README to describe Hanzi Studio, Next 16 App Router usage, `/` introduction, `/studio` editor, and dev/build commands without NFT/Web3/OpenAI references.
- Package manager boundary: use `pnpm`; remove root `package-lock.json` and generate/update `pnpm-lock.yaml` during implementation.
- Persistence boundary: do not add state persistence in the first refactor; Studio context state resets to defaults on reload.
- Verification gate: run `pnpm install`, lint with the available ESLint/Next command, run `pnpm build`, start `pnpm dev`, verify `/` and `/studio` in browser, test Character/Effect/Style controls, confirm SVG effect view is nonblank, and grep for removed Redux/Web3/NFT/OpenAI/upload/mint/queue/DALL-E/hardhat remnants.
- ADR boundary: do not create an ADR for this refactor; keep decisions in `CONTEXT.md` and this planning file.
- Introduction CTA: use `Open Studio` and route it to `/studio`.
- Public metadata copy: replace NFT/Optimism description and keywords with Hanzi SVG character editor language.
- Plan-only boundary: current work is documentation/planning only. Do not implement application code until the user explicitly approves implementation.

## Implementation Review

- Implemented `/studio` as the Character Editor route with route-local Studio React Context and no persistence.
- Kept `/` as the introduction page and changed the CTA to `Open Studio` using Next App Router navigation.
- Removed legacy `/mint`, Redux store/slices/providers, Web3 wallet provider/UI, queue/mint/upload/export/conversion APIs, NFT metadata builders, DALL-E/OpenAI UI, and related helper code.
- Kept SVG effect pattern as an Effect control, separate from removed background-image generation.
- Replaced `next.config.js` with typed `next.config.ts` and moved linting to ESLint flat config for the Next 16 toolchain.
- Runtime verification found and fixed a Framer Motion cleanup crash, a non-scrollable Studio sidebar, and Mantine root hydration warning.
- Follow-up correction: SVG filter patterns must use data URLs in `feImage`; built-in pattern URLs stay only as preview/loading sources and are converted before the effect renders them. Any editor input that changes `ptnUrl` must clear stale `ptnData` and trigger a fresh conversion.
- Verification passed: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`, and a Playwright smoke test for `/` to `/studio` with Character/Effect/Style controls and nonblank SVG effect markup.
