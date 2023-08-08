import { useAppDispatch, useAppSelector } from 'store'
import { SimpleGrid, Textarea, TextInput } from '@mantine/core'
import { setName, setDescription } from 'store/slices/editor'
import { StyledBox, StyledText } from './common'
import { getName } from 'utils/helper'

export default function Effect() {
  const dispatch = useAppDispatch()
  const account = useAppSelector((state) => state.nft.account)
  const { name, description, year, country, ch } = useAppSelector((state) => state.editor)

  return (
    <StyledBox>
      <SimpleGrid cols={1} spacing="xl">
        <div>
          <StyledText mb={8}>Name</StyledText>
          <TextInput
            value={name}
            placeholder={getName(year, country, ch)}
            onChange={(e) => dispatch(setName(e.currentTarget.value))}
          />
        </div>
        <div>
          <StyledText mb={8}>Description</StyledText>
          <Textarea
            value={description}
            placeholder={`Created by ${account || '0x...'}`}
            onChange={(e) => dispatch(setDescription(e.currentTarget.value))}
          />
        </div>
      </SimpleGrid>
    </StyledBox>
  )
}
