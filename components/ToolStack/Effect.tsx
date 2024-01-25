'use client'

import _ from 'lodash'
import numeral from 'numeral'
import { useAppDispatch, useAppSelector } from '@/store'
import { useState, useEffect, useRef } from 'react'
import { SimpleGrid, AspectRatio, Group } from '@mantine/core'
import { Center, Text, Tooltip, Button } from '@mantine/core'
import { Slider, FileInput, useMantineTheme } from '@mantine/core'
import { StyledBox, StyledText } from './common'
import useFileReader from '@/hooks/useFileReader'
import { setPtnUrl, setPtnData, setDistortion, setBlur, setSeed } from '@/store/slices/editor'
import { setWidth, setPosition, setRotation, reset } from '@/store/slices/editor'
import { IoMdImage } from 'react-icons/io'

export default function Effect() {
  const dispatch = useAppDispatch()
  const { seed, ptnUrl, ptnData, distortion, blur, width, x, y, rotation } = useAppSelector((state) => state.editor)
  const theme = useMantineTheme()

  const [file, setFile] = useState<File | null>(null)
  const fileResult = useFileReader(file)
  const fileRef = useRef<HTMLButtonElement>(null)
  const hasImg = Boolean(ptnUrl) || Boolean(ptnData)

  useEffect(() => {
    if (fileResult) {
      dispatch(setPtnData(fileResult))
      dispatch(setPtnUrl(null))
    }
  }, [fileResult])

  return (
    <StyledBox>
      <SimpleGrid cols={1} spacing="xl">
        <div>
          <StyledText span mb={8} pos="relative" display="block">
            Pattern
          </StyledText>

          <FileInput
            ref={fileRef}
            value={file}
            onChange={(v) => {
              if (v && v.size > 2097152) {
                dispatch(setPtnUrl(null))
              } else {
                setFile(v)
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

          <Tooltip label="Click to upload an image under 2MB" withArrow>
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
                  ':hover': {
                    cursor: 'pointer',
                  },
                }}
                bg={theme.white}
              >
                {hasImg ? (
                  <img
                    src={ptnUrl || ptnData}
                    width="100%"
                    height="100%"
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
          <StyledText>Pattern Seed</StyledText>
          <Slider
            defaultValue={0}
            min={0}
            max={96}
            color="dark"
            value={seed}
            onChange={(n) => {
              dispatch(setSeed(n))
              dispatch(setPtnUrl(toPtnUrl(n)))
            }}
          />
        </div>
        <div>
          <StyledText>Distortion</StyledText>
          <Slider
            defaultValue={0}
            min={-100}
            max={100}
            marks={[{ value: -50 }, { value: 0 }, { value: 50 }]}
            color="dark"
            value={distortion}
            onChange={(n) => dispatch(setDistortion(n))}
          />
        </div>
        <div>
          <StyledText>Smooth</StyledText>
          <Slider
            defaultValue={0}
            min={0}
            max={10}
            marks={[{ value: 5 }]}
            color="dark"
            value={blur}
            onChange={(n) => dispatch(setBlur(n))}
          />
        </div>
        <div>
          <StyledText>Stroke</StyledText>
          <Slider
            defaultValue={0}
            min={-20}
            max={20}
            marks={[{ value: -10 }, { value: 0 }, { value: 10 }]}
            color="dark"
            value={width}
            onChange={(n) => dispatch(setWidth(n))}
          />
        </div>
        <div>
          <StyledText>Position</StyledText>

          <>
            <Slider
              label="x"
              defaultValue={0}
              min={-600}
              max={600}
              marks={[{ value: -300 }, { value: 0 }, { value: 300 }]}
              color="dark"
              value={x}
              onChange={(x) => dispatch(setPosition({ x: x as number }))}
              mt={8}
            />
            <Slider
              label="y"
              defaultValue={0}
              min={-600}
              max={600}
              marks={[{ value: -300 }, { value: 0 }, { value: 300 }]}
              color="dark"
              value={y}
              onChange={(y) => dispatch(setPosition({ y: y as number }))}
              mt={8}
            />
          </>
        </div>
        <div>
          <StyledText>Rotation</StyledText>
          <Slider
            defaultValue={0}
            min={0}
            max={360}
            marks={[{ value: 90 }, { value: 180 }, { value: 270 }]}
            color="dark"
            value={rotation}
            onChange={(n) => dispatch(setRotation(n))}
          />
        </div>

        <Group align="right" py={24}>
          <Button size="xs" onClick={() => dispatch(reset())}>
            Reset
          </Button>
        </Group>
      </SimpleGrid>
    </StyledBox>
  )
}

function toPtnUrl(n: number) {
  // /images/patterns/000.jpg
  const name = numeral(n).format('000')
  return `/images/patterns/${name}.jpg`
}
