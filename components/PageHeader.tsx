'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Group, ActionIcon } from '@mantine/core'
import { SiGithub } from 'react-icons/si'
import { IoMoonOutline, IoSunnyOutline } from 'react-icons/io5'
import classes from '@/components/home/HomePage.module.css'

const github = process.env.NEXT_PUBLIC_GITHUB_URL

type PageHeaderProps = {
  onToggleTheme: () => void
}

export default function PageHeader({ onToggleTheme }: PageHeaderProps) {
  return (
    <Group gap="xs" justify="space-between">
      <Link href="/" style={{ textDecoration: 'none' }} aria-label="Hanzi Studio">
        <Group gap={8}>
          <Image
            className={classes.themeLightOnly}
            src="/images/logo.svg"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
          />
          <Image
            className={classes.themeDarkOnly}
            src="/images/logo-dark.svg"
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
          />
        </Group>
      </Link>

      <Group gap={24}>
        <button
          type="button"
          className={classes.themeToggle}
          aria-label="Toggle color scheme"
          onClick={onToggleTheme}
        >
          <IoMoonOutline className={classes.themeLightOnly} aria-hidden size={20} />
          <IoSunnyOutline className={classes.themeDarkOnly} aria-hidden size={20} />
        </button>

        {github ? (
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
        ) : null}
      </Group>
    </Group>
  )
}
