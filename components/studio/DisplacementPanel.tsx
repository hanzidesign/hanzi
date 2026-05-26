'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AspectRatio,
  Box,
  Button,
  Center,
  FileInput,
  Group,
  ScrollArea,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  useMantineTheme,
} from '@mantine/core'
import { IoMdImage } from 'react-icons/io'
import { useStudioStore, toPatternUrl } from '@/app/studio/studio-store'
import {
  getDisplacementUploadError,
  type DisplacementUploadCandidate,
} from '@/components/studio/displacement-upload'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'
import useFileReader from '@/hooks/useFileReader'
import { getShaderPresetById } from '@/shaders/registry'

const PATTERN_COUNT = 97

export default function DisplacementPanel() {
  const theme = useMantineTheme()
  const selectedPresetId = useStudioStore((store) => store.shader.selectedPresetId)
  const displacement = useStudioStore((store) => store.displacement)
  const uploadedImageData = useStudioStore(
    (store) => store.runtime.uploadedDisplacementImageData,
  )
  const setPatternSeed = useStudioStore((store) => store.setPatternSeed)
  const setDisplacementControl = useStudioStore(
    (store) => store.setDisplacementControl,
  )
  const setUploadedDisplacementImageData = useStudioStore(
    (store) => store.setUploadedDisplacementImageData,
  )
  const clearUploadedDisplacementImageData = useStudioStore(
    (store) => store.clearUploadedDisplacementImageData,
  )
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileData = useFileReader(file)
  const preset = getShaderPresetById(selectedPresetId)
  const patternUrls = useMemo(
    () => Array.from({ length: PATTERN_COUNT }, (_, index) => toPatternUrl(index)),
    [],
  )
  const previewImage = uploadedImageData || displacement.patternUrl

  useEffect(() => {
    if (fileData) {
      setUploadedDisplacementImageData(fileData)
    }
  }, [fileData, setUploadedDisplacementImageData])

  const handleUpload = (nextFile: File | null) => {
    const error = getDisplacementUploadError(
      nextFile as DisplacementUploadCandidate | null,
    )

    setUploadError(error)

    if (error) {
      setFile(null)
      return
    }

    setFile(nextFile)
  }

  return (
    <PanelBox>
      <Stack gap="xl">
        <div>
          <PanelLabel>Map</PanelLabel>
          <AspectRatio ratio={1}>
            <Center
              bg={theme.white}
              style={{
                overflow: 'hidden',
                border: `1px solid ${theme.colors.gray[4]}`,
                borderRadius: 8,
              }}
            >
              {previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewImage}
                  alt=""
                  width="100%"
                  height="100%"
                  style={{ objectFit: 'cover', filter: 'saturate(0)' }}
                />
              ) : (
                <Group gap="xs">
                  <IoMdImage size={24} />
                  <Text size="sm">No map selected</Text>
                </Group>
              )}
            </Center>
          </AspectRatio>
        </div>

        <FileInput
          label="Upload map"
          value={file}
          onChange={handleUpload}
          accept="image/png,image/jpeg,image/jpg"
          error={uploadError}
          clearable
        />

        {uploadedImageData ? (
          <Group justify="flex-end">
            <Button
              size="xs"
              color="dark"
              variant="light"
              onClick={() => {
                setFile(null)
                clearUploadedDisplacementImageData()
              }}
            >
              Use built-in map
            </Button>
          </Group>
        ) : null}

        <div>
          <PanelLabel mb={8}>Built-in maps</PanelLabel>
          <ScrollArea h={220} type="auto">
            <SimpleGrid cols={4} spacing={8}>
              {patternUrls.map((url, index) => {
                const isActive = !uploadedImageData && displacement.patternUrl === url

                return (
                  <Box
                    key={url}
                    component="button"
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setPatternSeed(index)
                    }}
                    style={{
                      padding: 0,
                      border: `2px solid ${
                        isActive ? theme.colors.dark[9] : theme.colors.gray[3]
                      }`,
                      borderRadius: 8,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      background: theme.white,
                    }}
                  >
                    <AspectRatio ratio={1}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt=""
                        width="100%"
                        height="100%"
                        style={{ objectFit: 'cover', filter: 'saturate(0)' }}
                      />
                    </AspectRatio>
                  </Box>
                )
              })}
            </SimpleGrid>
          </ScrollArea>
        </div>

        <SliderControl
          label="Strength"
          value={displacement.strength}
          min={0}
          max={0.6}
          step={0.01}
          onChange={(strength) => setDisplacementControl({ strength })}
        />
        <SliderControl
          label="Bias"
          value={displacement.bias}
          min={-1}
          max={1}
          step={0.01}
          onChange={(bias) => setDisplacementControl({ bias })}
        />

        <Text fz={13} c="dimmed">
          Image distortion: {preset?.usesDisplacementMap ? 'on' : 'off'}
        </Text>
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
      <PanelLabel display="flex" style={{ justifyContent: 'space-between' }}>
        <span>{label}</span>
        <Text span fz={13} c="dimmed">
          {value.toFixed(2)}
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
