# Hanzi Studio

Hanzi Studio is a Next.js 16 App Router application for exploring Hanzi SVG character effects. It has an introduction page and a focused SVG character editor.

## Routes

- `/` - introduction page
- `/studio` - Hanzi SVG character editor

## Development

Use pnpm:

```bash
pnpm install
pnpm dev
```

Build and lint:

```bash
pnpm lint
pnpm build
```

## Scope

The editor is local to the browser session. It supports character selection, SVG effect parameters, pattern effects, and style controls.

It does not include export, upload, minting, wallet, NFT, IPFS, or AI image-generation flows.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
