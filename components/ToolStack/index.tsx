import { useState } from 'react'
import { Divider, Accordion } from '@mantine/core'
import { createStyles } from '@mantine/core'
import { IoAddOutline } from 'react-icons/io5'
import Text from './Text'

type Cell = {
  t: string
  c: JSX.Element
}

const cells: Cell[] = [
  {
    t: 'Text',
    c: <Text />,
  },
  {
    t: 'Symbol',
    c: <Text />,
  },
  {
    t: 'Background',
    c: <Text />,
  },
]

const useStyles = createStyles(() => ({
  button: {
    fontSize: 24,
    height: 64,
    inner: {
      justifyContent: 'left',
    },
  },
}))

export default function ToolStack() {
  const { classes } = useStyles()

  return (
    <Accordion
      chevron={<IoAddOutline size={24} />}
      styles={{
        chevron: {
          '&[data-rotate]': {
            transform: 'rotate(45deg)',
          },
        },
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
