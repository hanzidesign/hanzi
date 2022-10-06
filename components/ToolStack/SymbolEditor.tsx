import _ from 'lodash'
import { useState, useEffect } from 'react'
import { SimpleGrid, FileInput } from '@mantine/core'
import { StyledBox } from './common'
import useFileReader from 'hooks/useFileReader'

export default function SymbolEditor() {
  const [file, setFile] = useState<File | null>(null)
  const fileResult = useFileReader(file)

  return (
    <StyledBox>
      <SimpleGrid cols={1}>
        <div>
          <FileInput
            label="Pattern"
            value={file}
            onChange={setFile}
            accept="image/*"
          />
          {typeof fileResult === 'string' && <img src={fileResult} />}
        </div>
        <div>2</div>
        <div>3</div>
        <div>4</div>
        <div>5</div>
      </SimpleGrid>
    </StyledBox>
  )
}
