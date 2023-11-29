'use client'

import { createTheme } from '@mantine/core'

const titleFF = 'var(--font-body)'
const bodyFF = 'var(--font-body)'

const theme = createTheme({
  focusRing: 'never',
  primaryColor: 'dark',
  defaultRadius: 'md',
  fontFamily: bodyFF,
  headings: { fontFamily: titleFF },
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
    },
  },
})

export { theme }
