import type { TuitionRates } from '../types/planning'

/** Select values that are not a key from /semester/rates. */
export const notSetChoice = '__none'
export const otherChoice = '__other'

export interface RateOption {
  key: string
  label: string
}

export interface PlanChoice {
  /** A key from the options, notSetChoice, or otherChoice. */
  choice: string
  /** Free text kept when the choice is "Other". */
  other: string
}

const normalize = (value: string) => value.trim().toLowerCase()

/** Pre-selects a stored faculty or status: an exact key or label (any case) selects it, blank is "Not set", anything else is "Other". */
export function matchRateOption(value: string, options: RateOption[]): PlanChoice {
  if (!value.trim()) return { choice: notSetChoice, other: '' }
  const found = options.find((option) => normalize(option.key) === normalize(value) || normalize(option.label) === normalize(value))
  return found ? { choice: found.key, other: '' } : { choice: otherChoice, other: value }
}

/** The text sent to the API for a choice: the key, the trimmed free text, or blank. */
export function planChoiceValue(choice: string, other: string): string {
  if (choice === otherChoice) return other.trim()
  return choice === notSetChoice ? '' : choice
}

/** Human label for a stored value (key or label), or the stored text itself. */
export function rateOptionLabel(value: string, options: RateOption[] | undefined): string {
  if (!value.trim() || !options) return value
  const found = options.find((option) => normalize(option.key) === normalize(value) || normalize(option.label) === normalize(value))
  return found?.label ?? value
}

/**
 * Per-unit rate for a program and residency: a number, null when the table has no published rate for the pair,
 * or undefined when either choice is not from the table.
 */
export function publishedRate(rates: TuitionRates, programKey: string, residencyKey: string): number | null | undefined {
  const program = rates.programs.find((item) => item.key === programKey)
  if (!program || !rates.residencies.some((item) => item.key === residencyKey)) return undefined
  return program.perUnitCents[residencyKey] ?? null
}
