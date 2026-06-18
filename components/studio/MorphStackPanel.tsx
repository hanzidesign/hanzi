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
  useStudioStore,
  type StudioMorphLayer,
} from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'
import {
  getMorphLayerDefinitionById,
  getMorphLayerDefinitionsByTier,
} from '@/morph/catalogue'
import { createDefaultMorphParams } from '@/morph/params'
import type { MorphParamDefinition } from '@/morph/types'

const stableMorphDefinitions = getMorphLayerDefinitionsByTier('stable')

const morphDefinitionOptions = stableMorphDefinitions.map((definition) => ({
  value: definition.id,
  label: definition.name,
}))

export default function MorphStackPanel() {
  const morphLayers = useStudioStore((store) => store.morphStack.layers)
  const addMorphLayer = useStudioStore((store) => store.addMorphLayer)
  const removeMorphLayer = useStudioStore((store) => store.removeMorphLayer)
  const reorderMorphLayer = useStudioStore((store) => store.reorderMorphLayer)
  const replaceMorphStackLayers = useStudioStore((store) => store.replaceMorphStackLayers)
  const updateMorphLayerParam = useStudioStore((store) => store.updateMorphLayerParam)
  const setMorphLayerLocked = useStudioStore((store) => store.setMorphLayerLocked)

  const updateLayer = (layerId: string, partial: Partial<StudioMorphLayer>) => {
    replaceMorphStackLayers(
      morphLayers.map((layer) => (layer.id === layerId ? { ...layer, ...partial } : layer)),
    )
  }

  const changeLayerDefinition = (layer: StudioMorphLayer, definitionId: string) => {
    const definition = getMorphLayerDefinitionById(definitionId)

    if (!definition) {
      return
    }

    updateLayer(layer.id, {
      definitionId: definition.id,
      params: createDefaultMorphParams(definition),
    })
  }

  return (
    <PanelBox>
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Text fz={16} fw={700} c="#212529">
              Morph Stack
            </Text>
            <Text fz={13} c="dimmed">
              {morphLayers.length} shader layers
            </Text>
          </div>
          <Button
            size="xs"
            color="dark"
            leftSection={<IoAddOutline size={16} />}
            onClick={() => addMorphLayer()}
          >
            Add
          </Button>
        </Group>

        <Stack gap="md">
          {morphLayers.map((layer, index) => (
            <MorphLayerRow
              key={layer.id}
              index={index}
              layer={layer}
              canMoveUp={index > 0}
              canMoveDown={index < morphLayers.length - 1}
              onChange={(partial) => updateLayer(layer.id, partial)}
              onDefinitionChange={(definitionId) => changeLayerDefinition(layer, definitionId)}
              onParamChange={(paramId, value) => updateMorphLayerParam(layer.id, paramId, value)}
              onLockChange={(locked) => setMorphLayerLocked(layer.id, locked)}
              onMoveUp={() => reorderMorphLayer(index, index - 1)}
              onMoveDown={() => reorderMorphLayer(index, index + 1)}
              onRemove={() => removeMorphLayer(layer.id)}
            />
          ))}
        </Stack>
      </Stack>
    </PanelBox>
  )
}

function MorphLayerRow({
  index,
  layer,
  canMoveUp,
  canMoveDown,
  onChange,
  onDefinitionChange,
  onParamChange,
  onLockChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number
  layer: StudioMorphLayer
  canMoveUp: boolean
  canMoveDown: boolean
  onChange: (partial: Partial<StudioMorphLayer>) => void
  onDefinitionChange: (definitionId: string) => void
  onParamChange: (paramId: string, value: string | number | boolean) => void
  onLockChange: (locked: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const theme = useMantineTheme()
  const definition = getMorphLayerDefinitionById(layer.definitionId)

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
            <Badge color={definition?.tier === 'experimental' ? 'orange' : 'gray'} variant="light">
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
              aria-label="Move Morph Layer Up"
              disabled={layer.locked || !canMoveUp}
              onClick={onMoveUp}
            >
              <IoArrowUpOutline size={18} />
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="dark"
              aria-label="Move Morph Layer Down"
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
              aria-label="Remove Morph Layer"
              disabled={layer.locked}
              onClick={onRemove}
            >
              <IoTrashOutline size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Select
          label="Layer"
          data={morphDefinitionOptions}
          value={layer.definitionId}
          disabled={layer.locked}
          onChange={(definitionId) => {
            if (definitionId) {
              onDefinitionChange(definitionId)
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

        {definition ? (
          <Stack gap="sm">
            {definition.params.map((param) => (
              <MorphParamControl
                key={param.id}
                param={param}
                value={layer.params[param.id]}
                disabled={layer.locked}
                onChange={(value) => onParamChange(param.id, value)}
              />
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Box>
  )
}

function MorphParamControl({
  param,
  value,
  disabled,
  onChange,
}: {
  param: MorphParamDefinition
  value: string | number | boolean
  disabled: boolean
  onChange: (value: string | number | boolean) => void
}) {
  if (param.type === 'select') {
    return (
      <Select
        label={param.label}
        data={param.options.map((option) => ({
          value: option.id,
          label: option.label,
        }))}
        value={typeof value === 'string' ? value : param.default}
        disabled={disabled}
        onChange={(nextValue) => {
          if (nextValue) {
            onChange(nextValue)
          }
        }}
      />
    )
  }

  if (param.type === 'boolean') {
    return (
      <Switch
        label={param.label}
        checked={typeof value === 'boolean' ? value : param.default}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        color="dark"
      />
    )
  }

  const numericValue = typeof value === 'number' ? value : param.default

  return (
    <div>
      <PanelLabel display="flex" style={{ justifyContent: 'space-between' }}>
        <span>{param.label}</span>
        <Text span fz={13} c="dimmed">
          {formatNumber(numericValue)}
          {param.unit ?? ''}
        </Text>
      </PanelLabel>
      <Slider
        min={param.min}
        max={param.max}
        step={param.step}
        value={numericValue}
        disabled={disabled}
        onChange={onChange}
        color="dark"
      />
    </div>
  )
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
