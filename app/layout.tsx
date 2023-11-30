import '@/styles/globals.css'

import Script from 'next/script'
import Providers from '@/components/providers/Providers'
import BasicAppShell from '@/components/BasicAppShell'
import { ColorSchemeScript } from '@mantine/core'
import { publicEnv } from '@/utils/env'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 2,
}

const title = publicEnv.appName
const description =
  'Exploring the Possibilities of NFTs for Empowering Artists and Redefining the Art Market in Chinese World'
const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    images: [`${publicEnv.webUrl}/cover.png`],
  },
  keywords: ['hanzi', 'design', 'art', 'nft', 'optimism'],
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { sizes: '16x16', url: '/favicon-16x16.png' },
      { sizes: '32x32', url: '/favicon-32x32.png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#ffffff',
      },
    ],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
        <Script id="google-analytics">
          {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
          `}
        </Script>
        <ColorSchemeScript defaultColorScheme={publicEnv.defaultColorScheme} />
      </head>
      <body>
        <Providers>
          <BasicAppShell>{children}</BasicAppShell>
        </Providers>
      </body>
    </html>
  )
}
