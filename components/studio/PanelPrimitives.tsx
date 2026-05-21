import { forwardRef } from 'react'
import { Box, Text, createPolymorphicComponent } from '@mantine/core'
import type { BoxProps, TextProps } from '@mantine/core'

const PanelBox = createPolymorphicComponent<'div', BoxProps>(
  forwardRef<HTMLDivElement, BoxProps>(function PanelBox(props, ref) {
    return <Box p={20} bg="#F8F9FA" {...props} ref={ref} />
  })
)

const PanelLabel = createPolymorphicComponent<'p', TextProps>(
  forwardRef<HTMLParagraphElement, TextProps>(function PanelLabel(props, ref) {
    return <Text fz={14} fw={500} c="#212529" {...props} ref={ref} />
  })
)

export { PanelBox, PanelLabel }
