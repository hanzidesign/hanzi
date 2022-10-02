import type { NextPage } from 'next'
import { useState } from 'react'
import Head from 'next/head'
import { Divider, Group, Box, createStyles } from '@mantine/core'
import ToolStack from 'components/ToolStack'

const useStyles = createStyles((theme) => ({
  box: {
    height: '100vh',
    padding: 20,
  },
}))

type Props = {}

const Home: NextPage<Props> = () => {
  const [value, setValue] = useState(45)
  const { classes } = useStyles()

  return (
    <>
      <Head>
        <title>Font NFT</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Group spacing={0}>
          <Box
            className={classes.box}
            sx={{
              flex: '400px 0',
            }}
          >
            <ToolStack />
          </Box>

          <Divider orientation="vertical" />

          <Box className={classes.box} sx={{ flexGrow: 1 }}>
            2
          </Box>
        </Group>
      </main>
    </>
  )
}

export default Home

export async function getStaticProps() {
  return {
    props: {},
    // Next.js will attempt to re-generate the page:
    // - When a request comes in
    // - At most once every 10 seconds
    revalidate: 60 * 60 * 24, // In seconds
  }
}
