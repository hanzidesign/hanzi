'use client'

import { Group, Select, Slider, Stack, Text } from '@mantine/core'
import {
  ASCII_CHARSET_STYLES,
  ASCII_PALETTES,
  useStudioStore,
  type StudioAsciiCharsetStyle,
  type StudioAsciiPalette,
} from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

const charsetOptions = ASCII_CHARSET_STYLES.map((style) => ({
  value: style,
  label: titleCase(style),
}))

const paletteOptions = ASCII_PALETTES.map((palette) => ({
  value: palette,
  label: titleCase(palette),
}))

export default function AsciiStylePanel() {
  const ascii = useStudioStore((store) => store.ascii)
  const setAsciiControl = useStudioStore((store) => store.setAsciiControl)

  return (
    <PanelBox>
      <Stack gap="lg">
        <div>
          <Text fz={16} fw={700} c="#212529">
            ASCII Style
          </Text>
          <Text fz={13} c="dimmed">
            Glyph family, palette, and CRT finishing for the ASCII pass.
          </Text>
        </div>

        <Select
          label="Charset Style"
          data={charsetOptions}
          value={ascii.charsetStyle}
          onChange={(charsetStyle) => {
            if (isAsciiCharsetStyle(charsetStyle)) {
              setAsciiControl({ charsetStyle })
            }
          }}
          allowDeselect={false}
        />
        <Select
          label="Palette"
          data={paletteOptions}
          value={ascii.palette}
          onChange={(palette) => {
            if (isAsciiPalette(palette)) {
              setAsciiControl({ palette })
            }
          }}
          allowDeselect={false}
        />
        <AsciiStyleSlider
          label="Scanlines"
          value={ascii.scanlineAmount}
          onChange={(scanlineAmount) => setAsciiControl({ scanlineAmount })}
        />
        <AsciiStyleSlider
          label="Bloom"
          value={ascii.bloomAmount}
          onChange={(bloomAmount) => setAsciiControl({ bloomAmount })}
        />
        <AsciiStyleSlider
          label="Curvature"
          value={ascii.curvature}
          onChange={(curvature) => setAsciiControl({ curvature })}
        />
        <AsciiStyleSlider
          label="Vignette"
          value={ascii.vignette}
          onChange={(vignette) => setAsciiControl({ vignette })}
        />
        <AsciiStyleSlider
          label="Chromatic Offset"
          value={ascii.chromaticOffset}
          onChange={(chromaticOffset) => setAsciiControl({ chromaticOffset })}
        />
        <AsciiStyleSlider
          label="Grain"
          value={ascii.grain}
          onChange={(grain) => setAsciiControl({ grain })}
        />
      </Stack>
    </PanelBox>
  )
}

function AsciiStyleSlider({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Group justify="space-between" mb={4}>
        <PanelLabel m={0}>{label}</PanelLabel>
        <Text fz={12} c="#495057">
          {Math.round(value * 100)}%
        </Text>
      </Group>
      <Slider min={0} max={1} step={0.01} value={value} onChange={onChange} color="dark" />
    </div>
  )
}

function isAsciiCharsetStyle(value: string | null): value is StudioAsciiCharsetStyle {
  return ASCII_CHARSET_STYLES.includes(value as StudioAsciiCharsetStyle)
}

function isAsciiPalette(value: string | null): value is StudioAsciiPalette {
  return ASCII_PALETTES.includes(value as StudioAsciiPalette)
}

function titleCase(value: string) {
  return value
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ')
}
