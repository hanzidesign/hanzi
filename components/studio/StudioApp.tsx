'use client'

import { StudioProvider } from '@/app/studio/studio-context'
import StudioShell from '@/components/studio/StudioShell'

export default function StudioApp() {
  return (
    <StudioProvider>
      <StudioShell />
    </StudioProvider>
  )
}
