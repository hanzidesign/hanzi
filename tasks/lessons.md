# Lessons

## 2026-05-21

- When the user says the target is an SVG character editor, do not assume an export/download workflow. Confirm whether output actions exist before recommending them.
- Do not collapse the introduction homepage into the editor just because the product has one main workspace. If the user wants an intro page, keep `/` as introduction and put the editor on a named route such as `/studio`.
- In a Next App Router project, do not introduce or preserve React Router-style routing. Prefer App Router files, `Link`, and route-local providers where possible.
- Do not conflate background-image tooling with SVG effect patterns. Background/DALL-E can be removed while local SVG pattern/effect parameters remain central to the editor.
- Pattern is not background in Hanzi Studio. Keep pattern controls/assets when removing background tooling because pattern is part of the SVG effect system.
- When Redux is removed, move the surviving editor state into the agreed React Context boundary instead of leaving mixed local/store state across components.
- Avoid pathname-branching global shells when a feature has a clear route boundary. Put Studio-specific shell logic under the Studio route/component boundary.
- For env cleanup, separate code/type contracts from actual secret files. Do not rewrite `.env*` files unless explicitly requested.
- For Next App Router refactors, remove unnecessary route-level `use client`; keep metadata/layout/page shells server-side and push interactivity into narrow client components.
- When a panel selects a Hanzi SVG character, call it `Character`, not `Text`, unless there is actual text-entry or typography behavior.
- When the user says to write planning docs and not implement code, stop at documentation artifacts and keep application code untouched until explicit implementation approval.
- When the user later says to work on the current branch, do not create a new worktree or branch just because an execution skill prefers isolation.
- When upgrading a Next app to the current App Router/toolchain, include config-file modernization in scope; for Next 16 prefer a typed `next.config.ts` over preserving old CommonJS config style.
- In Hanzi Studio SVG filters, never pass a deployed asset URL directly into `feImage`; convert built-in pattern assets to data URLs first because browser SVG rendering rules can block URL-backed filter images on Vercel.
- Treat `ptnUrl` as the pattern source and `ptnData` as the SVG-filter-ready derived value. Any editor path that changes `ptnUrl` must clear stale `ptnData` and trigger a fresh URL-to-data-URL conversion.
- When a user asks about a design branch such as SVG-as-3D-mesh, do not downgrade it to future scope after giving tradeoffs. Ask whether it is the current target or later scope before recommending the implementation path.
- Do not assume Studio editor state should remain session-only once the user is designing heavier WebGL/shader controls. If refresh safety matters, treat local persistence as part of the product contract.
