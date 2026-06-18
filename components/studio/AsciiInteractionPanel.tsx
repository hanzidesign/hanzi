'use client'

import { Group, Slider, Stack, Switch, Text } from '@mantine/core'
import { useStudioStore } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

export default function AsciiInteractionPanel() {
  const mesh = useStudioStore((store) => store.mesh)
  const animation = useStudioStore((store) => store.animation)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const setAnimationControl = useStudioStore((store) => store.setAnimationControl)

  return (
    <PanelBox>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Text fz={16} fw={700} c="#212529">
              Interaction
            </Text>
            <Text fz={13} c="dimmed">
              Y-axis mesh spin and global time for ASCII animation.
            </Text>
          </div>
          <Switch
            label="Play"
            checked={animation.playing}
            onChange={(event) => setAnimationControl({ playing: event.currentTarget.checked })}
            color="dark"
          />
        </Group>

        <InteractionSlider
          label="Global Speed"
          value={animation.speed}
          min={0}
          max={4}
          step={0.01}
          onChange={(speed) => setAnimationControl({ speed })}
        />
        <InteractionSlider
          label="Y Rotation"
          value={toDegrees(mesh.rotation.y)}
          min={-180}
          max={180}
          step={1}
          unit="deg"
          onChange={(degrees) => setMeshControl({ rotation: { ...mesh.rotation, y: toRadians(degrees) } })}
        />
        <Switch
          label="Mesh Auto Spin"
          checked={mesh.autoRotate}
          onChange={(event) => setMeshControl({ autoRotate: event.currentTarget.checked })}
          color="dark"
        />
        <InteractionSlider
          label="Spin Speed"
          value={mesh.autoRotateSpeed}
          min={0}
          max={3}
          step={0.01}
          onChange={(autoRotateSpeed) => setMeshControl({ autoRotateSpeed })}
        />
      </Stack>
    </PanelBox>
  )
}

function InteractionSlider({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  onChange: (value: number) => void
}) {
  return (
    <div>
      <Group justify="space-between" mb={4}>
        <PanelLabel m={0}>{label}</PanelLabel>
        <Text fz={12} c="#495057">
          {Number.isInteger(value) ? value : Math.round(value * 100) / 100}
          {unit}
        </Text>
      </Group>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} color="dark" />
    </div>
  )
}

function toDegrees(value: number) {
  return Math.round(value * RAD_TO_DEG)
}

function toRadians(value: number) {
  return value * DEG_TO_RAD
}
