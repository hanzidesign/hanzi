const colors = ['#fb5bdc', '#0cfe77', '#18cffa', '#16eefb', '#638FFF']

export const ids = [0, 1, 2, 3, 4].map((el) => `gradient-${el}`)

export default function SvgGradients() {
  return (
    <defs>
      <linearGradient id={ids[0]} x1="0" y1="0" x2="0" y2="16" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[0]} />
        <stop offset="1" stopColor={colors[0]} stopOpacity="0%" />
      </linearGradient>

      <linearGradient id={ids[1]} x1="0" y1="16" x2="16" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[1]} />
        <stop offset="1" stopColor={colors[1]} stopOpacity="0%" />
      </linearGradient>

      <linearGradient id={ids[2]} x1="8" y1="16" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[2]} />
        <stop offset="1" stopColor={colors[2]} stopOpacity="0%" />
      </linearGradient>

      <linearGradient id={ids[3]} x1="16" y1="16" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[3]} />
        <stop offset="1" stopColor={colors[3]} stopOpacity="0%" />
      </linearGradient>

      <linearGradient id={ids[4]} x1="16" y1="0" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop stopColor={colors[4]} />
        <stop offset="1" stopColor={colors[4]} stopOpacity="0%" />
      </linearGradient>
    </defs>
  )
}
