import _ from 'lodash'
import { useAppDispatch, useAppSelector } from 'store'
import { useState, useEffect, useRef } from 'react'
import { SimpleGrid, AspectRatio, Group } from '@mantine/core'
import { Center, Text, Button, CloseButton } from '@mantine/core'
import { Slider, FileInput, NumberInput } from '@mantine/core'
import { StyledBox, StyledText } from './common'
import useFileReader from 'hooks/useFileReader'
import { setPtnUrl, setDistortion, setBlur } from 'store/slices/editor'
import { setWidth, setPosition, setRotation } from 'store/slices/editor'
import { IoCloudUploadOutline, IoDice } from 'react-icons/io5'

export default function Effect() {
  const dispatch = useAppDispatch()
  const { ptnUrl, distortion, blur, width, x, y, rotation } = useAppSelector(
    (state) => state.editor
  )

  const [file, setFile] = useState<File | null>(null)
  const fileResult = useFileReader(file)
  const fileRef = useRef<HTMLButtonElement>(null)

  const hasImg = Boolean(ptnUrl)

  useEffect(() => {
    if (fileResult) {
      dispatch(setPtnUrl(fileResult))
    }
  }, [fileResult])

  return (
    <StyledBox>
      <SimpleGrid cols={1} spacing="xl">
        <div>
          <StyledText
            span
            mb={8}
            sx={{ position: 'relative', display: 'block' }}
          >
            Pattern
            <Group className="absolute-vertical" sx={{ right: 0 }} spacing="xs">
              <Button
                variant="subtle"
                color="dark"
                size="xs"
                px={2}
                sx={{
                  '&:hover': {
                    backgroundColor: 'transparent',
                  },
                }}
                onClick={() => {
                  const url = getRandomPtnUrl()
                  dispatch(setPtnUrl(url))
                }}
              >
                <IoDice size={24} />
              </Button>
              <CloseButton
                size={24}
                title="Delete image"
                onClick={() => dispatch(setPtnUrl(''))}
                disabled={!ptnUrl}
                variant="transparent"
                sx={(theme) => ({
                  width: 30,
                  height: 30,
                  '&:hover': {
                    color: theme.colors.red[7],
                  },
                })}
              />
            </Group>
          </StyledText>

          <FileInput
            ref={fileRef}
            value={file}
            onChange={setFile}
            accept="image/*"
            styles={{
              input: {
                position: 'fixed',
                visibility: 'hidden',
              },
            }}
          />
          <AspectRatio
            ratio={1}
            onClick={() => {
              fileRef.current?.click()
            }}
          >
            <Center
              sx={(theme) => ({
                borderRadius: 8,
                border: `1px solid ${theme.colors.gray[4]}`,
                backgroundColor: theme.white,
                ':hover': {
                  cursor: 'pointer',
                },
              })}
            >
              {hasImg ? (
                <img
                  src={ptnUrl}
                  width="100%"
                  height="100%"
                  style={{
                    objectFit: 'cover',
                    filter: `saturate(0) blur(${blur}px)`,
                  }}
                />
              ) : (
                <Group spacing="xs">
                  <IoCloudUploadOutline />
                  <Text size="sm">Upload Image</Text>
                </Group>
              )}
            </Center>
          </AspectRatio>
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
          <StyledText>Blur</StyledText>
          <Slider
            defaultValue={0}
            min={0}
            max={50}
            marks={[{ value: 25 }]}
            color="dark"
            value={blur}
            onChange={(n) => dispatch(setBlur(n))}
          />
        </div>
        <div>
          <StyledText>Width</StyledText>
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
          <Group grow>
            <NumberInput
              defaultValue={0}
              label="x"
              value={x}
              onChange={(x) => dispatch(setPosition({ x }))}
            />
            <NumberInput
              defaultValue={0}
              label="y"
              value={y}
              onChange={(y) => dispatch(setPosition({ y }))}
            />
          </Group>
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
        <div />
      </SimpleGrid>
    </StyledBox>
  )
}

function getRandomPtnUrl() {
  // /images/patterns/p0.jpeg
  const n = _.random(15)
  return `/images/patterns/p${n}.jpeg`
}
