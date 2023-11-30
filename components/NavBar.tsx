'use client'

import _ from 'lodash'
import { useAppSelector } from '@/store'
import { modals } from '@mantine/modals'
import { ScrollArea, Stack, Group, Box, Indicator, Title, Button } from '@mantine/core'
import ToolStack from '@/components/ToolStack'
import Queue from '@/components/Queue'
import Preview from '@/components/Preview'

export default function NavBar() {
  const { list } = useAppSelector((state) => state.nft)
  const unmint = _.compact(_.map(list, (v) => v)).filter((el) => !el.hash)

  const openQueueModal = () => {
    modals.closeAll()
    modals.open({
      id: 'queue',
      title: <span></span>,
      children: <Queue />,
      styles: {
        content: {
          height: '100%',
        },
      },
    })
  }

  const openMintModal = () => {
    modals.closeAll()
    modals.open({
      id: 'mint',
      title: (
        <Title order={2} className="absolute-center">
          Preview
        </Title>
      ),
      size: 'md',
      children: <Preview onBack={modals.closeAll} />,
    })
  }

  return (
    <Stack justify="space-between" h="calc(100dvh - 72px)">
      <ScrollArea p={20}>
        <ToolStack />
        <Box h={120} />
      </ScrollArea>
      <Group grow p={20}>
        <Indicator label={unmint.length} size={24} disabled={unmint.length === 0}>
          <Button size="lg" variant="outline" color="dark" radius="md" w="100%" onClick={openQueueModal}>
            Queue
          </Button>
        </Indicator>
        <Button size="lg" variant="outline" color="dark" radius="md" onClick={openMintModal}>
          Mint
        </Button>
      </Group>
    </Stack>
  )
}
