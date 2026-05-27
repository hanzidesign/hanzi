# Hanzi Studio Refactor Plan

> **Historical:** This original refactor plan is superseded for active `/studio` implementation by `tasks/v2.1/README.md`. Keep it only for product-boundary background.

Status: historical reference. Do not implement from this file unless the user explicitly reopens the initial SVG-effect refactor scope.

## Goal

Refactor the project into **Hanzi Studio**: a Next.js 16 App Router application with an introduction page at `/` and a Studio editor at `/studio`.

The Studio editor is only for selecting Hanzi SVG characters and viewing/editing SVG effects. It does not export, upload, mint, queue, persist, generate AI images, or connect to wallets.

## Non-Goals

- No export or download workflow.
- No minting, wallet connection, chain state, transaction state, NFT metadata, IPFS, or upload flow.
- No DALL-E/OpenAI background generation.
- No Redux, Redux Persist, Redux Logger, React Query, Wagmi, RainbowKit, nft.storage, OpenAI, Hardhat, or Axios.
- No state persistence in the first refactor.
- No ADR for this refactor.
- Do not edit `.env*` secret files unless explicitly requested.

## Product Language

Use the terms defined in `CONTEXT.md`.

- Use **Hanzi Studio** for the product.
- Use **Introduction Page** for `/`.
- Use **Character Editor** for `/studio`.
- Use **Character Panel**, not `Text`.
- Use **SVG Effect View** for the rendered canvas.
- Use **SVG Effect Pattern** for pattern effects. Pattern is not background.

## Target Routes

- `/`: introduction page.
  - Keep the existing introduction concept.
  - CTA text: `Open Studio`.
  - CTA target: `/studio`.
  - Should be a server component using `next/link`, not `useRouter`.

- `/studio`: Hanzi Studio editor.
  - Replaces the legacy `/mint` route.
  - Owns editor state through route-local React Context.
  - Shows editor controls and live SVG effect view.
  - Has no queue, mint, upload, export, preview modal, wallet, or metadata workflow.

## App Router Architecture

- Keep `app/layout.tsx` as a server component with metadata.
- Use a small client provider wrapper only for Mantine/theme if required.
- Do not keep global editor shell logic in `app/layout.tsx`.
- Do not keep pathname-branching shell behavior for Studio.
- `/studio/page.tsx` should render a client `StudioApp`.
- `StudioApp` owns:
  - `StudioProvider`
  - `StudioShell`
  - `StudioControls`
  - `StudioCanvas`
  - interactive SVG effect rendering

## State Model

Create route-local context in:

- `app/studio/studio-context.tsx`

The context should replace Redux for all surviving editor state.

State should include:

- Character selection:
  - `charUrl`
  - `svgData`
  - `country`
  - `year`
  - `ch`
  - `isTc`
- Pattern/effect:
  - `ptnUrl`
  - `ptnData`
  - `seed`
  - `distortion`
  - `blur`
  - `width`
  - `x`
  - `y`
  - `rotation`
- Style:
  - `textColor`
  - `bgColor`
- UI:
  - current accordion/panel value

State should not include:

- `apiKey`
- `name`
- `description`
- `mintBy`
- wallet account
- chain id
- etherscan URL
- queue jobs
- NFT transaction records
- IPFS URL
- upload progress
- DALL-E image state
- background image generation state

Use Provider/Context with a reducer or typed updater API. Keep defaults equivalent to the current editor defaults where they still make sense.

No persistence: state resets to defaults on reload.

## Studio UI

The `/studio` sidebar should contain controls only:

- `Character`
- `Effect`
- `Style`

Remove:

- `Background`
- `Metadata`
- `Queue`
- `Mint`
- `Upload`
- Preview modal workflow
- bottom action area

Pattern remains inside `Effect` because it is one of the SVG effects. Preserve pattern controls/assets as effect controls, including the current built-in seed pattern behavior and local pattern upload unless implementation discovers a direct conflict.

## Component Ownership

Move Studio-specific components under:

- `components/studio/`

Rename/migrate:

