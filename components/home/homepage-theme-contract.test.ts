import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MantineProvider } from '@mantine/core'

import { describe, expect, it } from 'vitest'
import HomePage from './HomePage'
import PageHeader from '@/components/PageHeader'

const root = join(process.cwd(), 'components', 'home')

describe('homepage theme contract', () => {
  it('keeps the route entry server-side and delegates to the client homepage', async () => {
    const page = await readFile(join(process.cwd(), 'app', 'page.tsx'), 'utf8')
    const homePage = await readFile(join(root, 'HomePage.tsx'), 'utf8')

    expect(page).toContain("import HomePage from '@/components/home/HomePage'")
    expect(page).toContain('return <HomePage />')
    expect(page).not.toContain("'use client'")
    expect(homePage).toContain("'use client'")
    expect(homePage).toContain("useComputedColorScheme('dark')")
    expect(homePage).toContain('useMantineColorScheme()')
    expect(homePage).toContain('onToggleTheme={toggleColorScheme}')
    expect(homePage).not.toContain('data-home-theme')
    expect(homePage).not.toContain('useStudioStore')
    expect(homePage).toContain('The Revolutionized Art of Hanzi')
    expect(homePage).toContain('href="/studio"')
  })

  it('renders the app dark default without nested CTA controls', () => {
    const markup = renderToStaticMarkup(
      createElement(MantineProvider, { defaultColorScheme: 'dark' }, createElement(HomePage))
    )

    expect(markup).not.toContain('data-home-theme')
    expect(markup).toContain('aria-label="Switch to light theme"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toMatch(/<a[^>]*href="\/studio"[^>]*>[\s\S]*?Open Studio[\s\S]*?<\/a>/)
    expect(markup).not.toMatch(/<a[^>]*href="\/studio"[^>]*>[\s\S]*?<button/)
  })

  it('renders the dark header state with its matching logo and accessible toggle state', () => {
    const markup = renderToStaticMarkup(
      createElement(
        MantineProvider,
        null,
        createElement(PageHeader, { theme: 'dark', onToggleTheme: () => undefined })
      )
    )

    expect(markup).toContain('logo-dark.svg')
    expect(markup).toContain('aria-label="Switch to light theme"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).not.toContain('>Theme<')
  })

  it('defines light and dark semantic tokens for the homepage surface and controls', async () => {
    const styles = await readFile(join(root, 'HomePage.module.css'), 'utf8')

    expect(styles).toContain(":global([data-mantine-color-scheme='light']) .home")
    expect(styles).toContain(":global([data-mantine-color-scheme='dark']) .home")
    expect(styles).toContain('--home-background-gradient:')
    expect(styles).toContain('linear-gradient(')
    expect(styles).toContain('135deg,')
    expect(styles).toContain('--home-title:')
    expect(styles).toContain('--home-cta-border:')
    expect(styles).toContain('--home-cta-border: #fff;')
    expect(styles).toContain('--home-header-icon:')
    expect(styles).toContain('#030518 100%')
    expect(styles).toContain('background: var(--home-background-gradient);')
    expect(styles).toContain('.themeToggle:hover')
    expect(styles).toContain('.ctaButton:active')
    expect(styles).toContain(':focus-visible')

    const themeButtonState = styles.match(
      /\.themeToggle:hover,\s*\.themeToggle\[aria-pressed='true'\]\s*\{([^}]*)\}/
    )
    expect(themeButtonState?.[1]).not.toContain('background')
  })

  it('uses dark as the shared app default', async () => {
    const envSource = await readFile(join(process.cwd(), 'utils', 'env.ts'), 'utf8')
    const localEnv = await readFile(join(process.cwd(), '.env'), 'utf8')
    const localOverride = await readFile(join(process.cwd(), '.env.local'), 'utf8')

    expect(envSource).toContain("process.env.NEXT_PUBLIC_COLOR_SCHEME || 'dark'")
    expect(localEnv).toContain('NEXT_PUBLIC_COLOR_SCHEME=dark')
    expect(localOverride).toContain('NEXT_PUBLIC_COLOR_SCHEME=dark')
  })

  it('switches the brand asset and exposes an accessible theme toggle', async () => {
    const header = await readFile(join(process.cwd(), 'components', 'PageHeader.tsx'), 'utf8')

    expect(header).toContain("src={theme === 'dark' ? '/images/logo-dark.svg' : '/images/logo.svg'}")
    expect(header).toContain("theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'")
    expect(header).toContain('aria-pressed={theme === \'dark\'}')
    expect(header).not.toContain('<span>Theme</span>')
    expect(header).toContain('<ThemeIcon aria-hidden size={20} />')
    expect(header).toContain('href={github}')
  })
})
