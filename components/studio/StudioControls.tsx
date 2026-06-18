'use client'

import { Accordion, Stack, Text } from '@mantine/core'
import { IoAddOutline } from 'react-icons/io5'
import type { ReactNode } from 'react'
import { useStudioStore, type StudioActivePanel } from '@/app/studio/studio-store'
import AsciiInteractionPanel from '@/components/studio/AsciiInteractionPanel'
import AsciiMaterialPanel from '@/components/studio/AsciiMaterialPanel'
import AsciiPanel from '@/components/studio/AsciiPanel'
import AsciiStylePanel from '@/components/studio/AsciiStylePanel'
import CharacterPanel from '@/components/studio/CharacterPanel'
import MorphStackPanel from '@/components/studio/MorphStackPanel'
import PatternLayerPanel from '@/components/studio/PatternLayerPanel'
import PostFxPanel from '@/components/studio/PostFxPanel'
import RandomizePanel from '@/components/studio/RandomizePanel'
import classes from './StudioControls.module.css'

export type StudioControlsPlacement = 'left' | 'right' | 'all'

const panels: Array<{
  placement: 'left' | 'right'
  value: StudioActivePanel
  title: string
  content: ReactNode
}> = [
  { placement: 'left', value: 'character', title: 'Selected Text', content: <CharacterPanel /> },
  { placement: 'left', value: 'shader', title: 'Color / Material', content: <AsciiMaterialPanel /> },
  { placement: 'left', value: 'animation', title: 'Interaction', content: <AsciiInteractionPanel /> },
  { placement: 'right', value: 'morph', title: 'Effect', content: <MorphStackPanel /> },
  { placement: 'right', value: 'ascii', title: 'ASCII', content: <AsciiPanel /> },
  { placement: 'right', value: 'asciiStyle', title: 'ASCII Style', content: <AsciiStylePanel /> },
  { placement: 'right', value: 'pattern', title: 'Style Setting', content: <PatternLayerPanel /> },
  { placement: 'right', value: 'post', title: 'Post Process', content: <PostFxPanel /> },
  { placement: 'right', value: 'randomize', title: 'Randomize', content: <RandomizePanel /> },
]

type StudioControlsProps = {
  placement?: StudioControlsPlacement
}

export default function StudioControls({ placement = 'all' }: StudioControlsProps) {
  const activePanel = useStudioStore((store) => store.view.activePanel)
  const setActivePanel = useStudioStore((store) => store.setActivePanel)
  const visiblePanels = placement === 'all'
    ? panels
    : panels.filter((panel) => panel.placement === placement)
  const accordionValue = visiblePanels.some((panel) => panel.value === activePanel)
    ? activePanel
    : null
  const heading = placement === 'left'
    ? 'Source / Material / Interaction'
    : placement === 'right'
      ? 'Effect / ASCII / Post Process'
      : null

  return (
    <Stack gap="sm">
      {heading ? (
        <div>
          <Text fz={12} fw={800} c="#343a40" tt="uppercase" lh={1.2}>
            {heading}
          </Text>
          <Text fz={12} c="#6c757d" mt={2}>
            {placement === 'left'
              ? 'Source selection, base look, and direct movement controls.'
              : 'Effect stack, ASCII-ready styling, and finishing controls.'}
          </Text>
        </div>
      ) : null}
      <Accordion
        classNames={classes}
        value={accordionValue}
        onChange={(nextPanel) => {
          if (isStudioPanel(nextPanel)) {
            setActivePanel(nextPanel)
            return
          }

          setActivePanel(null)
        }}
        chevron={<IoAddOutline size={24} />}
        styles={{
          content: {
            margin: '6px 0 14px',
            padding: 0,
            borderRadius: 10,
            overflow: 'hidden',
          },
          label: {
            fontSize: 18,
            fontWeight: 800,
          },
        }}
      >
        {visiblePanels.map(({ title, content, value }) => (
          <Accordion.Item key={value} value={value}>
            <Accordion.Control>{title}</Accordion.Control>
            <Accordion.Panel>{content}</Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Stack>
  )
}

function isStudioPanel(value: string | null): value is StudioActivePanel {
  return panels.some((panel) => panel.value === value)
}
