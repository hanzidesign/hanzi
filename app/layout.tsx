import './global.css'

import Script from 'next/script'
import Providers from '@/components/providers/Providers'
import { publicEnv } from '@/utils/env'
import { fontVariables } from '@/theme/font'
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 2,
}

const title = publicEnv.appName
const description = 'A visual editor for exploring Hanzi SVG character effects.'
const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS
const scriptDefaultColorScheme = ['light', 'dark', 'auto'].includes(publicEnv.defaultColorScheme)
  ? publicEnv.defaultColorScheme
  : 'light'

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.webUrl),
  title,
  description,
  openGraph: {
    title,
    description,
    images: '/cover.png',
  },
  keywords: ['hanzi', 'svg', 'character editor', 'visual design'],
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
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        {gaId ? (
          <>
            <Script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <Script id="google-analytics">
              {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
          `}
            </Script>
          </>
        ) : null}
        <Script id="mantine-color-scheme" strategy="beforeInteractive">
          {`try {
  var _colorScheme = window.localStorage.getItem("mantine-color-scheme-value");
  var colorScheme = _colorScheme === "light" || _colorScheme === "dark" || _colorScheme === "auto" ? _colorScheme : "${scriptDefaultColorScheme}";
  var computedColorScheme = colorScheme !== "auto" ? colorScheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-mantine-color-scheme", computedColorScheme);
} catch (e) {}`}
        </Script>
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
