import type { NextPage } from 'next'

import _ from 'lodash'
import React from 'react'
import { AppShell, Text, Box, Center, Button } from '@mantine/core'
import PageHeader from 'components/PageHeader'
import PageBg from 'components/PageBg'

const Home: NextPage<{}> = () => {
  return (
    <>
      <PageBg />
      <AppShell>
        <AppShell.Header p={16} px={{ sm: 40 }} withBorder={false} bg="transparent">
          <PageHeader labelUrl="/mint" />
        </AppShell.Header>

        <AppShell.Main>
          <Center pos="relative" h="100dvh">
            <Text px={24} ta="center" c="#3E3E55" fz={48} ff="'Alfa Slab One', var(--mantine-font-family)">
              The Revolutionized Art of Hanzi
            </Text>
          </Center>
          {/* <Button radius={99} size="xl" px={48} onClick={() => (window.location.href = '/mint')}>
            Go Mint
          </Button> */}
        </AppShell.Main>
      </AppShell>
    </>
  )
}

export default Home
