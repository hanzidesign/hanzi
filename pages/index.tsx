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
          <Center pos="relative" h="100dvh" style={{ flexDirection: 'column' }}>
            <Text
              px={24}
              pb={64}
              ta="center"
              c="#3E3E55"
              fz={{ base: 40, sm: 48 }}
              ff="'Alfa Slab One', var(--mantine-font-family)"
            >
              The Revolutionized Art of Hanzi
            </Text>

            <Box pos="absolute" bottom={64}>
              <Button
                display="block"
                variant="outline"
                radius={10}
                size="xl"
                px={48}
                onClick={() => (window.location.href = '/mint')}
                style={{
                  borderColor: '#070A43',
                  borderWidth: 2,
                }}
              >
                <Text ff="'Alfa Slab One', var(--mantine-font-family)" fz={20}>
                  Start
                </Text>
              </Button>
            </Box>
          </Center>
        </AppShell.Main>
      </AppShell>
    </>
  )
}

export default Home
