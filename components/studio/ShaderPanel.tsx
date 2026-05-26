'use client'

import { ColorInput, Select, SimpleGrid, Slider, Stack, Switch, Text } from '@mantine/core'
import { useStudioStore } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'
import { getShaderPresetById, shaderPresets } from '@/shaders/registry'
import type { ShaderParam, ShaderParamValue } from '@/shaders/types'

const presetOptions = shaderPresets.map((preset) => ({
  value: preset.id,
  label: preset.name,
}))

export default function ShaderPanel() {
  const selectedPresetId = useStudioStore((store) => store.shader.selectedPresetId)
  const currentParams = useStudioStore((store) => store.shader.currentParams)
  const setSelectedPreset = useStudioStore((store) => store.setSelectedPreset)
  const updateParam = useStudioStore((store) => store.updateParam)
  const preset = getShaderPresetById(selectedPresetId) ?? shaderPresets[0]

  return (
    <PanelBox>
      <Stack gap="xl">
        <div>
          <PanelLabel>Preset</PanelLabel>
          <Select
            data={presetOptions}
            value={preset.id}
            onChange={(value) => {
              if (value) {
                setSelectedPreset(value)
              }
            }}
            allowDeselect={false}
            color="dark"
            comboboxProps={{ withinPortal: false }}
          />
          <Text fz={13} c="dimmed" mt={6}>
            {preset.category}
          </Text>
        </div>

        <SimpleGrid cols={1} spacing="xl">
          {preset.params.map((param) => (
            <ShaderParamControl
              key={param.id}
              param={param}
              value={currentParams[param.id] ?? param.default}
              onChange={(value) => updateParam(param.id, value)}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </PanelBox>
  )
}

function ShaderParamControl({
  param,
  value,
  onChange,
}: {
  param: ShaderParam
  value: ShaderParamValue
  onChange: (value: ShaderParamValue) => void
}) {
  if (param.type === 'color') {
    return (
      <div>
        <PanelLabel>{param.label}</PanelLabel>
        <ColorInput
          value={typeof value === 'string' ? value : param.default}
          onChange={onChange}
          format="hex"
          swatchesPerRow={6}
        />
      </div>
    )
  }

  if (param.type === 'boolean') {
    return (
      <Switch
        label={param.label}
        checked={typeof value === 'boolean' ? value : param.default}
        onChange={(event) => onChange(event.currentTarget.checked)}
        color="dark"
      />
    )
  }

  if (param.type === 'select') {
    return (
      <div>
        <PanelLabel>{param.label}</PanelLabel>
        <Select
          data={param.options.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          value={typeof value === 'string' ? value : param.default}
          onChange={(nextValue) => {
            if (nextValue) {
              onChange(nextValue)
            }
          }}
          allowDeselect={false}
          comboboxProps={{ withinPortal: false }}
        />
      </div>
    )
  }

  const numberValue = typeof value === 'number' ? value : param.default

  return (
    <div>
      <PanelLabel display="flex" style={{ justifyContent: 'space-between' }}>
        <span>{param.label}</span>
        <Text span fz={13} c="dimmed">
          {formatNumber(numberValue)}
          {param.unit ?? ''}
        </Text>
      </PanelLabel>
      <Slider
        min={param.min}
        max={param.max}
        step={param.step}
        value={numberValue}
        onChange={onChange}
        color="dark"
      />
    </div>
  )
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}
