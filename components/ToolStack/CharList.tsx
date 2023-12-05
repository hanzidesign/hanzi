'use client'

import _ from 'lodash'
import { useAppDispatch, useAppSelector } from '@/store'
import { SimpleGrid, Button, Switch } from '@mantine/core'
import { Box, Text, ScrollArea } from '@mantine/core'
import { setCharUrl, setMetadata, setIsTc } from '@/store/slices/editor'
import { countries } from '@/assets/list'
import { chars, sortedChars, parseCharUrl } from '@/assets/chars'
import { StyledBox } from './common'

export default function CharList() {
  const dispatch = useAppDispatch()
  const { charUrl, isTc } = useAppSelector((state) => state.editor)
  const [country, year] = parseCharUrl(charUrl)
  const list = isTc ? sortedChars.tc : sortedChars.sc

  const handleChange = (country: string, year: string, isTc: boolean) => {
    const list = isTc ? chars.tc : chars.sc
    const char = list[country][year]
    const url = getCharUrl(country, year, isTc)
    dispatch(setCharUrl(url))

    const countryName = countries[country]
    dispatch(
      setMetadata({
        country: countryName,
        year,
        ch: char,
      })
    )
  }

  return (
    <StyledBox>
      <SimpleGrid cols={2}>
        <Box>
          <Text fw="700" fz="lg">
            Country
          </Text>
        </Box>
        <Box pos="relative">
          <Text fw="700" fz="lg" pl={10}>
            Year
          </Text>

          <Switch
            className="absolute-vertical"
            size="md"
            onLabel="TC"
            offLabel="SC"
            color="dark"
            right={0}
            checked={isTc}
            onChange={(event) => {
              const { checked } = event.currentTarget
              dispatch(setIsTc(checked))
              handleChange(country, year, checked)
            }}
          />
        </Box>
        <Box>
          {_.map(countries, (el, key) => (
            <Button
              key={key}
              radius="md"
              color="dark"
              variant={key === country ? 'filled' : 'subtle'}
              display="block"
              m="0 0 4px -8px"
              p="2px 10px"
              fw={400}
              onClick={() => {
                const [{ year }] = list[key]
                handleChange(key, year, isTc)
              }}
            >
              {el}
            </Button>
          ))}
        </Box>
        <Box>
          <ScrollArea type="auto" h={552}>
            {_.map(list[country], ({ year: y, ch }) => (
              <Button
                key={y}
                radius="md"
                color="dark"
                variant={y === year ? 'filled' : 'subtle'}
                display="block"
                m="0 0 4px"
                p="2px 10px"
                fw={400}
                styles={{
                  label: {
                    width: 72,
                    justifyContent: 'space-between',
                  },
                }}
                onClick={() => {
                  handleChange(country, y, isTc)
                }}
              >
                {y}
                <Text ff="var(--font-noto)">({ch})</Text>
              </Button>
            ))}
          </ScrollArea>
        </Box>
      </SimpleGrid>
    </StyledBox>
  )
}

function getCharUrl(country: string, year: string, isTc: boolean) {
  const root = isTc ? 'tc' : 'sc'
  const url = `/chars/${root}/${country}/${year}`
  return isTc ? `${url}.svg` : `${url}.svg`
}
