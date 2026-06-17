'use client'

import { Accordion } from '@mantine/core'
import { IoAddOutline } from 'react-icons/io5'
import type { ReactNode } from 'react'
import { useStudioStore, type StudioActivePanel } from '@/app/studio/studio-store'
import CharacterPanel from '@/components/studio/CharacterPanel'
import ShaderPanel from '@/components/studio/ShaderPanel'
import classes from './StudioControls.module.css'

const panels: Array<{
  value: StudioActivePanel
  title: string
  content: ReactNode
}> = [
  { value: 'character', title: 'Character', content: <CharacterPanel /> },
  { value: 'morph', title: 'Morph Stack', content: null },
  { value: 'shader', title: 'Shader', content: <ShaderPanel /> },
  { value: 'pattern', title: 'Pattern Layers', content: null },
]

export default function StudioControls() {
  const activePanel = useStudioStore((store) => store.view.activePanel)
  const setActivePanel = useStudioStore((store) => store.setActivePanel)

  return (
    <Accordion
      classNames={classes}
      value={activePanel}
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
          margin: '6px 0 16px',
          padding: 0,
          borderRadius: 16,
          overflow: 'hidden',
        },
        label: {
          fontSize: 24,
          fontWeight: 'bold',
        },
      }}
    >
      {panels.map(({ title, content, value }) => (
        <Accordion.Item key={value} value={value}>
          <Accordion.Control>{title}</Accordion.Control>
          <Accordion.Panel>{content}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

function isStudioPanel(value: string | null): value is StudioActivePanel {
  return panels.some((panel) => panel.value === value)
}
