import { Box } from '@mantine/core'
import MotionSvg from '@/components/Motion/MotionSvg'
import type { MotionType } from '@/components/Motion/MotionPath'

const list = [0, 1, 2, 3, 4, 5, 6]
const types: MotionType[] = ['a', 'b', 'x', 'n']

export default function PageBg() {
  return (
    <Box
      pos="fixed"
      w="100dvw"
      h="100dvh"
      top={0}
      left={0}
      style={{
        filter: 'blur(75px)',
      }}
    >
      <Box
        pos="absolute"
        w="100%"
        h="100%"
        top={0}
        left={0}
        bg="radial-gradient(34.69% 57.11% at 55.42% 63.1%, #e6c0f3 13.05%, #c7dff1 39.06%, #eaeaea 100%)"
      />
      {list.map((el, i) => (
        <MotionSvg key={`${i}`} index={i} pathProps={{ type: types[i % types.length] }} />
      ))}
    </Box>
  )
}
