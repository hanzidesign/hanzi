'use client'

import { usePathname } from 'next/navigation'
import { useDisclosure } from '@mantine/hooks'
import { AppShell, Burger, Group, Box } from '@mantine/core'
import PageHeader from '@/components/PageHeader'
import NavBar from '@/components/NavBar'

export default function BasicAppShell({ children }: React.PropsWithChildren) {
  const [opened, { toggle }] = useDisclosure()
  const atHome = usePathname() === '/'

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 400, breakpoint: 'sm', collapsed: { mobile: !opened || atHome, desktop: atHome } }}
    >
      <AppShell.Header p={16} px={{ sm: 40 }} withBorder={!atHome} bg="transparent">
        <Group>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" hidden={atHome} size="sm" />
          <Box style={{ flexGrow: 1 }}>
            <PageHeader />
          </Box>
        </Group>
      </AppShell.Header>
      <AppShell.Navbar>
        <NavBar />
      </AppShell.Navbar>
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  )
}