- `components/ToolStack/index.tsx` -> `components/studio/StudioControls.tsx`
- `components/ToolStack/CharList.tsx` -> `components/studio/CharacterPanel.tsx`
- `components/ToolStack/Effect.tsx` -> `components/studio/EffectPanel.tsx`
- `components/ToolStack/Style.tsx` -> `components/studio/StylePanel.tsx`
- `components/Img/index.tsx` -> `components/studio/StudioCanvas.tsx`
- `components/SvgItem/index.tsx` and `components/SvgItem/Item.tsx` -> `components/studio/SvgEffectView.tsx`

Create or rewrite:

- `components/studio/StudioApp.tsx`
- `components/studio/StudioShell.tsx`

Remove rather than adapt:

- `components/Preview.tsx`
- `components/Queue.tsx`
- `components/ToolStack/Metadata.tsx`
- `components/ToolStack/dalle/*`
- `components/providers/EthProvider.tsx`
- `store/ReduxProvider.tsx`
- legacy `hooks/useAppContext.tsx`

Simplify or remove:

- `components/BasicAppShell.tsx`
- `components/NavBar.tsx`
- `components/providers/Providers.tsx`

The final structure should avoid global app chrome owning Studio editor state.

## Removal Scope

Remove application code for:

- Redux store and slices:
  - `store/index.ts`
  - `store/reducers.ts`
  - `store/logger.ts`
  - `store/customStorage.ts`
  - `store/slices/*`
- Web3/wallet/chain:
  - Wagmi/RainbowKit imports
  - wallet connect UI
  - account/chain hooks
  - transaction links
  - etherscan helpers/icons if no longer used
- NFT/upload/IPFS:
  - `lib/nftStorage.ts`
  - queue/upload flow
  - NFT metadata flow
  - IPFS URL helpers if no longer used
- OpenAI/DALL-E:
  - `lib/openai.ts`
  - `lib/dalle.ts`
  - DALL-E hooks/components
  - API key state/UI
- Conversion/export/file helpers:
  - `app/api/svgToPng/route.ts`
  - `app/api/compress/route.ts`
  - `lib/sharp.ts`
  - `lib/svgToPng.ts`
  - `lib/toFile.ts`
- Contract workspace:
  - full `hardhat/` workspace

## Dependency Cleanup

Use `pnpm` as the package manager.

Remove root `package-lock.json`.

Generate/update `pnpm-lock.yaml` during implementation.

Remove dependencies that no longer have surviving imports:

- `@reduxjs/toolkit`
- `react-redux`
- `redux-persist`
- `redux-logger`
- `@types/redux-logger`
- `@tanstack/react-query`
- `wagmi`
- `@rainbow-me/rainbowkit`
- `viem` if unused after Web3 removal
- `nft.storage`
- `openai`
- `axios`
- `sharp` if only used by removed conversion endpoints
- any Hardhat-only root dependencies if present

Keep dependencies that support the remaining Studio UI/effects:

- Next.js 16
- React 19
- Mantine
- flubber/framer-motion if still used by SVG/effect rendering
- lodash/numeral if still useful in migrated editor code
- react-icons if still used by remaining controls

After implementation, verify by searching imports before final dependency deletion.

## Env Cleanup

Clean code/type contracts only.

Keep only app UI env needs, such as:

- `appName`
- `webUrl`
- `defaultColorScheme`
- `isDev` if still used

Remove code/type references to:

- chain RPC URLs
- chain id
- contract address
- NFT storage token
- WalletConnect/project id
- OpenAI API key

Do not edit `.env`, `.env.local`, or other secret files unless explicitly requested.

## Public Metadata And Docs

Update product metadata:

- Replace NFT/Optimism description and keywords with Hanzi SVG character editor language.
- Suggested description: `A visual editor for exploring Hanzi SVG character effects.`
- Suggested keywords: `hanzi`, `svg`, `character editor`, `visual design`

Inspect:

- `public/site.webmanifest`
- `public/browserconfig.xml`
- other public metadata-like files

Keep neutral favicon/logo assets unless they explicitly encode removed Web3/NFT concepts.

Rewrite `README.md`:

- Hanzi Studio purpose
- Next.js 16 App Router
- routes:
  - `/` introduction
  - `/studio` editor
- package manager: `pnpm`
- dev/build commands
- no NFT/Web3/OpenAI/scaffold `pages/` references

## Implementation Phases

### Phase 1: App Router And Product Copy

