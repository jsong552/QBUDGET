// API contracts for the C++ planning services. Monetary fields are integer CAD cents.
import type { Category } from './index'
export type BudgetPeriod = 'weekly' | 'monthly' | 'semester'
export interface CategoryBudget { id: string; categoryId: string; period: BudgetPeriod; amountCents: number }
export interface BudgetSummary { category: Category; period: BudgetPeriod; startDate: string; endDate: string; budgetedCents: number; spentCents: number; remainingCents: number; overBudget: boolean }
export interface BudgetData { categories: Category[]; budgets: CategoryBudget[]; summaries: BudgetSummary[] }
export interface RecurringEntry { id: string; description: string; categoryId: string; type: 'income' | 'expense'; amountCents: number; startDate: string; endDate: string | null; frequency: 'weekly' | 'monthly'; active: boolean }
export interface Bursary { id: string; name: string; amountCents: number; status: 'applied' | 'approved' | 'received' }
export interface StudentFee { id: string; name: string; amountCents: number; deadline: string; status: 'kept' | 'opted_out' }
export interface SemesterPlan { startDate: string; endDate: string; expectedIncomeCents: number; faculty: string; studentStatus: string; courseCount: number; tuitionPerCourseCents: number; additionalFeesCents: number }
/** Where the per-course rate behind estimatedTuitionCents came from: the student's own, the Queen's table, or nothing usable. */
export type TuitionRateSource = 'entered' | 'estimate' | 'none'
export interface SemesterSummary {
  plan: SemesterPlan; estimatedTuitionCents: number; scheduledCostsCents: number; expectedIncomeCents: number; plannedCostsCents: number; remainingCents: number; optedOutSavingsCents: number
  /** The per-course rate actually used (entered or estimated); 0 when none. */
  tuitionPerCourseCents: number
  tuitionRateSource: TuitionRateSource
}
export interface SemesterData { summary: SemesterSummary; bursaries: Bursary[]; fees: StudentFee[] }
/** Residency keys used by GET /semester/rates. */
export type ResidencyKey = 'ontario' | 'out_of_province' | 'international' | (string & {})
export interface TuitionProgram {
  key: string
  label: string
  /** Per-unit tuition by residency key; null where no single published rate exists. */
  perUnitCents: Record<ResidencyKey, number | null>
}
export interface TuitionRates {
  /** e.g. "2026-2027". */
  academicYear: string
  /** Page the rates were copied from. */
  source: string
  unitsPerCourse: number
  programs: TuitionProgram[]
  residencies: { key: ResidencyKey; label: string }[]
}
