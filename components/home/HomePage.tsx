'use client'

import Link from 'next/link'
import { Box, Button, Center, Text, useComputedColorScheme, useMantineColorScheme } from '@mantine/core'
import Footer from '@/components/Footer'
import PageBg from '@/components/PageBg'
import PageHeader from '@/components/PageHeader'
import classes from './HomePage.module.css'

export default function HomePage() {
  const theme = useComputedColorScheme('dark')
  const { toggleColorScheme } = useMantineColorScheme()

  return (
    <Box className={classes.home} pos="relative" mih="100dvh">
      <PageBg theme={theme} />
      <Box className={classes.contentLayer} pos="relative" p={16}>
        <PageHeader onToggleTheme={toggleColorScheme} />
      </Box>
      <Center
        className={classes.contentLayer}
        pos="relative"
        h="calc(100dvh - 72px)"
        style={{ flexDirection: 'column' }}
      >
        <Text className={classes.title} px={24} pb={64} ta="center" fz={{ base: 40, sm: 48 }} ff="var(--font-title)">
          The Revolutionized Art of Hanzi
        </Text>

        <Box className={classes.ctaPosition} pos="absolute" bottom={64}>
          <Button
            component={Link}
            href="/studio"
            className={classes.ctaButton}
            display="block"
            variant="outline"
            radius={10}
            size="lg"
            px={40}
          >
            <Text className={classes.ctaLabel} ff="var(--font-body)" fz={18}>
              Open Studio
            </Text>
          </Button>
        </Box>
      </Center>
      <Box className={`${classes.contentLayer} ${classes.footer}`} pos="absolute" w="100%" bottom={0}>
        <Footer />
      </Box>
    </Box>
  )
}
