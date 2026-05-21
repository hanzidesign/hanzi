'use client'

import { Accordion } from '@mantine/core'
import { IoAddOutline } from 'react-icons/io5'
import { useStudio } from '@/app/studio/studio-context'
import CharacterPanel from '@/components/studio/CharacterPanel'
import EffectPanel from '@/components/studio/EffectPanel'
import StylePanel from '@/components/studio/StylePanel'
import classes from './StudioControls.module.css'

const panels = [
  { title: 'Character', content: <CharacterPanel /> },
  { title: 'Effect', content: <EffectPanel /> },
  { title: 'Style', content: <StylePanel /> },
]

export default function StudioControls() {
  const {
    state: { panel },
    setPanel,
  } = useStudio()

  return (
    <Accordion
      classNames={classes}
      value={panel}
      onChange={setPanel}
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
      {panels.map(({ title, content }, index) => (
        <Accordion.Item key={title} value={`${index}`}>
          <Accordion.Control>{title}</Accordion.Control>
          <Accordion.Panel>{content}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
