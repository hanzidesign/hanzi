import _ from 'lodash'
import { useAppSelector } from 'store'
import { SimpleGrid, Group, Button, Box, Title } from '@mantine/core'
import Item, { SvgItemProps } from 'components/SvgItem/Item'
import type { Job } from 'types'

export default function Queue() {
  const { list } = useAppSelector((state) => state.queue)

  return (
    <SimpleGrid cols={4}>
      {_.map(list, (v, k) => {
        if (v) {
          const itemProps = getItemProps(v)
          return (
            <Box>
              <Item {...itemProps} />
            </Box>
          )
        }
      })}
    </SimpleGrid>
  )
}

function getItemProps(data: Job): SvgItemProps {
  const { uid, svgData, ptnUrl, width, distortion, blur, x, y, rotation, textColor, bgColor } = data
  return {
    fId: uid,
    svgData,
    ptnUrl,
    width,
    distortion,
    blur,
    x,
    y,
    rotation,
    textColor,
    bgColor,
  }
}
