'use client'

import _ from 'lodash'
import axios from 'axios'
import { useState, useEffect } from 'react'
import { useDebouncedValue } from 'rooks'
import { useAppSelector, useAppDispatch } from '@/store'
import { setSvgData, setPtnData } from '@/store/slices/editor'
import useFileReader from '@/hooks/useFileReader'

export default function useImageLoader() {
  const dispatch = useAppDispatch()
  const { charUrl, ptnUrl } = useAppSelector((state) => state.editor)
  const [debouncedPtnUrl] = useDebouncedValue(ptnUrl, 500)

  const [file, setFile] = useState<File | null>(null)
  const fileResult = useFileReader(file)

  const getSvgData = async () => {
    const data = await downloadSvgData(charUrl)
    dispatch(setSvgData(data))
  }

  const getPngData = async () => {
    if (_.includes(debouncedPtnUrl, '/images/patterns')) {
      const { file, url } = await urlToFile(debouncedPtnUrl)
      if (url === ptnUrl) {
        setFile(file)
      }
    }
  }

  useEffect(() => {
    getSvgData()
  }, [charUrl])

  useEffect(() => {
    if (debouncedPtnUrl) {
      getPngData()
    }
  }, [debouncedPtnUrl])

  useEffect(() => {
    dispatch(setPtnData(fileResult))
  }, [fileResult])
}

async function downloadSvgData(url: string): Promise<string> {
  try {
    const res = await axios(url)
    return res.data.toString()
  } catch (error) {
    console.error(error)
    return `<image href="${url}" x="0" y="0" width="100%" height="100%" />`
  }
}

const urlToFile = async (url: string) => {
  const res = await fetch(url)
  const blob = await res.blob()
  const file = new File([blob], 'pattern.jpg', { type: blob.type })
  return { file, url }
}