- [ ] Update `app/layout.tsx` metadata away from NFT/Optimism.
- [ ] Simplify global providers to Mantine/theme only.
- [ ] Convert `/` to server introduction page with `Open Studio` link to `/studio`.
- [ ] Create `/studio/page.tsx` route.

### Phase 2: Studio Context

- [ ] Create `app/studio/studio-context.tsx`.
- [ ] Move surviving editor defaults into context.
- [ ] Add actions/updaters for character, pattern, effect parameters, style, and current panel.
- [ ] Confirm no persistence is added.

### Phase 3: Studio Components

- [ ] Create `components/studio/StudioApp.tsx`.
- [ ] Create `components/studio/StudioShell.tsx`.
- [ ] Move/rename `ToolStack` to `StudioControls`.
- [ ] Move/rename `CharList` to `CharacterPanel`.
- [ ] Move/rename `Effect` to `EffectPanel`.
- [ ] Move/rename `Style` to `StylePanel`.
- [ ] Move/rename `Img`/`SvgItem` to `StudioCanvas`/`SvgEffectView`.
- [ ] Replace Redux hooks with `useStudio()`.
- [ ] Remove Background, Metadata, Queue, Mint, Upload, Preview, wallet, and DALL-E UI.

### Phase 4: Delete Removed Flows

- [ ] Delete Redux store/provider/slices/logger/persist storage.
- [ ] Delete Web3/wallet/chain hooks/components.
- [ ] Delete NFT/upload/queue/mint hooks/libs/components.
- [ ] Delete OpenAI/DALL-E hooks/libs/components.
- [ ] Delete conversion/export API routes and helpers.
- [ ] Keep pattern effect controls/assets.
- [ ] Keep character assets and SVG effect rendering.

### Phase 5: Types, Env, Package Manager

- [ ] Clean `types/index.ts` to Studio editor/effect types only.
- [ ] Clean env utility/types to app UI env only.
- [ ] Remove root `package-lock.json`.
- [ ] Generate/update `pnpm-lock.yaml`.
- [ ] Remove unused dependencies after import cleanup.

### Phase 6: Docs

- [ ] Rewrite `README.md`.
- [ ] Update public metadata/manifests.
- [ ] Keep `CONTEXT.md` aligned with final product language.
- [ ] Update `tasks/todo.md` review notes with implementation result when implementation happens.

## Verification Gate

Run after implementation, before calling the refactor complete:

- [ ] `pnpm install`
- [ ] Lint with the available ESLint/Next command.
- [ ] `pnpm build`
- [ ] Start `pnpm dev`.
- [ ] Browser-check `/`.
- [ ] Browser-check `/studio`.
- [ ] Confirm `Open Studio` navigates to `/studio`.
- [ ] Confirm Character controls change the SVG character.
- [ ] Confirm Effect controls change the SVG effect.
- [ ] Confirm Pattern controls still work as an effect.
- [ ] Confirm Style controls change text/background colors.
- [ ] Confirm SVG effect view is nonblank.
- [ ] Confirm no queue/mint/upload/export/modal workflow appears.
- [ ] Grep for removed runtime imports and concepts:
  - `redux`
  - `react-redux`
  - `redux-persist`
  - `wagmi`
  - `rainbow`
  - `nft.storage`
  - `openai`
  - `dalle`
  - `hardhat`
  - `mint`
  - `queue`
  - `upload`
  - `ipfs`
  - `wallet`

## Staff-Engineer Review Checklist

- [ ] Does the repo now describe one product boundary: Hanzi Studio?
- [ ] Is `/studio` the only owner of editor state?
- [ ] Are global providers free of editor/Web3 state?
- [ ] Are pattern effects preserved while background generation is removed?
- [ ] Are app routes using App Router conventions instead of React Router-style routing?
- [ ] Are removed dependencies truly unused?
- [ ] Are deleted workflows removed from code, UI, docs, env contracts, and metadata?
- [ ] Is the implementation smaller than a compatibility layer or adapter-heavy migration?

## Known Existing Workspace State

Before implementation, the working tree already shows unrelated or pre-existing deletions for `hardhat/`, several legacy hooks/libs, and root `package-lock.json`, plus modifications to `package.json`. Treat these as existing workspace state and do not revert them.
