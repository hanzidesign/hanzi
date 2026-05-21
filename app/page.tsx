import Link from 'next/link'
import { Text, Box, Center, Button } from '@mantine/core'
import PageBg from '@/components/PageBg'
import PageHeader from '@/components/PageHeader'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <Box pos="relative" mih="100dvh">
      <PageBg />
      <Box pos="relative" p={16}>
        <PageHeader />
      </Box>
      <Center pos="relative" h="calc(100dvh - 72px)" style={{ flexDirection: 'column' }}>
        <Text px={24} pb={64} ta="center" c="#3E3E55" fz={{ base: 40, sm: 48 }} ff="var(--font-title)">
          The Revolutionized Art of Hanzi
        </Text>

        <Box pos="absolute" bottom={64}>
          <Link href="/studio" style={{ textDecoration: 'none' }}>
            <Button
              display="block"
              variant="outline"
              radius={10}
              size="xl"
              px={48}
              style={{
                borderColor: '#070A43',
                borderWidth: 2,
              }}
            >
              <Text ff="var(--font-title)" fz={20}>
                Open Studio
              </Text>
            </Button>
          </Link>
        </Box>
      </Center>
      <Box pos="absolute" w="100%" bottom={0}>
        <Footer />
      </Box>
    </Box>
  )
}
