'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { ActionIcon, Box, Button, Portal } from '@mantine/core'
import { IoCloseOutline } from 'react-icons/io5'
import ColorPicker from 'react-best-gradient-color-picker'
import {
  createColorCss,
  createGradientCss,
  DEFAULT_GRADIENT_SETTINGS,
  normalizeGradientStops,
  parseGradientCssSettings,
  parseCssColorOpacity,
  parseCssColorToHex,
  parseGradientCssStops,
  readGradientAngle,
  readGradientStopOpacity,
  readGradientType,
  readStopInsertionPosition,
  type GradientColorStop,
  type GradientSettings,
  type GradientType,
} from '@/components/studio/gradient-stops'

export {
  createGradientCss,
  createColorCss,
  DEFAULT_GRADIENT_SETTINGS,
  normalizeGradientStops,
  parseGradientCssSettings,
  parseCssColorOpacity,
  parseCssColorToHex,
  parseGradientCssStops,
  readGradientAngle,
  readGradientStopOpacity,
  readGradientType,
  readStopInsertionPosition,
}
export type { GradientColorStop, GradientSettings, GradientType }

const pickerPanelWidth = 292
const pickerPanelHeight = 562
const pickerPanelMargin = 12

type PickerPosition = {
  left: number
  top: number
}

type PickerDragState = {
  pointerId: number
  offsetX: number
  offsetY: number
}

type GradientColorPickerProps = {
  color: string
  opacity?: number
  gradientType?: GradientType
  gradientAngle?: number
  gradientStops: GradientColorStop[]
  allowGradient: boolean
  isGradient: boolean
  onColorChange: (color: string) => void
  onOpacityChange?: (opacity: number) => void
  onGradientSettingsChange?: (settings: GradientSettings) => void
  onGradientStopsChange: (stops: GradientColorStop[]) => void
  onModeChange?: (mode: 'solid' | 'gradient') => void
}

