'use client'

import { Group, Stack, Switch, Text } from '@mantine/core'
import {
  useStudioStore,
  type StudioSurfaceShaderLayer,
  type StudioSurfaceShaderLayerId,
} from '@/app/studio/studio-store'
import GradientColorPicker, {
  DEFAULT_GRADIENT_SETTINGS,
  normalizeGradientStops,
  readGradientAngle,
  readGradientType,
  type GradientColorStop,
} from '@/components/studio/GradientColorPicker'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

export default function ShaderPanel() {
  const foregroundShader = useStudioStore((store) => store.surfaceShaders.foreground)
  const backgroundShader = useStudioStore((store) => store.surfaceShaders.background)
  const setSurfaceShaderLayer = useStudioStore((store) => store.setSurfaceShaderLayer)
  const setSurfaceShaderLayerLocked = useStudioStore((store) => store.setSurfaceShaderLayerLocked)

  return (
    <PanelBox>
      <Stack gap="xl">
        <SurfaceShaderLayerControls
          layerId="foreground"
          title="Foreground"
          layer={foregroundShader}
          onChange={setSurfaceShaderLayer}
          onLockChange={setSurfaceShaderLayerLocked}
        />
        <SurfaceShaderLayerControls
          layerId="background"
          title="Background"
          layer={backgroundShader}
          onChange={setSurfaceShaderLayer}
          onLockChange={setSurfaceShaderLayerLocked}
        />
      </Stack>
    </PanelBox>
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
        <Text fz={16} fw={700} c="#212529">
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
    </Stack>
  )
}

function readGradientStops(layer: StudioSurfaceShaderLayer): GradientColorStop[] {
  return normalizeGradientStops(layer.params.gradientStops)
}

function readOpacity(layer: StudioSurfaceShaderLayer) {
  return typeof layer.params.opacity === 'number' ? layer.params.opacity : 1
}

function readLayerGradientType(layer: StudioSurfaceShaderLayer) {
  return readGradientType(layer.params.gradientType, DEFAULT_GRADIENT_SETTINGS.gradientType)
}

function readLayerGradientAngle(layer: StudioSurfaceShaderLayer) {
  return readGradientAngle(layer.params.gradientAngle, DEFAULT_GRADIENT_SETTINGS.gradientAngle)
}
