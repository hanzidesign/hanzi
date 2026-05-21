'use client'

import _ from 'lodash'
import { Box, Button, ScrollArea, SimpleGrid, Switch, Text } from '@mantine/core'
import { chars, parseCharUrl, sortedChars } from '@/assets/chars'
import { countries } from '@/assets/list'
import { useStudio } from '@/app/studio/studio-context'
import { PanelBox } from '@/components/studio/PanelPrimitives'

export default function CharacterPanel() {
  const {
    state: { charUrl, isTc },
    setCharacter,
  } = useStudio()
  const [country, year] = parseCharUrl(charUrl)
  const list = isTc ? sortedChars.tc : sortedChars.sc

  const handleChange = (nextCountry: string, nextYear: string, nextIsTc = isTc) => {
    const nextList = nextIsTc ? chars.tc : chars.sc
    if (nextList[nextCountry]?.[nextYear]) {
      setCharacter(nextCountry, nextYear, nextIsTc)
    }
  }

  return (
    <PanelBox>
      <SimpleGrid cols={2}>
        <Box>
          <Text fw={700} fz="lg">
            Country
          </Text>
        </Box>
        <Box pos="relative">
          <Text fw={700} fz="lg" pl={10}>
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
              handleChange(country, year, checked)
            }}
          />
        </Box>
        <Box>
          {_.map(countries, (label, key) => (
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
                const [{ year: nextYear }] = list[key]
                handleChange(key, nextYear)
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
        <Box>
          <ScrollArea type="auto" h={552}>
            {_.map(list[country], ({ year: optionYear, ch }) => (
              <Button
                key={optionYear}
                radius="md"
                color="dark"
                variant={optionYear === year ? 'filled' : 'subtle'}
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
                  handleChange(country, optionYear)
                }}
              >
                {optionYear}
                <Text ff="var(--font-noto)">({ch})</Text>
              </Button>
            ))}
          </ScrollArea>
        </Box>
      </SimpleGrid>
    </PanelBox>
  )
}
