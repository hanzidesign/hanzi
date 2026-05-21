'use client'

import { AppShell, Box, Burger, Group } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import PageHeader from '@/components/PageHeader'
import StudioCanvas from '@/components/studio/StudioCanvas'
import StudioControls from '@/components/studio/StudioControls'

export default function StudioShell() {
  const [opened, { toggle }] = useDisclosure()

  return (
    <AppShell header={{ height: 72 }} navbar={{ width: 400, breakpoint: 'sm', collapsed: { mobile: !opened } }}>
      <AppShell.Header p={16} bg="transparent">
        <Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Box style={{ flexGrow: 1 }}>
            <PageHeader />
          </Box>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar style={{ overflowY: 'auto' }}>
        <StudioControls />
      </AppShell.Navbar>
      <AppShell.Main>
        <StudioCanvas />
      </AppShell.Main>
    </AppShell>
  )
}
