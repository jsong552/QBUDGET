export function amountToCents(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with at most two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000000) throw new Error('Enter a valid positive amount.')
  return cents
}
