import { Accordion } from '@mantine/core'
import { IoAddOutline } from 'react-icons/io5'
import CharList from './CharList'
import Effect from './Effect'
import Style from './Style'
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
    t: 'Metadata',
    c: <Metadata />,
  },
]

export default function ToolStack() {
  return (
    <Accordion
      classNames={classes}
      defaultValue={['0']}
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
      multiple
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
