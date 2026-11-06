import { BookOpen, BriefcaseBusiness, Bus, Coffee, House, Lightbulb, ShoppingCart, Tag, Utensils, type LucideIcon } from 'lucide-react'
import type { Category, CategoryId, TransactionType } from '../types'
import { toneClasses, type Tone } from './tones'

const categoryStyles: Record<CategoryId, { icon: LucideIcon; tone: Tone }> = {
  groceries: { icon: ShoppingCart, tone: 'info' },
  food: { icon: Utensils, tone: 'danger' },
  dining: { icon: Coffee, tone: 'accent' },
  housing: { icon: House, tone: 'danger' },
  school: { icon: BookOpen, tone: 'plum' },
  transportation: { icon: Bus, tone: 'accent' },
  utilities: { icon: Lightbulb, tone: 'accent' },
  income: { icon: BriefcaseBusiness, tone: 'success' },
  other: { icon: Tag, tone: 'quiet' },
}

export function CategoryBadge({ category }: { category: Category }) {
  const { icon: Icon, tone } = categoryStyles[category.id]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${toneClasses[tone].soft}`}>
      <Icon className="size-4" strokeWidth={2} />
      {category.name}
    </span>
  )
}

const typeLabels: Record<TransactionType, string> = { income: 'Income', expense: 'Expense' }

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const tone: Tone = type === 'income' ? 'success' : 'danger'
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-sm font-medium ${toneClasses[tone].soft}`}>{typeLabels[type]}</span>
}
