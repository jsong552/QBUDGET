import { expect, it } from 'vitest'
import { matchRateOption, notSetChoice, otherChoice, planChoiceValue, publishedRate, rateOptionLabel } from './semesterPlan'
import type { TuitionRates } from '../types/planning'

const rates: TuitionRates = {
  academicYear: '2026-2027',
  source: 'https://example.org/rates',
  unitsPerCourse: 3,
  programs: [
    { key: 'arts_science', label: 'Arts & Science', perUnitCents: { ontario: 20682, out_of_province: 25876, international: 149366 } },
    { key: 'health_sciences', label: 'Health Sciences (On Campus)', perUnitCents: { ontario: 20682, out_of_province: 25876, international: null } },
  ],
  residencies: [{ key: 'ontario', label: 'Ontario' }, { key: 'international', label: 'International' }],
}

it('pre-selects a stored key or label, blank as not set, and anything else as Other with its text', () => {
  expect(matchRateOption('arts_science', rates.programs)).toEqual({ choice: 'arts_science', other: '' })
  expect(matchRateOption(' arts & science ', rates.programs)).toEqual({ choice: 'arts_science', other: '' })
  expect(matchRateOption('', rates.programs)).toEqual({ choice: notSetChoice, other: '' })
  expect(matchRateOption('Computer Engineering', rates.programs)).toEqual({ choice: otherChoice, other: 'Computer Engineering' })
})

it('sends the key, the trimmed free text, or blank', () => {
  expect(planChoiceValue('ontario', '')).toBe('ontario')
  expect(planChoiceValue(otherChoice, '  Exchange student ')).toBe('Exchange student')
  expect(planChoiceValue(notSetChoice, 'ignored')).toBe('')
})

it('shows labels for stored keys and keeps unknown text', () => {
  expect(rateOptionLabel('international', rates.residencies)).toBe('International')
  expect(rateOptionLabel('Exchange student', rates.residencies)).toBe('Exchange student')
  expect(rateOptionLabel('ontario', undefined)).toBe('ontario')
})

it('tells a missing published rate apart from an incomplete choice', () => {
  expect(publishedRate(rates, 'arts_science', 'ontario')).toBe(20682)
  expect(publishedRate(rates, 'health_sciences', 'international')).toBeNull()
  expect(publishedRate(rates, otherChoice, 'ontario')).toBeUndefined()
  expect(publishedRate(rates, 'arts_science', notSetChoice)).toBeUndefined()
})
