import { Box } from '@mantine/core'
import MotionSvg from '@/components/Motion/MotionSvg'
import type { MotionType } from '@/components/Motion/MotionPath'
import classes from '@/components/home/HomePage.module.css'

const list = [0, 1, 2, 3, 4, 5, 6]
const types: MotionType[] = ['a', 'b', 'x', 'n']

export default function PageBg() {
  return (
    <Box
      className={classes.background}
      pos="fixed"
      w="100dvw"
      h="100dvh"
      top={0}
      left={0}
      style={{
        filter: 'blur(100px)',
      }}
    >
      {list.map((el, i) => (
        <MotionSvg key={`${i}`} index={i} pathProps={{ type: types[i % types.length] }} />
      ))}
    </Box>
  )
}
