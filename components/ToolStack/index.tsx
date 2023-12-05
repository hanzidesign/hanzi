'use client'

import { useAppDispatch, useAppSelector } from '@/store'
import { Accordion } from '@mantine/core'
import { setAccordion } from '@/store/slices/editor'
import { IoAddOutline } from 'react-icons/io5'
import CharList from './CharList'
import Effect from './Effect'
import Style from './Style'
import Dalle from './Dalle'
import Metadata from './Metadata'
import classes from './index.module.css'

type Cell = {
  t: string
  c: JSX.Element
}

const cells: Cell[] = [
  {
    t: 'Text',
    c: <CharList />,
  },
  {
    t: 'Effect',
    c: <Effect />,
  },
  {
    t: 'Style',
    c: <Style />,
  },
  {
    t: 'DALL·E',
    c: <Dalle />,
  },
  {
    t: 'Metadata',
    c: <Metadata />,
  },
]

export default function ToolStack() {
  const dispatch = useAppDispatch()
  const { accordion } = useAppSelector((state) => state.editor)
  return (
    <Accordion
      classNames={classes}
      value={accordion}
      onChange={(v) => dispatch(setAccordion(v))}
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
      {cells.map(({ t, c }, i) => (
        <Accordion.Item key={i} value={`${i}`}>
          <Accordion.Control>{t}</Accordion.Control>
          <Accordion.Panel>{c}</Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}
