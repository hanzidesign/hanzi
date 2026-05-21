'use client'

import { useEffect, useRef, useState } from 'react'
import { AspectRatio, Button, Center, FileInput, Group, SimpleGrid, Slider, Text, Tooltip, useMantineTheme } from '@mantine/core'
import { IoMdImage } from 'react-icons/io'
import { useStudio } from '@/app/studio/studio-context'
import useFileReader from '@/hooks/useFileReader'
import { PanelBox, PanelLabel } from '@/components/studio/PanelPrimitives'

export default function EffectPanel() {
  const {
    state: { seed, ptnUrl, ptnData, distortion, blur, width, x, y, rotation },
    setPatternSeed,
    setPatternData,
    setDistortion,
    setBlur,
    setWidth,
    setPosition,
    setRotation,
    resetEffect,
  } = useStudio()
  const theme = useMantineTheme()
  const [file, setFile] = useState<File | null>(null)
  const fileResult = useFileReader(file)
  const fileRef = useRef<HTMLButtonElement>(null)
  const patternPreview = ptnData || ptnUrl

  useEffect(() => {
    if (fileResult) {
      setPatternData(fileResult)
    }
  }, [fileResult, setPatternData])

  return (
    <PanelBox>
      <SimpleGrid cols={1} spacing="xl">
        <div>
          <PanelLabel span mb={8} pos="relative" display="block">
            Pattern
          </PanelLabel>

          <FileInput
            ref={fileRef}
            value={file}
            onChange={(value) => {
              if (value && value.size <= 2097152) {
                setFile(value)
              }
            }}
            accept="image/*"
            styles={{
              input: {
                position: 'fixed',
                visibility: 'hidden',
              },
            }}
          />

          <Tooltip label="Click to use a local pattern image under 2MB" withArrow>
            <AspectRatio
              ratio={1}
              onClick={() => {
                fileRef.current?.click()
              }}
            >
              <Center
                style={{
                  overflow: 'hidden',
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.gray[4]}`,
                  cursor: 'pointer',
                }}
                bg={theme.white}
              >
                {patternPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={patternPreview}
                    width="100%"
                    height="100%"
                    alt=""
                    style={{
                      objectFit: 'cover',
                      filter: 'saturate(0)',
                    }}
                  />
                ) : (
                  <Group gap="xs">
                    <IoMdImage size={24} />
                    <Text size="sm">Pick an image under 2MB</Text>
                  </Group>
                )}
              </Center>
            </AspectRatio>
          </Tooltip>
        </div>
        <div>
          <PanelLabel>Pattern Seed</PanelLabel>
          <Slider min={0} max={96} color="dark" value={seed} onChange={setPatternSeed} />
        </div>
        <div>
          <PanelLabel>Distortion</PanelLabel>
          <Slider
            min={-100}
            max={100}
            marks={[{ value: -50 }, { value: 0 }, { value: 50 }]}
            color="dark"
            value={distortion}
            onChange={setDistortion}
          />
        </div>
        <div>
          <PanelLabel>Smooth</PanelLabel>
          <Slider min={0} max={10} marks={[{ value: 5 }]} color="dark" value={blur} onChange={setBlur} />
        </div>
        <div>
          <PanelLabel>Stroke</PanelLabel>
          <Slider
            min={-20}
            max={20}
            marks={[{ value: -10 }, { value: 0 }, { value: 10 }]}
            color="dark"
            value={width}
            onChange={setWidth}
          />
        </div>
        <div>
          <PanelLabel>Position</PanelLabel>

          <Slider
            label="x"
            min={-600}
            max={600}
            marks={[{ value: -300 }, { value: 0 }, { value: 300 }]}
            color="dark"
            value={x}
            onChange={(nextX) => setPosition({ x: nextX })}
            mt={8}
          />
          <Slider
            label="y"
            min={-600}
            max={600}
            marks={[{ value: -300 }, { value: 0 }, { value: 300 }]}
            color="dark"
            value={y}
            onChange={(nextY) => setPosition({ y: nextY })}
            mt={8}
          />
        </div>
        <div>
          <PanelLabel>Rotation</PanelLabel>
          <Slider
            min={0}
            max={360}
            marks={[{ value: 90 }, { value: 180 }, { value: 270 }]}
            color="dark"
            value={rotation}
            onChange={setRotation}
          />
        </div>

        <Group align="right" py={24}>
          <Button size="xs" onClick={resetEffect}>
            Reset
          </Button>
        </Group>
      </SimpleGrid>
    </PanelBox>
  )
}
