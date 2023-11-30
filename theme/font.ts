import { Alfa_Slab_One, Space_Grotesk, Noto_Sans_TC, Noto_Sans_SC } from 'next/font/google'

const title = Alfa_Slab_One({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-title',
})
const body = Space_Grotesk({
  weight: ['300', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-body',
})
const notoTC = Noto_Sans_TC({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-noto-tc',
})
const notoSC = Noto_Sans_SC({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--next-noto-sc',
})

export const fontVariables = `${title.variable} ${body.variable} ${notoTC.variable} ${notoSC.variable}`
