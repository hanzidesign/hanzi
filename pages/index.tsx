import type { NextPage } from 'next'
import _ from 'lodash'
import { AppShell, Title, Text, Box, Button, useMantineTheme } from '@mantine/core'
import PageHeader from 'components/PageHeader'
import MotionPath from 'components/Motion/MotionPath'

const Home: NextPage<{}> = () => {
  const theme = useMantineTheme()
  return (
    <>
      <Box pos="fixed" w="100vw" h="100vh" top={0} left={0} bg="url(/bg.svg) center center / cover no-repeat" />
      <AppShell>
        <AppShell.Header p={16} px={{ sm: 40 }} withBorder={false} bg="transparent">
          <PageHeader labelUrl="/mint" />
        </AppShell.Header>

        <AppShell.Main>
          <Box pos="relative" h="100dvh" p={{ sm: 24 }}>
            <MotionPath type="a" initX={40} initY={80} offsetX={40} offsetY={40}>
              <p>Dev</p>
            </MotionPath>

            {/* <Button radius={99} size="xl" px={48} onClick={() => (window.location.href = '/mint')}>
            Go Mint
          </Button> */}
          </Box>
        </AppShell.Main>
      </AppShell>
    </>
  )
}

export default Home
