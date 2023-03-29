import Head from 'next/head'

const name = 'Chinese NFT'
const description =
  'Exploring the Possibilities of NFTs for Empowering Artists and Redefining the Art Market in Chinese World'

export default function PageHead() {
  return (
    <Head>
      <title>{name}</title>
      <meta name="description" content={description} />
      <meta property="og:site_name" content={name} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content="/cover.png" />

      <meta charSet="utf-8" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      <link rel="manifest" href="/site.webmanifest" />
      <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
      <meta name="msapplication-TileColor" content="#ffffff" />
      <meta name="theme-color" content="#ffffff"></meta>
    </Head>
  )
}
