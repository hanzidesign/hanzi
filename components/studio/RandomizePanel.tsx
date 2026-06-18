'use client'

import { Button, Group, NumberInput, Select, Stack, Switch, Text } from '@mantine/core'
import { useState } from 'react'
import { IoShuffleOutline } from 'react-icons/io5'
import { useStudioStore, type StudioRandomizeFamilies } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'
import { type RandomizePresetId } from '@/components/studio/randomize-presets'

const presetOptions: Array<{ value: RandomizePresetId; label: string }> = [
  { value: 'graphite-relief', label: 'Graphite Relief' },
  { value: 'wet-ink-bloom', label: 'Wet Ink Bloom' },
  { value: 'carved-lacquer', label: 'Carved Lacquer' },
  { value: 'digital-slice', label: 'Digital Slice' },
  { value: 'oxidized-metal', label: 'Oxidized Metal' },
  { value: 'chrome-glass', label: 'Chrome Glass' },
  { value: 'watercolor-paper', label: 'Watercolor Paper' },
]

export default function RandomizePanel() {
  const randomSeed = useStudioStore((store) => store.randomSeed)
  const randomizeMorphPreset = useStudioStore((store) => store.randomizeMorphPreset)
  const [seed, setSeed] = useState(randomSeed)
  const [presetId, setPresetId] = useState<RandomizePresetId>('graphite-relief')
  const [includeExperimental, setIncludeExperimental] = useState(false)
  const [families, setFamilies] = useState<Required<StudioRandomizeFamilies>>({
    morph: true,
    shaders: true,
    patterns: true,
  })

  const updateFamily = (family: keyof Required<StudioRandomizeFamilies>, value: boolean) => {
    setFamilies((current) => ({
      ...current,
      [family]: value,
    }))
  }

  return (
    <PanelBox>
      <Stack gap="lg">
        <div>
          <Text fz={16} fw={700} c="#212529">
            Randomize
          </Text>
          <Text fz={13} c="dimmed">
            Generate a lock-aware Character Surface stack from a deterministic seed.
          </Text>
        </div>

        <NumberInput
          label="Seed"
          value={seed}
          min={0}
          step={1}
          allowDecimal={false}
          onChange={(value) => setSeed(typeof value === 'number' ? value : randomSeed)}
        />

        <Select
          label="Preset"
          data={presetOptions}
          value={presetId}
          onChange={(value) => {
            if (presetOptions.some((option) => option.value === value)) {
              setPresetId(value as RandomizePresetId)
            }
          }}
          allowDeselect={false}
        />

        <div>
          <PanelLabel>Families</PanelLabel>
          <Stack gap="xs">
            <Switch
              label="Morph"
              checked={families.morph}
              onChange={(event) => updateFamily('morph', event.currentTarget.checked)}
              color="dark"
            />
            <Switch
              label="Shaders"
              checked={families.shaders}
              onChange={(event) => updateFamily('shaders', event.currentTarget.checked)}
              color="dark"
            />
            <Switch
              label="Patterns"
              checked={families.patterns}
              onChange={(event) => updateFamily('patterns', event.currentTarget.checked)}
              color="dark"
            />
          </Stack>
        </div>

        <Switch
          label="Include Experimental"
          checked={includeExperimental}
          onChange={(event) => setIncludeExperimental(event.currentTarget.checked)}
          color="orange"
        />

        <Group justify="space-between">
          <Button
            color="dark"
            variant="light"
            onClick={() => setSeed((current) => current + 1)}
          >
            Next seed
          </Button>
          <Button
            color="dark"
            leftSection={<IoShuffleOutline size={16} />}
            disabled={!families.morph && !families.shaders && !families.patterns}
            onClick={() =>
              randomizeMorphPreset({
                seed,
                presetId,
                includeExperimental,
                families,
              })
            }
          >
            Randomize
          </Button>
        </Group>
      </Stack>
    </PanelBox>
  )
}
