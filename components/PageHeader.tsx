'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Group, ActionIcon, Tooltip } from '@mantine/core'
import { SiGithub } from 'react-icons/si'

const github = process.env.NEXT_PUBLIC_GITHUB_URL

export default function PageHeader() {
  return (
    <Group gap="xs" justify="space-between">
      <Link href="/" style={{ textDecoration: 'none' }}>
        <Group gap={8}>
          <Image src="/images/logo.svg" alt="Hanzi Studio" width={40} height={40} />
        </Group>
      </Link>

      {github ? (
        <Group gap={24}>
          <Tooltip label="Github">
            <ActionIcon component="a" color="dark" href={github} radius="xl" target="_blank" variant="transparent">
              <SiGithub size={32} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ) : null}
    </Group>
  )
}
