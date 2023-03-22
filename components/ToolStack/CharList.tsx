import _ from 'lodash'
import { useAppDispatch, useAppSelector } from 'store'
import { SimpleGrid, Button, Switch, Text } from '@mantine/core'
import { Box, Title, ScrollArea } from '@mantine/core'
import { setCharUrl, setMetadata, setIsTc } from 'store/slices/editor'
import { countries, chars } from 'assets/list'
import { StyledBox } from './common'
import type { Char } from 'assets/list'

export default function CharList() {
  const dispatch = useAppDispatch()
  const { charUrl, isTc } = useAppSelector((state) => state.editor)
  const [country, year] = parseCharUrl(charUrl)

  const handleChange = (country: string, year: string, isTc: boolean) => {
    const char = chars[country][year]
    const url = getCharUrl(country, year, char, isTc)
    dispatch(setCharUrl(url))

    const countryName = countries[country]
    const ch = typeof char === 'string' ? char : isTc ? char[1] : char[0]
    dispatch(
      setMetadata({
        country: countryName,
        year: Number(year),
        ch,
      })
    )
  }

  return (
    <StyledBox>
      <SimpleGrid cols={2}>
        <Box>
          <Title order={4}>Country</Title>
        </Box>
        <Box sx={{ position: 'relative' }}>
          <Title order={4} sx={{ paddingLeft: 10 }}>
            Year
          </Title>

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
              sx={{
                display: 'block',
                margin: '0 0 4px -8px',
                padding: '2px 10px',
                fontWeight: 400,
              }}
              onClick={() => {
                const [year] = _.keys(chars[key])
                handleChange(key, year, isTc)
              }}
            >
              {el}
            </Button>
          ))}
        </Box>
        <Box>
          <ScrollArea type="auto" sx={{ height: 400 }}>
            {_.map(chars[country], (el, y) => (
              <Button
                key={y}
                radius="md"
                color="dark"
                variant={y === year ? 'filled' : 'subtle'}
                sx={{
                  display: 'block',
                  margin: '0 0 4px',
                  padding: '2px 10px',
                  fontWeight: 400,
                }}
                styles={{
                  label: {
                    width: 64,
                    justifyContent: 'space-between',
                  },
                }}
                onClick={() => {
                  handleChange(country, y, isTc)
                }}
              >
                {y}
                <Text>({getChar(el, isTc)})</Text>
              </Button>
            ))}
          </ScrollArea>
        </Box>
      </SimpleGrid>
    </StyledBox>
  )
}

function getChar(char: Char, isTc: boolean) {
  if (typeof char === 'string') {
    return char
  }
  return isTc ? char[1] : char[0]
}

function getCharUrl(country: string, year: string, char: Char, isTc: boolean) {
  const url = `/chars/${country}/${year}`
  if (typeof char === 'string') {
    return `${url}.svg`
  }
  return isTc ? `${url}-1.svg` : `${url}-0.svg`
}

function parseCharUrl(url: string) {
  // http://localhost:3000/chars/int/2006-1.svg
  const [country, name] = _.compact(_.split(url, '/')).slice(-2)
  const year = `${name}`.slice(0, 4)
  return [country, year] as const
}
