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
export interface SemesterSummary { plan: SemesterPlan; estimatedTuitionCents: number; scheduledCostsCents: number; expectedIncomeCents: number; plannedCostsCents: number; remainingCents: number; optedOutSavingsCents: number }
export interface SemesterData { summary: SemesterSummary; bursaries: Bursary[]; fees: StudentFee[] }
