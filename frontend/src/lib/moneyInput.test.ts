import { expect, it } from 'vitest'
import { amountToCents } from './moneyInput'
it('converts decimal input to exact integer cents', () => {
  expect(amountToCents('24.50')).toBe(2450)
  expect(amountToCents('0.29')).toBe(29)
  expect(amountToCents('10')).toBe(1000)
})
it('rejects invalid, negative, zero, excessive and fractional-cent amounts', () => {
  for (const value of ['', '0', '-2', '2.005', '1e3', '1000000001']) expect(() => amountToCents(value)).toThrow()
})
