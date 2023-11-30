import _ from 'lodash'
import { toBigInt, BigNumberish } from 'ethers'
import Decimal from 'decimal.js'

function toNum(n: BigNumberish, precision = 1) {
  const floatN = new Decimal(n.toString())
  const fixedN = floatN.mul(precision).toFixed(0) // no decimals
  return toBigInt(fixedN)
}

export function mul(a: BigNumberish, b: BigNumberish, precision = 100) {
  const numA = toNum(a, precision)
  const numB = toNum(b, precision)
  const p = toBigInt(precision)
  return (numA * numB) / p / p
}
