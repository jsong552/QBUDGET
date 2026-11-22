import { expect, it } from 'vitest'
import { ApiError } from './apiClient'
import { errorMessage, pageError } from './errors'
import { formatLabel } from './format'

it('shows the backend message from an API error', () => {
  expect(errorMessage(new ApiError(400, 'A category with this name already exists.'))).toBe('A category with this name already exists.')
})

it('replaces the generic HTTP wording with a friendly message', () => {
  expect(errorMessage(new ApiError(500, 'API returned HTTP 500'))).toBe('The server could not complete this request. Please try again.')
  expect(errorMessage(new ApiError(404, 'API returned HTTP 404'))).toBe('This item no longer exists. Refresh the page.')
})

it('handles network failures, form checks and unknown values', () => {
  expect(errorMessage(new TypeError('Failed to fetch'))).toBe('Could not reach the server. Check your connection and try again.')
  expect(errorMessage(new Error('Enter a valid positive amount.'))).toBe('Enter a valid positive amount.')
  expect(errorMessage('boom')).toBe('Something went wrong. Please try again.')
})

it('leaves a form save error out of the page error only while the form is open', () => {
  const saveError = new ApiError(400, 'Income cannot have a spending budget.')
  const loadError = new ApiError(500, 'API returned HTTP 500')
  expect(pageError(saveError, saveError, true)).toBeNull()
  expect(pageError(saveError, saveError, false)).toBe(saveError)
  expect(pageError(loadError, saveError, true)).toBe(loadError)
})

it('formats stored values as labels', () => {
  expect(formatLabel('credit_card')).toBe('Credit card')
  expect(formatLabel('weekly')).toBe('Weekly')
  expect(formatLabel('opted_out')).toBe('Opted out')
})
