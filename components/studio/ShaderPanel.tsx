'use client'

import { useMemo } from 'react'
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
  type StudioShaderLayer,
  type StudioShaderLayerTarget,
  type StudioSurfaceShaderLayer,
  type StudioSurfaceShaderLayerId,
} from '@/app/studio/studio-store'
import {
  getEffectDefinitionById,
  getVisibleShaderEffectDefinitions,
  type EffectParamDefinition,
} from '@/components/studio/effect-registry'
import GradientColorPicker, {
  DEFAULT_GRADIENT_SETTINGS,
  normalizeGradientStops,
  readGradientAngle,
  readGradientType,
  type GradientColorStop,
} from '@/components/studio/GradientColorPicker'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'
import { LAYER_BLEND_MODES, type LayerBlendMode } from '@/components/studio/layer-compositing'

const targetOptions: Array<{ value: StudioShaderLayerTarget; label: string }> = [
  { value: 'foreground-shader', label: 'Foreground' },
  { value: 'background-shader', label: 'Background' },
]

const blendModeOptions: Array<{ value: LayerBlendMode; label: string }> = LAYER_BLEND_MODES.map((mode) => ({
  value: mode,
  label: mode
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' '),
}))

export default function ShaderPanel() {
  const foregroundShader = useStudioStore((store) => store.surfaceShaders.foreground)
  const backgroundShader = useStudioStore((store) => store.surfaceShaders.background)
  const shaderLayers = useStudioStore((store) => store.shaderLayers.layers)
  const selectedShaderLayerId = useStudioStore((store) => store.shaderLayers.selectedShaderLayerId)
  const setSurfaceShaderLayer = useStudioStore((store) => store.setSurfaceShaderLayer)
  const setSurfaceShaderLayerLocked = useStudioStore((store) => store.setSurfaceShaderLayerLocked)
  const addShaderLayer = useStudioStore((store) => store.addShaderLayer)
  const updateShaderLayer = useStudioStore((store) => store.updateShaderLayer)
  const removeShaderLayer = useStudioStore((store) => store.removeShaderLayer)
  const reorderShaderLayer = useStudioStore((store) => store.reorderShaderLayer)
  const setShaderLayerLocked = useStudioStore((store) => store.setShaderLayerLocked)
  const setSelectedShaderLayer = useStudioStore((store) => store.setSelectedShaderLayer)
  const selectedLayer = shaderLayers.find((layer) => layer.id === selectedShaderLayerId) ?? shaderLayers[0] ?? null

  return (
    <PanelBox>
      <Stack gap="lg">
        <SurfaceColorRoots
          foregroundShader={foregroundShader}
          backgroundShader={backgroundShader}
          onChange={setSurfaceShaderLayer}
          onLockChange={setSurfaceShaderLayerLocked}
        />

        <Group justify="space-between" align="center">
          <div>
            <Text fz={16} fw={700} c="#212529">
              Shader Layers
            </Text>
            <Text fz={13} c="dimmed">
              Compact effect rows compile into the Character Surface shader.
            </Text>
          </div>
          <Button
            size="xs"
            color="dark"
            leftSection={<IoAddOutline size={16} />}
            onClick={() => addShaderLayer()}
          >
            Add
          </Button>
        </Group>

        <Stack gap="sm">
          {shaderLayers.map((layer, index) => (
            <ShaderLayerRow
              key={layer.id}
              index={index}
              layer={layer}
              selected={selectedLayer?.id === layer.id}
              canMoveUp={index > 0}
              canMoveDown={index < shaderLayers.length - 1}
              onSelect={() => setSelectedShaderLayer(layer.id)}
              onChange={(partial) => updateShaderLayer(layer.id, partial)}
              onLockChange={(locked) => setShaderLayerLocked(layer.id, locked)}
              onMoveUp={() => reorderShaderLayer(index, index - 1)}
              onMoveDown={() => reorderShaderLayer(index, index + 1)}
              onRemove={() => removeShaderLayer(layer.id)}
            />
          ))}
        </Stack>

        <ShaderLayerDetailSurface
          layer={selectedLayer}
          onChange={(partial) => {
            if (selectedLayer) {
              updateShaderLayer(selectedLayer.id, partial)
            }
          }}
        />
      </Stack>
    </PanelBox>
  )
}

