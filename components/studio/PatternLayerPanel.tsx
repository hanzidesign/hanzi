'use client'

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  useMantineTheme,
} from '@mantine/core'
import { IoAddOutline, IoArrowDownOutline, IoArrowUpOutline, IoTrashOutline } from 'react-icons/io5'
import {
  MAX_PATTERN_LAYERS,
  useStudioStore,
  type StudioPatternLayer,
  type StudioPatternLayerTarget,
} from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'
import { LAYER_BLEND_MODES, type LayerBlendMode } from '@/components/studio/layer-compositing'
import { builtInPatternAssets } from '@/utils/patternAssets'

const targetOptions: Array<{ value: StudioPatternLayerTarget; label: string }> = [
  { value: 'foreground-shader', label: 'Foreground' },
  { value: 'background-shader', label: 'Background' },
  { value: 'morph-stack', label: 'Morph Stack' },
]

const blendModeOptions: Array<{ value: LayerBlendMode; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
]

export default function PatternLayerPanel() {
  const patternLayers = useStudioStore((store) => store.patternLayers)
  const addPatternLayer = useStudioStore((store) => store.addPatternLayer)
  const updatePatternLayer = useStudioStore((store) => store.updatePatternLayer)
  const removePatternLayer = useStudioStore((store) => store.removePatternLayer)
  const reorderPatternLayer = useStudioStore((store) => store.reorderPatternLayer)
  const setPatternLayerLocked = useStudioStore((store) => store.setPatternLayerLocked)

  return (
    <PanelBox>
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Text fz={16} fw={700} c="#212529">
              Pattern Layers
            </Text>
            <Text fz={13} c="dimmed">
              {patternLayers.length}/{MAX_PATTERN_LAYERS} active slots
            </Text>
          </div>
          <Button
            size="xs"
            color="dark"
            leftSection={<IoAddOutline size={16} />}
            disabled={patternLayers.length >= MAX_PATTERN_LAYERS}
            onClick={() => addPatternLayer()}
          >
            Add
          </Button>
        </Group>

        {patternLayers.length === 0 ? (
          <Box
            p="md"
            bg="#ffffff"
            style={{
              border: '1px dashed #ced4da',
              borderRadius: 8,
            }}
          >
            <Text fz={13} c="dimmed">
              Add a Pattern Layer to modulate the foreground, background, or Morph Stack.
            </Text>
          </Box>
        ) : (
          <Stack gap="md">
            {patternLayers.map((layer, index) => (
              <PatternLayerRow
                key={layer.id}
                index={index}
                layer={layer}
                canMoveUp={index > 0}
                canMoveDown={index < patternLayers.length - 1}
                onChange={(partial) => updatePatternLayer(layer.id, partial)}
                onLockChange={(locked) => setPatternLayerLocked(layer.id, locked)}
                onMoveUp={() => reorderPatternLayer(index, index - 1)}
                onMoveDown={() => reorderPatternLayer(index, index + 1)}
                onRemove={() => removePatternLayer(layer.id)}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </PanelBox>
  )
}

function PatternLayerRow({
  index,
  layer,
  canMoveUp,
  canMoveDown,
  onChange,
  onLockChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number
  layer: StudioPatternLayer
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (partial: Partial<StudioPatternLayer>) => void
  onLockChange: (locked: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const theme = useMantineTheme()
  const selectedPatternUrl = layer.source.type === 'built-in' ? layer.source.patternUrl : ''

  return (
    <Box
      p="md"
      bg="#ffffff"
      style={{
        border: `1px solid ${theme.colors.gray[3]}`,
        borderRadius: 8,
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
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
          </Group>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="subtle"
              color="dark"
              aria-label="Move Pattern Layer Up"
              disabled={layer.locked || !canMoveUp}
              onClick={onMoveUp}
            >
              <IoArrowUpOutline size={18} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="dark"
              aria-label="Move Pattern Layer Down"
              disabled={layer.locked || !canMoveDown}
              onClick={onMoveDown}
            >
              <IoArrowDownOutline size={18} />
            </ActionIcon>
            <Switch
              label="Lock"
              checked={layer.locked}
              onChange={(event) => onLockChange(event.currentTarget.checked)}
              color="dark"
            />
            <ActionIcon
              variant="subtle"
              color="dark"
              aria-label="Remove Pattern Layer"
              disabled={layer.locked}
              onClick={onRemove}
            >
              <IoTrashOutline size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Select
          label="Target"
          data={targetOptions}
          value={layer.target}
          disabled={layer.locked}
          onChange={(target) => {
            if (isPatternLayerTarget(target)) {
              onChange({ target })
            }
          }}
        />

        <Select
          label="Blend"
          data={blendModeOptions}
          value={layer.blendMode}
          disabled={layer.locked}
          onChange={(blendMode) => {
            if (isLayerBlendModeOption(blendMode)) {
              onChange({ blendMode })
            }
          }}
        />

        <div>
          <PanelLabel display="flex" style={{ justifyContent: 'space-between' }}>
            <span>Intensity</span>
            <Text span fz={13} c="dimmed">
              {Math.round(layer.intensity * 100)}%
            </Text>
          </PanelLabel>
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

        <div>
          <PanelLabel mb={8}>Built-in pattern</PanelLabel>
          <Group gap={8}>
            {builtInPatternAssets.slice(0, 12).map((asset) => {
              const isActive = selectedPatternUrl === asset.url

              return (
                <Box
                  key={asset.url}
                  component="button"
                  type="button"
                  disabled={layer.locked}
                  onClick={() =>
                    onChange({
                      source: {
                        type: 'built-in',
                        patternUrl: asset.url,
                      },
                    })
                  }
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    border: `2px solid ${isActive ? theme.colors.dark[9] : theme.colors.gray[3]}`,
                    borderRadius: 6,
                    overflow: 'hidden',
                    cursor: layer.locked ? 'not-allowed' : 'pointer',
                    background: theme.white,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt=""
                    width="100%"
                    height="100%"
                    style={{ objectFit: 'cover', filter: 'saturate(0)' }}
                  />
                </Box>
              )
            })}
          </Group>
        </div>
      </Stack>
    </Box>
  )
}

function isPatternLayerTarget(value: string | null): value is StudioPatternLayerTarget {
  return value === 'foreground-shader' || value === 'background-shader' || value === 'morph-stack'
}

function isLayerBlendModeOption(value: string | null): value is LayerBlendMode {
  return LAYER_BLEND_MODES.includes(value as LayerBlendMode)
}
