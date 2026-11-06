import type { Category, TransactionType } from '../types'
import { getCategoryStyle } from './categoryStyles'
import { toneClasses, type Tone } from './tones'

export function CategoryBadge({ category }: { category: Category }) {
  const { icon: Icon, tone } = getCategoryStyle(category.id)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${toneClasses[tone].soft}`}>
      <Icon className="size-4" strokeWidth={2} />
      {category.name || 'Other'}
    </span>
  )
}

const typeLabels: Partial<Record<TransactionType, string>> = { income: 'Income', expense: 'Expense' }

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const tone: Tone = type === 'income' ? 'success' : type === 'expense' ? 'danger' : 'quiet'
  return (
    <span className={`inline-flex rounded-md px-2.5 py-1 text-sm font-medium ${toneClasses[tone].soft}`}>{typeLabels[type] ?? 'Other'}</span>
  )
}
