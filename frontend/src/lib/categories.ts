import type { Category } from '../types'

/**
 * Whether a category can have a spending budget. The API rejects budgets on income
 * ("Income cannot have a spending budget."); swap this for a backend flag once categories carry one.
 */
export function isBudgetableCategory(category: Category): boolean {
  return category.id !== 'income' && !category.archived
}
