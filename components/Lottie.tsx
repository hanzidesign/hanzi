import { useLottie } from 'lottie-react'
import type { LottieOptions } from 'lottie-react'

type LottieProps = {
  options: LottieOptions
}

export default function Lottie(props: LottieProps) {
  const { View } = useLottie({
    loop: true,
    ...props.options,
  })

  return <>{View}</>
}