export default function GradientColorPicker({
  color,
  opacity = 1,
  gradientType = DEFAULT_GRADIENT_SETTINGS.gradientType,
  gradientAngle = DEFAULT_GRADIENT_SETTINGS.gradientAngle,
  gradientStops,
  allowGradient,
  isGradient,
  onColorChange,
  onOpacityChange,
  onGradientSettingsChange,
  onGradientStopsChange,
  onModeChange,
}: GradientColorPickerProps) {
  const externalPickerValue = useMemo(
    () =>
      isGradient
        ? createGradientCss(color, normalizeGradientStops(gradientStops), {
            gradientType,
            gradientAngle,
          })
        : createColorCss(color, opacity),
    [color, gradientAngle, gradientStops, gradientType, isGradient, opacity]
  )
  const [pickerValue, setPickerValue] = useState(externalPickerValue)
  const [opened, setOpened] = useState(false)
  const [pickerPosition, setPickerPosition] = useState<PickerPosition | null>(null)
  const pickerPanelRef = useRef<HTMLDivElement | null>(null)
  const previousExternalPickerValueRef = useRef(externalPickerValue)
  const commitTimerRef = useRef<number | null>(null)
  const dragStateRef = useRef<PickerDragState | null>(null)
  const latestPropsRef = useRef({
    allowGradient,
    color,
    gradientAngle,
    gradientStops,
    gradientType,
    isGradient,
    opacity,
    onColorChange,
    onGradientSettingsChange,
    onOpacityChange,
    onGradientStopsChange,
    onModeChange,
  })

  useEffect(() => {
    latestPropsRef.current = {
      allowGradient,
      color,
      gradientAngle,
      gradientStops,
      gradientType,
      isGradient,
      opacity,
      onColorChange,
      onGradientSettingsChange,
      onOpacityChange,
      onGradientStopsChange,
      onModeChange,
    }
  })

  useEffect(() => {
    if (opened) {
      return
    }

    if (previousExternalPickerValueRef.current === externalPickerValue) {
      return
    }

    previousExternalPickerValueRef.current = externalPickerValue
    setPickerValue(externalPickerValue)
  }, [externalPickerValue, opened])

  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current)
      }
    }
  }, [])

  const commitPickerValue = useCallback((nextValue: string) => {
    const {
      allowGradient,
      color,
      gradientAngle,
      gradientStops,
      gradientType,
      isGradient,
      opacity,
      onColorChange,
      onGradientSettingsChange,
      onOpacityChange,
      onGradientStopsChange,
      onModeChange,
    } = latestPropsRef.current

    if (allowGradient && nextValue.includes('gradient(')) {
      if (!isGradient) {
        onModeChange?.('gradient')
      }

      const nextGradientStops = parseGradientCssStops(nextValue)
      const parsedGradientSettings = parseGradientCssSettings(nextValue)
      const nextGradientSettings = {
        ...parsedGradientSettings,
        gradientAngle:
          parsedGradientSettings.gradientType === 'radial' ? gradientAngle : parsedGradientSettings.gradientAngle,
      }

      if (!areGradientStopsEqual(nextGradientStops, gradientStops)) {
        onGradientStopsChange(nextGradientStops)
      }

      if (
        nextGradientSettings.gradientType !== gradientType ||
        Math.abs(nextGradientSettings.gradientAngle - gradientAngle) > 0.001
      ) {
        onGradientSettingsChange?.(nextGradientSettings)
      }

      return
    }

    if (isGradient) {
      onModeChange?.('solid')
    }

    const nextColor = parseCssColorToHex(nextValue, color)

    if (nextColor !== color) {
      onColorChange(nextColor)
    }

    const nextOpacity = parseCssColorOpacity(nextValue, opacity)

    if (Math.abs(nextOpacity - opacity) > 0.001) {
      onOpacityChange?.(nextOpacity)
    }
  }, [])

  const schedulePickerCommit = useCallback(
    (nextValue: string) => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current)
      }

      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null
        commitPickerValue(nextValue)
      }, 80)
    },
    [commitPickerValue]
  )

  const handlePickerChange = useCallback(
    (nextValue: string) => {
      setPickerValue((currentValue) => (currentValue === nextValue ? currentValue : nextValue))
      schedulePickerCommit(nextValue)
    },
    [schedulePickerCommit]
  )

  const closePicker = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }

    commitPickerValue(pickerValue)
    setOpened(false)
  }, [commitPickerValue, pickerValue])

  useEffect(() => {
    if (!opened) {
      return
    }

    function handleWindowPointerDown(event: globalThis.PointerEvent) {
      const target = event.target

      if (target instanceof Node && pickerPanelRef.current?.contains(target)) {
        return
      }

      closePicker()
    }

    window.addEventListener('pointerdown', handleWindowPointerDown, true)

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown, true)
    }
  }, [closePicker, opened])

  const openPicker = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      setPickerValue(externalPickerValue)
      setPickerPosition(readInitialPickerPosition(event.currentTarget))
      setOpened(true)
    },
    [externalPickerValue]
  )

  const handlePanelPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    event.preventDefault()

    const bounds = event.currentTarget.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePanelPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()
    setPickerPosition(
      clampPickerPosition(
        event.clientX - dragState.offsetX,
        event.clientY - dragState.offsetY,
        bounds.width,
        bounds.height
      )
    )
  }, [])

  const stopPanelDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    dragStateRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }, [])

  return (
    <>
      <Button
        type="button"
        aria-label="Edit color"
        variant="default"
        fullWidth
        h={36}
        onClick={openPicker}
        styles={{
          root: {
            background: pickerValue,
            borderColor: '#CED4DA',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
          },
          label: {
            color: 'transparent',
          },
        }}
      >
        Edit color
      </Button>

      {opened ? (
        <Portal>
          <Box
            ref={pickerPanelRef}
            role="dialog"
            aria-label="Color picker"
            onPointerDown={handlePanelPointerDown}
            onPointerMove={handlePanelPointerMove}
            onPointerUp={stopPanelDrag}
            onPointerCancel={stopPanelDrag}
            style={{
              position: 'fixed',
              left: pickerPosition?.left ?? '50%',
              top: pickerPosition?.top ?? '50%',
              zIndex: 1000,
              display: 'flex',
              justifyContent: 'center',
              background: '#191919',
              borderRadius: 16,
              padding: 16,
              cursor: 'grab',
              touchAction: 'none',
              transform: pickerPosition ? undefined : 'translate(-50%, -50%)',
            }}
          >
            <ActionIcon
              aria-label="Close color picker"
              variant="filled"
              color="dark"
              radius="xl"
              size={24}
              onClick={closePicker}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
              }}
            >
              <IoCloseOutline size={18} />
            </ActionIcon>

            <ColorPicker
              value={pickerValue}
              onChange={handlePickerChange}
              hideControls={!allowGradient}
              hideGradientType={!allowGradient}
              hideGradientAngle={!allowGradient}
              hideOpacity={false}
              hidePresets
              hideEyeDrop
              hideColorGuide
              hideAdvancedSliders
              width={260}
            />
          </Box>
        </Portal>
      ) : null}
    </>
  )
}

function readInitialPickerPosition(button: HTMLButtonElement): PickerPosition {
  if (typeof window === 'undefined') {
    return { left: pickerPanelMargin, top: pickerPanelMargin }
  }

  const bounds = button.getBoundingClientRect()
  const canOpenRight = bounds.right + pickerPanelMargin + pickerPanelWidth <= window.innerWidth
  const left = canOpenRight ? bounds.right + pickerPanelMargin : bounds.left - pickerPanelWidth - pickerPanelMargin
  const top = bounds.top - 24

  return clampPickerPosition(left, top, pickerPanelWidth, pickerPanelHeight)
}

function clampPickerPosition(left: number, top: number, width: number, height: number): PickerPosition {
  if (typeof window === 'undefined') {
    return { left, top }
  }

  return {
    left: clamp(left, pickerPanelMargin, window.innerWidth - width - pickerPanelMargin),
    top: clamp(top, pickerPanelMargin, window.innerHeight - height - pickerPanelMargin),
  }
}

function clamp(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.max(min, Math.min(max, value))
}

function areGradientStopsEqual(firstStops: GradientColorStop[], secondStops: GradientColorStop[]) {
  const normalizedFirstStops = normalizeGradientStops(firstStops)
  const normalizedSecondStops = normalizeGradientStops(secondStops)

  return (
    normalizedFirstStops.length === normalizedSecondStops.length &&
    normalizedFirstStops.every((stop, index) => {
      const otherStop = normalizedSecondStops[index]

      return (
        otherStop &&
        stop.color === otherStop.color &&
        stop.position === otherStop.position &&
        Math.abs(readGradientStopOpacity(stop) - readGradientStopOpacity(otherStop)) < 0.001
      )
    })
  )
}
