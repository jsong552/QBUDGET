import { useState } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, CirclePlus, GraduationCap, Pencil, PiggyBank, Wallet } from 'lucide-react'
import { useSemester } from '../hooks/usePlanning'
import { PageHeader } from '../components/PageHeader'
import { Card, CardHeader } from '../components/Card'
import { Button } from '../components/Button'
import { DataError } from '../components/DataError'
import { DataCell, DataRow, DataTable, type DataColumn } from '../components/DataTable'
import { IconButton } from '../components/IconButton'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/StatusBadge'
import { RecordForm, type RecordField } from '../components/RecordForm'
import { pageError } from '../lib/errors'
import { amountToCents } from '../lib/moneyInput'
import { formatDate, formatDateRange, formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { Bursary, SemesterPlan, SemesterSummary, StudentFee } from '../types/planning'
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

const bursaryColumns: DataColumn[] = [
  { key: 'name', label: 'Name', className: 'w-[38%]' },
  { key: 'amount', label: 'Amount', className: 'w-[24%]' },
  { key: 'status', label: 'Status', className: 'w-[22%]' },
  { key: 'actions', label: 'Actions' },
]

const feeColumns: DataColumn[] = [
  { key: 'name', label: 'Name', className: 'w-[28%]' },
  { key: 'amount', label: 'Amount', className: 'w-[18%]' },
  { key: 'deadline', label: 'Deadline', className: 'w-[20%]' },
  { key: 'decision', label: 'Decision', className: 'w-[19%]' },
  { key: 'actions', label: 'Actions' },
]

function SemesterStats({ summary }: { summary: SemesterSummary }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-5">
        <StatCard tone="success" icon={ArrowUp} label="Expected income" value={formatMoney(summary.expectedIncomeCents)} caption="Includes approved bursaries" />
        <StatCard tone="primary" icon={GraduationCap} label="Estimated tuition" value={formatMoney(summary.estimatedTuitionCents)} caption="Courses x your per-course rate" />
        <StatCard tone="danger" icon={ArrowDown} label="Planned costs" value={formatMoney(summary.plannedCostsCents)} caption="Tuition, payments and kept fees" />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-5">
        <StatCard
          tone={summary.remainingCents >= 0 ? 'success' : 'danger'}
          icon={Wallet}
          label="Remaining"
          value={formatMoney(summary.remainingCents)}
          caption="Income minus planned costs"
        />
        <StatCard tone="accent" icon={PiggyBank} label="Opted-out fees saved" value={formatMoney(summary.optedOutSavingsCents)} caption="From fees you opted out of" />
        <StatCard tone="info" icon={CalendarDays} label="Scheduled costs" value={formatMoney(summary.scheduledCostsCents)} caption="Calendar payments this semester" />
      </div>
    </>
  )
}

function PlanDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-medium text-ink">{value || 'Not set'}</dd>
    </div>
  )
}

function PlanCard({ plan, onEditPlan }: { plan: SemesterPlan; onEditPlan: () => void }) {
  return (
    <Card className="mt-5 px-8 pt-5 pb-6">
      <CardHeader
        eyebrow="Semester plan"
        title={formatDateRange(plan.startDate, plan.endDate)}
        subtitle="The inputs used for your semester estimate."
        action={
          <Button variant="outline" icon={Pencil} onClick={onEditPlan} className="px-5 py-3 text-[15px]">
            Edit plan
          </Button>
        }
      />
      <dl className="mt-5 grid grid-cols-3 gap-x-6 gap-y-4">
        <PlanDetail label="Faculty / program" value={plan.faculty} />
        <PlanDetail label="Student status" value={plan.studentStatus} />
        <PlanDetail label="Courses" value={String(plan.courseCount)} />
        <PlanDetail label="Tuition per course" value={formatMoney(plan.tuitionPerCourseCents)} />
        <PlanDetail label="Additional tuition fees" value={formatMoney(plan.additionalFeesCents)} />
        <PlanDetail label="Expected income excluding bursaries" value={formatMoney(plan.expectedIncomeCents)} />
      </dl>
      <p className="mt-5 text-sm text-muted">
        Estimated from your semester plan. Approved bursaries count as income; record received bursaries as transactions.
      </p>
    </Card>
  )
}

function BursaryRow({ bursary, onEditBursary }: { bursary: Bursary; onEditBursary: (bursary: Bursary) => void }) {
  function onEditClick() {
    onEditBursary(bursary)
  }

  return (
    <DataRow>
      <DataCell>{bursary.name}</DataCell>
      <DataCell className="font-medium">{formatMoney(bursary.amountCents)}</DataCell>
      <DataCell>
        <StatusBadge status={bursary.status} />
      </DataCell>
      <DataCell>
        <IconButton icon={Pencil} label={`Edit ${bursary.name}`} onClick={onEditClick} />
      </DataCell>
    </DataRow>
  )
}

