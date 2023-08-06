import _ from 'lodash'
import { BigNumber, BigNumberish } from 'ethers'
import Decimal from 'decimal.js'

function toNum(n: BigNumberish, precision = 1) {
  const floatN = new Decimal(n.toString())
  const fixedN = floatN.mul(precision).toFixed(0) // no decimals
  return BigNumber.from(fixedN)
}

export function mul(a: BigNumberish, b: BigNumberish, precision = 100) {
  const numA = toNum(a, precision)
  const numB = toNum(b, precision)
  return numA.mul(numB).div(precision).div(precision)
}

export function inRange(value: number, range: [number, number], margin = 0) {
  const [lower, upper] = range.sort((a, b) => a - b)
  return upper - margin >= value && value >= lower + margin
}

export function sum(val: BigNumberish[]) {
  return _.reduce(
    val,
    (sum, n) => {
      return sum.add(BigNumber.from(n))
    },
    BigNumber.from(0)
  )
}
