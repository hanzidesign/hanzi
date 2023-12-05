'use client'

import clsx from 'clsx'
import { useAppContext } from '@/hooks/useAppContext'
import { Box, Image } from '@mantine/core'
import SvgItem from '@/components/SvgItem'
import classes from './index.module.css'

export default function Img() {
  const {
    state: { showDelle },
    getActiveImg,
  } = useAppContext()

  const img = getActiveImg()
  const showImg = showDelle && Boolean(img)

  return (
    <>
      <Box
        className={clsx(classes.box, { hide: showImg, 'pointer-none': showImg })}
        style={{ transitionDelay: '100ms' }}
      >
        <SvgItem />
      </Box>
      <Box className={clsx(classes.box, { hide: !showImg, 'pointer-none': !showImg })}>
        <Image w="100%" h="100%" src={img} />
      </Box>
    </>
  )
}
