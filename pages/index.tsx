import type { NextPage } from 'next'
import _ from 'lodash'
import { useRouter } from 'next/router'
import { AppShell, Title, Text, Box, Button } from '@mantine/core'
import PageHeader from 'components/PageHeader'

const Home: NextPage<{}> = () => {
  const router = useRouter()

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          width: '100vw',
          height: '100vh',
          top: 0,
          left: 0,
          background: 'url(/bg.svg) center center / cover no-repeat',
        }}
      />
      <AppShell
        header={
          <PageHeader
            labelUrl="/mint"
            headerProps={{ withBorder: false, sx: { background: 'transparent' } }}
          />
        }
      >
        <Box pos="relative" p={{ sm: 24 }}>
          <Title fz={{ sm: 48 }} pt={48} pb={24}>
            Revolutionizing Art in <br /> Chinese NFT
          </Title>
          <Text
            fz={{ sm: 18 }}
            maw={440}
            pb={{ base: 48, sm: 80 }}
            sx={(theme) => ({ color: theme.colors.dark[3] })}
          >
            Exploring the Possibilities of NFTs for Empowering Artists and Redefining the Art Market
            in Chinese world
          </Text>

          <Button radius={99} size="xl" px={48} onClick={() => router.push('/mint')}>
            Let's Try
          </Button>
        </Box>
      </AppShell>
    </>
  )
}

export default Home
