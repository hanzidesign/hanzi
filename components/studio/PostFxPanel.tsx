'use client'

import { ActionIcon, Badge, Button, Group, Select, Slider, Stack, Switch, Text, Box } from '@mantine/core'
import { IoAddOutline, IoTrashOutline } from 'react-icons/io5'
import { useStudioStore, type StudioPostFxLayer } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

const postFxOptions: Array<{ value: StudioPostFxLayer['effectId']; label: string; tier: 'Stable' | 'Experimental' }> = [
  { value: 'noise', label: 'Noise', tier: 'Stable' },
  { value: 'bloom', label: 'Bloom', tier: 'Stable' },
  { value: 'vignette', label: 'Vignette', tier: 'Stable' },
  { value: 'brightness-contrast', label: 'Brightness / Contrast', tier: 'Stable' },
  { value: 'hue-saturation', label: 'Hue / Saturation', tier: 'Stable' },
  { value: 'glitch', label: 'Glitch', tier: 'Experimental' },
  { value: 'chromatic-aberration', label: 'Chromatic Aberration', tier: 'Experimental' },
  { value: 'scanline', label: 'Scanline', tier: 'Experimental' },
  { value: 'shockwave', label: 'ShockWave', tier: 'Experimental' },
  { value: 'pixelation', label: 'Pixelation', tier: 'Experimental' },
]

export default function PostFxPanel() {
  const postFx = useStudioStore((store) => store.postFx.layers)
  const addPostFxLayer = useStudioStore((store) => store.addPostFxLayer)
  const updatePostFxLayer = useStudioStore((store) => store.updatePostFxLayer)
  const removePostFxLayer = useStudioStore((store) => store.removePostFxLayer)

  return (
    <PanelBox>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Text fz={16} fw={700} c="#212529">
              Post FX
            </Text>
            <Text fz={13} c="dimmed">
              Optional finishing stack after the mask-aware Character Surface.
            </Text>
          </div>
          <Button size="xs" color="dark" leftSection={<IoAddOutline size={16} />} onClick={() => addPostFxLayer()}>
            Add
          </Button>
        </Group>

        <Stack gap="sm">
          {postFx.map((layer, index) => (
            <PostFxLayerRow
              key={layer.id}
              index={index}
              layer={layer}
              onChange={(partial) => updatePostFxLayer(layer.id, partial)}
              onRemove={() => removePostFxLayer(layer.id)}
            />
          ))}
        </Stack>
      </Stack>
    </PanelBox>
  )
}

function PostFxLayerRow({
  index,
  layer,
  onChange,
  onRemove,
}: {
  index: number
  layer: StudioPostFxLayer
  onChange: (partial: Partial<StudioPostFxLayer>) => void
  onRemove: () => void
}) {
  const option = postFxOptions.find((item) => item.value === layer.effectId)

  return (
    <Box p="sm" bg="#ffffff" style={{ border: '1px solid #dee2e6', borderRadius: 8 }}>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Badge color="gray" variant="light">
              {String(index + 1).padStart(2, '0')}
            </Badge>
            <Switch
              label="Enabled"
              checked={layer.enabled}
              disabled={layer.locked}
              onChange={(event) => onChange({ enabled: event.currentTarget.checked })}
              color="dark"
            />
            <Badge color={option?.tier === 'Experimental' ? 'orange' : 'gray'} variant="light">
              {option?.tier ?? 'Stable'}
            </Badge>
          </Group>
          <ActionIcon variant="subtle" color="dark" aria-label="Remove Post FX Layer" disabled={layer.locked} onClick={onRemove}>
            <IoTrashOutline size={17} />
          </ActionIcon>
        </Group>

        <Select
          label="Effect"
          data={postFxOptions.map(({ value, label }) => ({ value, label }))}
          value={layer.effectId}
          disabled={layer.locked}
          onChange={(effectId) => {
            if (effectId) {
              onChange({ effectId: effectId as StudioPostFxLayer['effectId'] })
            }
          }}
          allowDeselect={false}
        />

        <div>
          <Group justify="space-between" mb={4}>
            <PanelLabel m={0}>Intensity</PanelLabel>
            <Text fz={12} c="#495057">
              {Math.round(layer.intensity * 100)}%
            </Text>
          </Group>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={layer.intensity}
            disabled={layer.locked}
            onChange={(intensity) => onChange({ intensity })}
            color="dark"
          />
        </div>
      </Stack>
    </Box>
  )
}
