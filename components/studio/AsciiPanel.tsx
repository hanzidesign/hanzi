'use client'

import { Group, Slider, Stack, Switch, Text } from '@mantine/core'
import { useStudioStore } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

export default function AsciiPanel() {
  const ascii = useStudioStore((store) => store.ascii)
  const setAsciiControl = useStudioStore((store) => store.setAsciiControl)

  return (
    <PanelBox>
      <Stack gap="lg">
        <div>
          <Text fz={16} fw={700} c="#212529">
            ASCII
          </Text>
          <Text fz={13} c="dimmed">
            Cell grid and luminance mapping for the active 3D mesh shader.
          </Text>
        </div>

        <AsciiSlider
          label="Cell Size"
          value={ascii.cellSize}
          min={6}
          max={32}
          step={1}
          onChange={(cellSize) => setAsciiControl({ cellSize })}
        />
        <AsciiSlider
          label="Density"
          value={ascii.density}
          min={0}
          max={1}
          step={0.01}
          percent
          onChange={(density) => setAsciiControl({ density })}
        />
        <AsciiSlider
          label="Contrast"
          value={ascii.contrast}
          min={0.2}
          max={2}
          step={0.01}
          onChange={(contrast) => setAsciiControl({ contrast })}
        />
        <AsciiSlider
          label="Depth Influence"
          value={ascii.depthInfluence}
          min={0}
          max={1}
          step={0.01}
          percent
          onChange={(depthInfluence) => setAsciiControl({ depthInfluence })}
        />
        <AsciiSlider
          label="Normal Influence"
          value={ascii.normalInfluence}
          min={0}
          max={1}
          step={0.01}
          percent
          onChange={(normalInfluence) => setAsciiControl({ normalInfluence })}
        />
        <Switch
          label="Invert ASCII"
          checked={ascii.invert}
          onChange={(event) => setAsciiControl({ invert: event.currentTarget.checked })}
          color="dark"
        />
      </Stack>
    </PanelBox>
  )
}

function AsciiSlider({
  label,
  value,
  min,
  max,
  step,
  percent = false,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  percent?: boolean
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Group justify="space-between" mb={4}>
        <PanelLabel m={0}>{label}</PanelLabel>
        <Text fz={12} c="#495057">
          {percent ? `${Math.round(value * 100)}%` : Math.round(value * 100) / 100}
        </Text>
      </Group>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} color="dark" />
    </div>
  )
}
