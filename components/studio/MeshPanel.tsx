'use client'

import { Button, ColorInput, Group, SimpleGrid, Slider, Stack, Switch, Text } from '@mantine/core'
import { useStudioStore } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

export default function MeshPanel() {
  const mesh = useStudioStore((store) => store.mesh)
  const backgroundColor = useStudioStore((store) => store.view.backgroundColor)
  const setMeshControl = useStudioStore((store) => store.setMeshControl)
  const resetMeshControls = useStudioStore((store) => store.resetMeshControls)
  const setBackgroundColor = useStudioStore((store) => store.setBackgroundColor)

  return (
    <PanelBox>
      <Stack gap="xl">
        <SimpleGrid cols={1} spacing="xl">
          <SliderControl
            label="Extrusion depth"
            value={mesh.extrusionDepth}
            min={0.02}
            max={0.6}
            step={0.01}
            onChange={(extrusionDepth) => setMeshControl({ extrusionDepth })}
          />
          <SliderControl
            label="Character mesh thickness"
            value={mesh.thickness}
            min={-0.2}
            max={0.2}
            step={0.01}
            onChange={(thickness) => setMeshControl({ thickness })}
          />
          <SliderControl
            label="Scale"
            value={mesh.scale}
            min={0.4}
            max={2}
            step={0.01}
            onChange={(scale) => setMeshControl({ scale })}
          />
        </SimpleGrid>

        <div>
          <PanelLabel mb={8}>Rotation</PanelLabel>
          <Stack gap="md">
            <SliderControl
              label="X"
              value={toDegrees(mesh.rotation.x)}
              min={-180}
              max={180}
              step={1}
              unit="deg"
              onChange={(degrees) =>
                setMeshControl({
                  rotation: { ...mesh.rotation, x: toRadians(degrees) },
                })
              }
            />
            <SliderControl
              label="Y"
              value={toDegrees(mesh.rotation.y)}
              min={-180}
              max={180}
              step={1}
              unit="deg"
              onChange={(degrees) =>
                setMeshControl({
                  rotation: { ...mesh.rotation, y: toRadians(degrees) },
                })
              }
            />
            <SliderControl
              label="Z"
              value={toDegrees(mesh.rotation.z)}
              min={-180}
              max={180}
              step={1}
              unit="deg"
              onChange={(degrees) =>
                setMeshControl({
                  rotation: { ...mesh.rotation, z: toRadians(degrees) },
                })
              }
            />
          </Stack>
        </div>

        <div>
          <PanelLabel mb={8}>Position</PanelLabel>
          <Stack gap="md">
            <SliderControl
              label="X"
              value={mesh.position.x}
              min={-2}
              max={2}
              step={0.01}
              onChange={(x) => setMeshControl({ position: { ...mesh.position, x } })}
            />
            <SliderControl
              label="Y"
              value={mesh.position.y}
              min={-2}
              max={2}
              step={0.01}
              onChange={(y) => setMeshControl({ position: { ...mesh.position, y } })}
            />
          </Stack>
        </div>

        <Stack gap="md">
          <Switch
            label="Auto-rotate"
            checked={mesh.autoRotate}
            onChange={(event) =>
              setMeshControl({ autoRotate: event.currentTarget.checked })
            }
            color="dark"
          />
          <SliderControl
            label="Auto-rotate speed"
            value={mesh.autoRotateSpeed}
            min={0}
            max={3}
            step={0.01}
            onChange={(autoRotateSpeed) => setMeshControl({ autoRotateSpeed })}
          />
        </Stack>

        <div>
          <PanelLabel>View background</PanelLabel>
          <ColorInput
            value={backgroundColor}
            onChange={setBackgroundColor}
            format="hex"
            swatchesPerRow={6}
          />
        </div>

        <Group justify="flex-end">
          <Button size="xs" color="dark" variant="light" onClick={resetMeshControls}>
            Reset mesh
          </Button>
        </Group>
      </Stack>
    </PanelBox>
  )
}

function SliderControl({
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
      <PanelLabel display="flex" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <Text span fz={13} c="dimmed">
          {formatNumber(value)}
          {unit}
        </Text>
      </PanelLabel>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        color="dark"
      />
    </div>
  )
}

function toDegrees(value: number) {
  return Math.round(value * RAD_TO_DEG)
}

function toRadians(value: number) {
  return value * DEG_TO_RAD
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
