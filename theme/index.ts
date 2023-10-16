import { createTheme } from '@mantine/core'

const myTheme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        size: 'md',
      },
    },
  },
})

export { myTheme }
