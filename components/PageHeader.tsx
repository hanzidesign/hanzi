'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Group, ActionIcon, Tooltip } from '@mantine/core'
import { SiGithub } from 'react-icons/si'
import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import classes from '@/components/home/HomePage.module.css'

const github = process.env.NEXT_PUBLIC_GITHUB_URL

type PageHeaderProps = {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export default function PageHeader({ theme, onToggleTheme }: PageHeaderProps) {
  const ThemeIcon = theme === 'light' ? IoMoonOutline : IoSunnyOutline

  return (
    <Group gap="xs" justify="space-between">
      <Link href="/" style={{ textDecoration: 'none' }}>
        <Group gap={8}>
          <Image
            src={theme === 'dark' ? '/images/logo-dark.svg' : '/images/logo.svg'}
            alt="Hanzi Studio"
            width={40}
            height={40}
          />
        </Group>
      </Link>

      <Group gap={24}>
        <button
          type="button"
          className={classes.themeToggle}
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          aria-pressed={theme === 'dark'}
          onClick={onToggleTheme}
        >
          <ThemeIcon aria-hidden size={20} />
        </button>

        {github ? (
          <Tooltip label="Github">
            <ActionIcon
              component="a"
              href={github}
              aria-label="Github"
              className={classes.headerIcon}
              radius="xl"
              size={40}
              target="_blank"
              variant="transparent"
            >
              <SiGithub aria-hidden size={32} />
            </ActionIcon>
          </Tooltip>
        ) : null}
      </Group>
    </Group>
  )
}