function SurfaceColorRoots({
  foregroundShader,
  backgroundShader,
  onChange,
  onLockChange,
}: {
  foregroundShader: StudioSurfaceShaderLayer
  backgroundShader: StudioSurfaceShaderLayer
  onChange: (layerId: StudioSurfaceShaderLayerId, partial: Partial<StudioSurfaceShaderLayer>) => void
  onLockChange: (layerId: StudioSurfaceShaderLayerId, locked: boolean) => void
}) {
  return (
    <Stack gap="md">
      <SurfaceShaderLayerControls
        layerId="foreground"
        title="Foreground Color Root"
        layer={foregroundShader}
        onChange={onChange}
        onLockChange={onLockChange}
      />
      <SurfaceShaderLayerControls
        layerId="background"
        title="Background Color Root"
        layer={backgroundShader}
        onChange={onChange}
        onLockChange={onLockChange}
      />
    </Stack>
  )
}

function ShaderLayerRow({
  index,
  layer,
  selected,
  canMoveUp,
  canMoveDown,
  onSelect,
  onChange,
  onLockChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number
  layer: StudioShaderLayer
  selected: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onSelect: () => void
  onChange: (partial: Partial<StudioShaderLayer>) => void
  onLockChange: (locked: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const theme = useMantineTheme()
  const effect = getEffectDefinitionById(layer.effectId)

  return (
    <Box
      component="div"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      p="sm"
      bg="#ffffff"
      style={{
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${selected ? theme.colors.dark[8] : theme.colors.gray[3]}`,
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <Badge color="gray" variant="light">
            {String(index + 1).padStart(2, '0')}
          </Badge>
          <Switch
            label="Enabled"
            checked={layer.enabled}
            disabled={layer.locked}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onChange({ enabled: event.currentTarget.checked })}
            color="dark"
          />
          <div>
            <Text fz={13} fw={700} c="#212529">
              {effect?.label ?? layer.effectId}
            </Text>
            <Text fz={12} c="dimmed">
              {layer.target === 'foreground-shader' ? 'Foreground' : 'Background'} · {Math.round(layer.intensity * 100)}%
            </Text>
          </div>
        </Group>
        <Group gap={4} wrap="nowrap" onClick={(event) => event.stopPropagation()}>
          <ActionIcon variant="subtle" color="dark" aria-label="Move Shader Layer Up" disabled={layer.locked || !canMoveUp} onClick={onMoveUp}>
            <IoArrowUpOutline size={17} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="dark" aria-label="Move Shader Layer Down" disabled={layer.locked || !canMoveDown} onClick={onMoveDown}>
            <IoArrowDownOutline size={17} />
          </ActionIcon>
          <Switch
            label="Lock"
            checked={layer.locked}
            onChange={(event) => onLockChange(event.currentTarget.checked)}
            color="dark"
          />
          <ActionIcon variant="subtle" color="dark" aria-label="Remove Shader Layer" disabled={layer.locked} onClick={onRemove}>
            <IoTrashOutline size={17} />
          </ActionIcon>
        </Group>
      </Group>
    </Box>
  )
}

function ShaderLayerDetailSurface({
  layer,
  onChange,
}: {
  layer: StudioShaderLayer | null
  onChange: (partial: Partial<StudioShaderLayer>) => void
}) {
  const effectOptions = useMemo(
    () =>
      getVisibleShaderEffectDefinitions().map((effect) => ({
        value: effect.id,
        label: effect.label,
      })),
    [],
  )
  const effect = layer ? getEffectDefinitionById(layer.effectId) : null

  if (!layer || !effect) {
    return (
      <Box p="md" bg="#ffffff" style={{ border: '1px dashed #ced4da', borderRadius: 8 }}>
        <Text fz={13} c="dimmed">
          Select a Shader Layer to edit its effect parameters.
        </Text>
      </Box>
    )
  }

  return (
    <Box p="md" bg="#ffffff" style={{ border: '1px solid #dee2e6', borderRadius: 8 }}>
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fz={15} fw={700} c="#212529">
              Effect
            </Text>
            <Text fz={12} c="dimmed">
              Detail surface for selected compact row.
            </Text>
          </div>
          <Badge color={effect.tier === 'experimental' ? 'orange' : 'gray'} variant="light">
            {effect.tier}
          </Badge>
        </Group>

        <Select
          label="Effect"
          data={effectOptions}
          value={layer.effectId}
          disabled={layer.locked}
          onChange={(effectId) => {
            if (effectId) {
              onChange({ effectId })
            }
          }}
          allowDeselect={false}
        />

        <Select
          label="Target"
          data={targetOptions}
          value={layer.target}
          disabled={layer.locked}
          onChange={(target) => {
            if (target === 'foreground-shader' || target === 'background-shader') {
              onChange({ target })
            }
          }}
          allowDeselect={false}
        />

        <Select
          label="Blend"
          data={blendModeOptions}
          value={layer.blendMode}
          disabled={layer.locked}
          onChange={(blendMode) => {
            if (LAYER_BLEND_MODES.includes(blendMode as LayerBlendMode)) {
              onChange({ blendMode: blendMode as LayerBlendMode })
            }
          }}
          allowDeselect={false}
        />

        <ShaderEffectSlider
          label="Intensity"
          value={layer.intensity}
          disabled={layer.locked}
          onChange={(intensity) => onChange({ intensity })}
        />

        {effect.params.map((param) => (
          <EffectParamControl
            key={param.id}
            param={param}
            layer={layer}
            onChange={(value) =>
              onChange({
                params: {
                  ...layer.params,
                  [param.id]: value,
                },
              })
            }
          />
        ))}
      </Stack>
    </Box>
  )
}

function EffectParamControl({
  param,
  layer,
  onChange,
}: {
  param: EffectParamDefinition
  layer: StudioShaderLayer
  onChange: (value: string | number | boolean) => void
}) {
  const value = layer.params[param.id]

  if (param.type === 'number') {
    const numberValue = typeof value === 'number' ? value : param.min

    return (
      <ShaderEffectSlider
        label={param.label}
        value={numberValue}
        min={param.min}
        max={param.max}
        step={param.step}
        disabled={layer.locked}
        onChange={onChange}
      />
    )
  }

  if (param.type === 'boolean') {
    return (
      <Switch
        label={param.label}
        checked={value === true}
        disabled={layer.locked}
        onChange={(event) => onChange(event.currentTarget.checked)}
        color="dark"
      />
    )
  }

  return (
    <Select
      label={param.label}
      data={param.options.map((option) => ({ value: option.id, label: option.label }))}
      value={typeof value === 'string' ? value : param.options[0]?.id}
      disabled={layer.locked}
      onChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue)
        }
      }}
      allowDeselect={false}
    />
  )
}

function SurfaceShaderLayerControls({
  layerId,
  title,
  layer,
  onChange,
  onLockChange,
}: {
  layerId: StudioSurfaceShaderLayerId
  title: string
  layer: StudioSurfaceShaderLayer
  onChange: (layerId: StudioSurfaceShaderLayerId, partial: Partial<StudioSurfaceShaderLayer>) => void
  onLockChange: (layerId: StudioSurfaceShaderLayerId, locked: boolean) => void
}) {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text fz={15} fw={700} c="#212529">
          {title}
        </Text>
        <Switch
          label="Lock"
          checked={layer.locked}
          onChange={(event) => onLockChange(layerId, event.currentTarget.checked)}
          color="dark"
        />
      </Group>

      <div>
        <PanelLabel>Color</PanelLabel>
        <GradientColorPicker
          color={layer.color}
          opacity={readOpacity(layer)}
          gradientType={readLayerGradientType(layer)}
          gradientAngle={readLayerGradientAngle(layer)}
          gradientStops={readGradientStops(layer)}
          allowGradient={layerId === 'foreground'}
          isGradient={layer.stylePresetId === 'gradient'}
          onColorChange={(color) => onChange(layerId, { color })}
          onOpacityChange={(opacity) => {
            onChange(layerId, {
              params: {
                ...layer.params,
                opacity,
              },
            })
          }}
          onGradientSettingsChange={(settings) => {
            onChange(layerId, {
              stylePresetId: 'gradient',
              params: {
                ...layer.params,
                gradientType: settings.gradientType,
                gradientAngle: settings.gradientAngle,
              },
            })
          }}
          onGradientStopsChange={(gradientStops) => {
            onChange(layerId, {
              stylePresetId: 'gradient',
              params: {
                ...layer.params,
                gradientStops,
              },
            })
          }}
          onModeChange={(mode) => {
            onChange(layerId, {
              stylePresetId: mode,
            })
          }}
        />
      </div>

      {layerId === 'foreground' ? (
        <Stack gap="sm">
          <ShaderEffectSlider
            label="Depth Strength"
            value={readShaderParam(layer, 'depthStrength', 0.72)}
            onChange={(value) => updateShaderParam(layerId, layer, onChange, 'depthStrength', value)}
          />
          <ShaderEffectSlider
            label="Highlight"
            value={readShaderParam(layer, 'highlightStrength', 0.42)}
            onChange={(value) => updateShaderParam(layerId, layer, onChange, 'highlightStrength', value)}
          />
          <ShaderEffectSlider
            label="Rim Light"
            value={readShaderParam(layer, 'rimStrength', 0.32)}
            onChange={(value) => updateShaderParam(layerId, layer, onChange, 'rimStrength', value)}
          />
          <ShaderEffectSlider
            label="Edge Softness"
            value={readShaderParam(layer, 'edgeSoftness', 0.08)}
            onChange={(value) => updateShaderParam(layerId, layer, onChange, 'edgeSoftness', value)}
          />
        </Stack>
      ) : null}
    </Stack>
  )
}

function ShaderEffectSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  disabled = false,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  const percentValue = max <= 2 && min >= 0 ? `${Math.round((value / max) * 100)}%` : String(Math.round(value * 100) / 100)

  return (
    <div>
      <Group justify="space-between" mb={4}>
        <PanelLabel m={0}>{label}</PanelLabel>
        <Text fz={12} c="#495057">
          {percentValue}
        </Text>
      </Group>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={onChange}
        color="dark"
      />
    </div>
  )
}

function updateShaderParam(
  layerId: StudioSurfaceShaderLayerId,
  layer: StudioSurfaceShaderLayer,
  onChange: (layerId: StudioSurfaceShaderLayerId, partial: Partial<StudioSurfaceShaderLayer>) => void,
  paramId: string,
  value: number
) {
  onChange(layerId, {
    params: {
      ...layer.params,
      [paramId]: value,
    },
  })
}

function readGradientStops(layer: StudioSurfaceShaderLayer): GradientColorStop[] {
  return normalizeGradientStops(layer.params.gradientStops)
}

function readOpacity(layer: StudioSurfaceShaderLayer) {
  return typeof layer.params.opacity === 'number' ? layer.params.opacity : 1
}

function readShaderParam(layer: StudioSurfaceShaderLayer, paramId: string, fallback: number) {
  const value = layer.params[paramId]

  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback
}

function readLayerGradientType(layer: StudioSurfaceShaderLayer) {
  return readGradientType(layer.params.gradientType, DEFAULT_GRADIENT_SETTINGS.gradientType)
}

function readLayerGradientAngle(layer: StudioSurfaceShaderLayer) {
  return readGradientAngle(layer.params.gradientAngle, DEFAULT_GRADIENT_SETTINGS.gradientAngle)
}
