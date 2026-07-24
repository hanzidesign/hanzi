import { Box } from '@mantine/core'
import HomeSpatialMotion from '@/components/home/HomeSpatialMotion'
import classes from '@/components/home/HomePage.module.css'

type PageBgProps = {
  theme: 'light' | 'dark'
}

export default function PageBg({ theme }: PageBgProps) {
  return (
    <Box aria-hidden="true" className={classes.background} pos="fixed" w="100dvw" h="100dvh" top={0} left={0}>
      <div className={classes.ambientField} />
      <div className={classes.motionCanvas}>
        <HomeSpatialMotion theme={theme} />
      </div>
    </Box>
  )
}
