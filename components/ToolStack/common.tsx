import { forwardRef } from 'react'
import { Box, Text, createPolymorphicComponent } from '@mantine/core'
import type { BoxProps, TextProps } from '@mantine/core'

const StyledBox = createPolymorphicComponent<'div', BoxProps>(
  forwardRef<HTMLDivElement, BoxProps>((props, ref) => <Box p={20} bg="#F8F9FA" {...props} ref={ref} />)
)

const StyledText = createPolymorphicComponent<'p', TextProps>(
  forwardRef<HTMLParagraphElement, TextProps>((props, ref) => (
    <Text fz={14} fw={500} c="#212529" {...props} ref={ref} />
  ))
)

export { StyledBox, StyledText }
