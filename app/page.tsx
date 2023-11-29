'use client'

import { useRouter } from 'next/navigation'
import { Text, Box, Center, Button } from '@mantine/core'
import PageBg from '@/components/PageBg'

export default function Home() {
  const router = useRouter()

  return (
    <>
      <PageBg />
      <Center pos="relative" h="calc(100dvh - 72px)" style={{ flexDirection: 'column' }}>
        <Text px={24} pb={64} ta="center" c="#3E3E55" fz={{ base: 40, sm: 48 }} ff="var(--font-title)">
          The Revolutionized Art of Hanzi
        </Text>

        <Box pos="absolute" bottom={64}>
          <Button
            display="block"
            variant="outline"
            radius={10}
            size="xl"
            px={48}
            onClick={() => router.push('/mint')}
            style={{
              borderColor: '#070A43',
              borderWidth: 2,
            }}
          >
            <Text ff="var(--font-title)" fz={20}>
              Start
            </Text>
          </Button>
        </Box>
      </Center>
    </>
  )
}
