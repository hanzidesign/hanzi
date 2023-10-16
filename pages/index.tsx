import type { NextPage } from 'next'
import _ from 'lodash'
import { AppShell, Title, Text, Box, Button, useMantineTheme } from '@mantine/core'
import PageHeader from 'components/PageHeader'

const Home: NextPage<{}> = () => {
  const theme = useMantineTheme()
  return (
    <>
      <Box pos="fixed" w="100vw" h="100vh" top={0} left={0} bg="url(/bg.svg) center center / cover no-repeat" />
      <AppShell>
        <AppShell.Header p={16} px={{ sm: 40 }} withBorder={false} bg="transparent">
          <PageHeader labelUrl="/mint" />
        </AppShell.Header>

        <Box pos="relative" p={{ sm: 24 }}>
          <Title fz={{ sm: 48 }} pt={48} pb={24}>
            Revolutionizing Art in <br /> Hanzi Design
          </Title>
          <Text fz={{ sm: 18 }} maw={440} pb={{ base: 48, sm: 80 }} c={theme.colors.dark[3]}>
            Exploring the Possibilities of NFTs for Empowering Artists and Redefining the Art Market in Chinese World
          </Text>

          <Button radius={99} size="xl" px={48} onClick={() => (window.location.href = '/mint')}>
            Go Mint
          </Button>
        </Box>
      </AppShell>
    </>
  )
}

export default Home