function FeeRow({ fee, onEditFee }: { fee: StudentFee; onEditFee: (fee: StudentFee) => void }) {
  function onEditClick() {
    onEditFee(fee)
  }

  return (
    <DataRow>
      <DataCell>{fee.name}</DataCell>
      <DataCell className="font-medium">{formatMoney(fee.amountCents)}</DataCell>
      <DataCell>{formatDate(fee.deadline)}</DataCell>
      <DataCell>
        <StatusBadge status={fee.status} />
      </DataCell>
      <DataCell>
        <IconButton icon={Pencil} label={`Edit ${fee.name}`} onClick={onEditClick} />
      </DataCell>
    </DataRow>
  )
}

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

  function onAddBursary() {
    onOpenBursary(null)
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

  function onAddFee() {
    onOpenFee(null)
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

  return (
    <div>
      <PageHeader title="Semester planning" subtitle="Plan costs, track bursary applications, and record optional fee decisions." />
      <DataError error={pageError(error, mutationError, dialogOpen)} />

      {!data && !error && (
        <Card className="mt-6 px-8 pt-5 pb-6">
          <p className="text-sm text-muted">Loading your semester plan…</p>
        </Card>
      )}
      {data && <SemesterStats summary={data.summary} />}
      {plan && <PlanCard plan={plan} onEditPlan={onEditPlan} />}

      {planForm && plan && <RecordForm title="Semester plan" initial={{ startDate: plan.startDate, endDate: plan.endDate, income: (plan.expectedIncomeCents / 100).toFixed(2), faculty: plan.faculty, studentStatus: plan.studentStatus, courseCount: String(plan.courseCount), rate: (plan.tuitionPerCourseCents / 100).toFixed(2), fees: (plan.additionalFeesCents / 100).toFixed(2) }} fields={planFields} error={mutationError} onClose={onClosePlanForm} onSave={onSavePlan} />}
      <Card className="mt-5 px-4 pt-5 pb-1">
        <div className="px-4">
          <CardHeader
            title="Bursaries"
            subtitle="Track applications and approvals."
            action={
              <Button icon={CirclePlus} onClick={onAddBursary} className="px-5 py-3 text-[15px]">
                Add bursary
              </Button>
            }
          />
        </div>
        <DataTable
          columns={bursaryColumns}
          loading={!data && !error}
          failed={!data && Boolean(error)}
          empty={data?.bursaries.length === 0}
          emptyMessage="No bursaries yet. Add one to track its status."
          className="mt-5"
        >
          {data?.bursaries.map((row) => <BursaryRow key={row.id} bursary={row} onEditBursary={onOpenBursary} />)}
        </DataTable>
      </Card>

      <Card className="mt-5 px-4 pt-5 pb-1">
        <div className="px-4">
          <CardHeader
            title="Optional student fees"
            subtitle="Record whether you keep or opt out of each fee."
            action={
              <Button variant="outline" icon={CirclePlus} onClick={onAddFee} className="px-5 py-3 text-[15px]">
                Add fee
              </Button>
            }
          />
        </div>
        <DataTable
          columns={feeColumns}
          loading={!data && !error}
          failed={!data && Boolean(error)}
          empty={data?.fees.length === 0}
          emptyMessage="No optional fees yet."
          className="mt-5"
        >
          {data?.fees.map((row) => <FeeRow key={row.id} fee={row} onEditFee={onOpenFee} />)}
        </DataTable>
      </Card>

      {bursary !== undefined && <RecordForm title="Bursary" initial={{ name: bursary?.name ?? '', amount: bursary ? (bursary.amountCents / 100).toFixed(2) : '', status: bursary?.status ?? 'applied' }} fields={bursaryFields} error={mutationError} deleteMessage="This bursary will be removed from your plan." onClose={onCloseBursaryForm} onDelete={bursary ? onDeleteBursary : undefined} onSave={onSaveBursary} />}
      {fee !== undefined && <RecordForm title="Student fee" initial={{ name: fee?.name ?? '', amount: fee ? (fee.amountCents / 100).toFixed(2) : '', deadline: fee?.deadline ?? localTodayIso(), status: fee?.status ?? 'kept' }} fields={feeFields} error={mutationError} deleteMessage="This fee will be removed from your plan." onClose={onCloseFeeForm} onDelete={fee ? onDeleteFee : undefined} onSave={onSaveFee} />}
    </div>
  )
}
