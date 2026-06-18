'use client'

import { Group, Slider, Stack, Switch, Text } from '@mantine/core'
import { useStudioStore } from '@/app/studio/studio-store'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

export default function AnimationPanel() {
  const animation = useStudioStore((store) => store.animation)
  const setAnimationControl = useStudioStore((store) => store.setAnimationControl)

  return (
    <PanelBox>
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Text fz={16} fw={700} c="#212529">
              Animation
            </Text>
            <Text fz={13} c="dimmed">
              Speed 0 freezes every time-driven effect.
            </Text>
          </div>
          <Switch
            label="Play"
            checked={animation.playing}
            onChange={(event) => setAnimationControl({ playing: event.currentTarget.checked })}
            color="dark"
          />
        </Group>

        <AnimationSlider
          label="Speed"
          value={animation.speed}
          min={0}
          max={4}
          step={0.01}
          onChange={(speed) => setAnimationControl({ speed })}
        />
        <AnimationSlider
          label="Time Offset"
          value={animation.timeOffset}
          min={0}
          max={60}
          step={0.1}
          onChange={(timeOffset) => setAnimationControl({ timeOffset })}
        />

        <Stack gap="sm">
          <Switch
            label="Animate Morph"
            checked={animation.animateMorph}
            onChange={(event) => setAnimationControl({ animateMorph: event.currentTarget.checked })}
            color="dark"
          />
          <Switch
            label="Animate Shaders"
            checked={animation.animateShaders}
            onChange={(event) => setAnimationControl({ animateShaders: event.currentTarget.checked })}
            color="dark"
          />
          <Switch
            label="Animate Patterns"
            checked={animation.animatePatterns}
            onChange={(event) => setAnimationControl({ animatePatterns: event.currentTarget.checked })}
            color="dark"
          />
          <Switch
            label="Animate Post"
            checked={animation.animatePost}
            onChange={(event) => setAnimationControl({ animatePost: event.currentTarget.checked })}
            color="dark"
          />
        </Stack>
      </Stack>
    </PanelBox>
  )
}

function AnimationSlider({
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
