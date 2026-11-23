import { expect, it } from 'vitest'
import { ApiError } from './apiClient'
import { isBudgetableCategory } from './categories'
import { isNotFound } from './errors'

it('leaves income and archived categories out of the budget picker', () => {
  expect(isBudgetableCategory({ id: 'groceries', name: 'Groceries' })).toBe(true)
  expect(isBudgetableCategory({ id: 'income', name: 'Income' })).toBe(false)
  expect(isBudgetableCategory({ id: 'c1', name: 'Books', custom: true, archived: true })).toBe(false)
})

it('recognises "already removed" answers', () => {
  expect(isNotFound(new ApiError(404, 'Budget not found.'))).toBe(true)
  expect(isNotFound(new ApiError(400, 'Income cannot have a spending budget.'))).toBe(false)
  expect(isNotFound(new Error('Category not found.'))).toBe(false)
})
