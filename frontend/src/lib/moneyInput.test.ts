import { expect, it } from 'vitest'
import { amountToCents, optionalAmountToCents } from './moneyInput'
it('converts decimal input to exact integer cents', () => {
  expect(amountToCents('24.50')).toBe(2450)
  expect(amountToCents('0.29')).toBe(29)
  expect(amountToCents('10')).toBe(1000)
})
it('rejects invalid, negative, zero, excessive and fractional-cent amounts', () => {
  for (const value of ['', '0', '-2', '2.005', '1e3', '1000000001']) expect(() => amountToCents(value)).toThrow()
})
it('reads a blank or zero optional amount as 0 and still checks everything else', () => {
  for (const value of ['', '   ', '0', '0.0', '0.00', '00']) expect(optionalAmountToCents(value)).toBe(0)
  expect(optionalAmountToCents(' 620.46 ')).toBe(62046)
  for (const value of ['-2', '2.005', 'abc']) expect(() => optionalAmountToCents(value)).toThrow()
})
it('keeps rejecting blank and zero in the required parser', () => {
  expect(() => amountToCents('')).toThrow()
  expect(() => amountToCents('0')).toThrow()
})
