import { useState } from 'react'
import { useSemester } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { Bursary, StudentFee } from '../types/planning'
const nonnegative = (value: string) => value === '0' || value === '0.00' ? 0 : amountToCents(value)

const planFields: RecordField[] = [
  { name: 'startDate', label: 'Start date', type: 'date', half: true }, { name: 'endDate', label: 'End date (exclusive)', type: 'date', half: true },
  { name: 'income', label: 'Expected income excluding bursaries (CAD)', type: 'number', min: '0' },
  { name: 'faculty', label: 'Faculty / program (optional)', required: false, maxLength: 100, half: true }, { name: 'studentStatus', label: 'Student status (optional)', required: false, maxLength: 100, half: true },
  { name: 'courseCount', label: 'Course count (0-30)', type: 'number', min: '0', step: '1', half: true }, { name: 'rate', label: 'Tuition per course (CAD, enter your rate)', type: 'number', min: '0', half: true },
  { name: 'fees', label: 'Additional tuition fees (CAD)', type: 'number', min: '0' },
]

const bursaryFields: RecordField[] = [
  { name: 'name', label: 'Name' }, { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true },
  { name: 'status', label: 'Status', options: ['applied', 'approved', 'received'].map(value => ({ value, label: formatLabel(value) })), half: true },
]

const feeFields: RecordField[] = [
  { name: 'name', label: 'Name' }, { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true }, { name: 'deadline', label: 'Opt-out deadline', type: 'date', half: true },
  { name: 'status', label: 'Decision', options: [{ value: 'kept', label: 'Kept' }, { value: 'opted_out', label: 'Opted out' }] },
]

export function SemesterPage() {
  const { data, error, mutationError, clearMutationError, savePlan, saveBursary, removeBursary, saveFee, removeFee } = useSemester()
  const [planForm, setPlanForm] = useState(false)
  const [bursary, setBursary] = useState<Bursary | null | undefined>()
  const [fee, setFee] = useState<StudentFee | null | undefined>()
  const plan = data?.summary.plan
  const dialogOpen = planForm || bursary !== undefined || fee !== undefined

  function onEditPlan() {
    clearMutationError()
    setPlanForm(true)
  }

  function onClosePlanForm() {
    clearMutationError()
    setPlanForm(false)
  }

  function onSavePlan(v: Record<string, string>) {
    return savePlan({ startDate: v.startDate, endDate: v.endDate, expectedIncomeCents: nonnegative(v.income), faculty: v.faculty, studentStatus: v.studentStatus, courseCount: Number(v.courseCount), tuitionPerCourseCents: nonnegative(v.rate), additionalFeesCents: nonnegative(v.fees) })
  }

  function onOpenBursary(row: Bursary | null) {
    clearMutationError()
    setBursary(row)
  }

  function onCloseBursaryForm() {
    clearMutationError()
    setBursary(undefined)
  }

  function onSaveBursary(v: Record<string, string>) {
    return saveBursary(bursary?.id ?? null, { name: v.name, amountCents: amountToCents(v.amount), status: v.status as Bursary['status'] })
  }

  function onDeleteBursary() {
    return bursary ? removeBursary(bursary.id) : Promise.resolve(false)
  }

  function onOpenFee(row: StudentFee | null) {
    clearMutationError()
    setFee(row)
  }

  function onCloseFeeForm() {
    clearMutationError()
    setFee(undefined)
  }

  function onSaveFee(v: Record<string, string>) {
    return saveFee(fee?.id ?? null, { name: v.name, amountCents: amountToCents(v.amount), deadline: v.deadline, status: v.status as StudentFee['status'] })
  }

  function onDeleteFee() {
    return fee ? removeFee(fee.id) : Promise.resolve(false)
  }

  return <div><PageHeader title="Semester planning" subtitle="Plan costs, track bursary applications, and record optional fee decisions." /><DataError error={pageError(error, mutationError, dialogOpen)} />
    {data && <Card className="mt-5 p-6"><div className="flex justify-between"><h2 className="text-xl font-bold">{plan?.startDate} to {plan?.endDate} (exclusive)</h2><Button onClick={onEditPlan}>Edit semester plan</Button></div>
      <div className="mt-5 grid grid-cols-4 gap-4">{[['Expected income', data.summary.expectedIncomeCents], ['Planned costs', data.summary.plannedCostsCents], ['Remaining', data.summary.remainingCents], ['Opted-out fees saved', data.summary.optedOutSavingsCents]].map(([label, value]) => <div key={String(label)}><p className="text-muted">{label}</p><strong className="text-2xl">{formatMoney(Number(value))}</strong></div>)}</div>
      <p className="mt-4 text-sm text-muted">Tuition estimate: {formatMoney(data.summary.estimatedTuitionCents)} using your entered per-course rate, course count, and additional tuition fees. No official Queen's rates are assumed. Income includes approved bursaries; received bursaries should be entered as transactions. Scheduled non-tuition costs and kept fees within the semester are included.</p>
    </Card>}
    {planForm && plan && <RecordForm title="Semester plan" initial={{ startDate: plan.startDate, endDate: plan.endDate, income: (plan.expectedIncomeCents / 100).toFixed(2), faculty: plan.faculty, studentStatus: plan.studentStatus, courseCount: String(plan.courseCount), rate: (plan.tuitionPerCourseCents / 100).toFixed(2), fees: (plan.additionalFeesCents / 100).toFixed(2) }} fields={planFields} error={mutationError} onClose={onClosePlanForm} onSave={onSavePlan} />}
    <div className="mt-5 grid grid-cols-2 gap-5"><Card className="p-6"><div className="flex justify-between"><h2 className="text-xl font-bold">Bursaries</h2><Button onClick={() => onOpenBursary(null)}>Add bursary</Button></div><ul className="mt-4">{data?.bursaries.map(row => <li className="flex items-center justify-between border-b border-line py-3" key={row.id}><div>{row.name}<p className="text-muted">{formatMoney(row.amountCents)} / {row.status}</p></div><Button variant="outline" onClick={() => onOpenBursary(row)}>Edit</Button></li>)}</ul></Card>
    <Card className="p-6"><div className="flex justify-between"><h2 className="text-xl font-bold">Optional student fees</h2><Button onClick={() => onOpenFee(null)}>Add fee</Button></div><ul className="mt-4">{data?.fees.map(row => <li className="flex items-center justify-between border-b border-line py-3" key={row.id}><div>{row.name}<p className="text-muted">{formatMoney(row.amountCents)} / {row.status.replace('_', ' ')} / {row.deadline}</p></div><Button variant="outline" onClick={() => onOpenFee(row)}>Edit</Button></li>)}</ul></Card></div>
    {bursary !== undefined && <RecordForm title="Bursary" initial={{ name: bursary?.name ?? '', amount: bursary ? (bursary.amountCents / 100).toFixed(2) : '', status: bursary?.status ?? 'applied' }} fields={bursaryFields} error={mutationError} deleteMessage="This bursary will be removed from your plan." onClose={onCloseBursaryForm} onDelete={bursary ? onDeleteBursary : undefined} onSave={onSaveBursary} />}
    {fee !== undefined && <RecordForm title="Student fee" initial={{ name: fee?.name ?? '', amount: fee ? (fee.amountCents / 100).toFixed(2) : '', deadline: fee?.deadline ?? localTodayIso(), status: fee?.status ?? 'kept' }} fields={feeFields} error={mutationError} deleteMessage="This fee will be removed from your plan." onClose={onCloseFeeForm} onDelete={fee ? onDeleteFee : undefined} onSave={onSaveFee} />}
  </div>
}
