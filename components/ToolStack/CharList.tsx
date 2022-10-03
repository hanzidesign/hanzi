import _ from 'lodash'
import { useState } from 'react'
import { SimpleGrid, Button, Switch, Text } from '@mantine/core'
import { Box, Title, ScrollArea } from '@mantine/core'
import { countries, chars } from 'assets/list'
import type { Char } from 'assets/list'

export default function CharList() {
  const [country, setCountry] = useState('int') // global
  const [isTc, setIsTc] = useState(true)

  return (
    <Box
      sx={(theme) => ({
        padding: 20,
        backgroundColor: theme.colors.gray[0],
      })}
    >
      <SimpleGrid cols={2}>
        <Box>
          <Title order={4}>Country</Title>
        </Box>
        <Box sx={{ position: 'relative' }}>
          <Title order={4}>Year</Title>

          <Switch
            className="absolute-vertical"
            size="md"
            onLabel="TC"
            offLabel="SC"
            color="dark"
            sx={{
              right: 0,
            }}
            checked={isTc}
            onChange={(event) => setIsTc(event.currentTarget.checked)}
          />
        </Box>
        <Box>
          {_.map(countries, (el, key) => (
            <Button
              key={key}
              radius="md"
              color="dark"
              variant={key === country ? 'filled' : 'subtle'}
              sx={{
                display: 'block',
                margin: '0 0 4px -8px',
                padding: '2px 10px',
                fontWeight: 400,
              }}
              onClick={() => setCountry(key)}
            >
              {el}
            </Button>
          ))}
        </Box>
        <Box>
          <ScrollArea type="auto" sx={{ height: 400 }}>
            {country &&
              _.map(chars[country], (el, year) => (
                <Button
                  key={year}
                  radius="md"
                  color="dark"
                  variant="subtle"
                  sx={{
                    display: 'block',
                    margin: '0 0 4px -10px',
                    padding: '2px 10px',
                    fontWeight: 400,
                  }}
                  styles={{
                    label: {
                      width: 64,
                      justifyContent: 'space-between',
                    },
                  }}
                >
                  {year}
                  <Text>({getChar(el, isTc)})</Text>
                </Button>
              ))}
          </ScrollArea>
        </Box>
      </SimpleGrid>
    </Box>
  )
}

function getChar(char: Char, isTc: boolean) {
  if (typeof char === 'string') {
    return char
  }
  return isTc ? char[1] : char[0]
}
