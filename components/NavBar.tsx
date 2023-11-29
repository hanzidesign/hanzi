'use client'

import _ from 'lodash'
import { useAppSelector } from '@/store'
import { modals } from '@mantine/modals'
import { ScrollArea, Group, Box, Indicator, Title, Button } from '@mantine/core'
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
        <span>
          <Title order={2} className="absolute-horizontal">
            Preview
          </Title>
        </span>
      ),
      size: 'md',
      children: <Preview onBack={modals.closeAll} />,
    })
  }

  return (
    <ScrollArea p={20}>
      <ToolStack />
      <Box h={120} />
      <Group
        grow
        pos="fixed"
        bottom={0}
        left={10}
        w={380}
        p={20}
        bg="white"
        style={{
          zIndex: 10,
        }}
      >
        <Indicator label={unmint.length} size={24} disabled={unmint.length === 0}>
          <Button size="lg" variant="outline" color="dark" radius="md" w="100%" onClick={openQueueModal}>
            Queue
          </Button>
        </Indicator>
        <Button size="lg" variant="outline" color="dark" radius="md" onClick={openMintModal}>
          Mint
        </Button>
      </Group>
    </ScrollArea>
  )
}
