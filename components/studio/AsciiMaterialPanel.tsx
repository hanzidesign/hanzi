'use client'

import { Button, ColorInput, Group, Slider, Stack, Text } from '@mantine/core'
import { useStudioStore } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

export default function AsciiMaterialPanel() {
  const mesh = useStudioStore((store) => store.mesh)
  const foreground = useStudioStore((store) => store.surfaceShaders.foreground)
  const background = useStudioStore((store) => store.surfaceShaders.background)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const resetMeshControls = useStudioStore((store) => store.resetMeshControls)
  const setSurfaceShaderLayer = useStudioStore((store) => store.setSurfaceShaderLayer)

  return (
    <PanelBox>
      <Stack gap="lg">
        <div>
          <Text fz={16} fw={700} c="#212529">
            Color / Material
          </Text>
          <Text fz={13} c="dimmed">
            Source mesh shape and colors feeding the 3D ASCII shader.
          </Text>
        </div>

        <ColorInput
          label="Foreground"
          value={foreground.color}
          onChange={(color) => setSurfaceShaderLayer('foreground', { color })}
          format="hex"
          swatchesPerRow={6}
        />
        <ColorInput
          label="Background"
          value={background.color}
          onChange={(color) => setSurfaceShaderLayer('background', { color })}
          format="hex"
          swatchesPerRow={6}
        />

        <MaterialSlider
          label="Extrusion"
          value={mesh.extrusionDepth}
          min={0.02}
          max={0.8}
          step={0.01}
          onChange={(extrusionDepth) => setMeshControl({ extrusionDepth })}
        />
        <MaterialSlider
          label="Edge Thickness"
          value={mesh.thickness}
          min={-0.2}
          max={0.2}
          step={0.01}
          onChange={(thickness) => setMeshControl({ thickness })}
        />
        <MaterialSlider
          label="Scale"
          value={mesh.scale}
          min={0.4}
          max={2}
          step={0.01}
          onChange={(scale) => setMeshControl({ scale })}
        />

        <Group justify="flex-end">
          <Button size="xs" color="dark" variant="light" onClick={resetMeshControls}>
            Reset Mesh
          </Button>
        </Group>
      </Stack>
    </PanelBox>
  )
}

function MaterialSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Group justify="space-between" mb={4}>
        <PanelLabel m={0}>{label}</PanelLabel>
        <Text fz={12} c="#495057">
          {Math.round(value * 100) / 100}
        </Text>
      </Group>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} color="dark" />
    </div>
  )
}
