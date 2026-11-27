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
import { focusRing } from '../components/focus'
import { pageError } from '../lib/errors'
import { amountToCents, optionalAmountToCents } from '../lib/moneyInput'
import { matchRateOption, notSetChoice, otherChoice, planChoiceValue, publishedRate, rateOptionLabel } from '../lib/semesterPlan'
import { formatDate, formatDateRange, formatLabel, formatMoney, localTodayIso } from '../lib/format'
import type { Bursary, SemesterPlan, SemesterSummary, StudentFee, TuitionRates } from '../types/planning'
const nonnegative = (value: string) => value === '0' || value === '0.00' ? 0 : amountToCents(value)

const studentStatusHint = 'Ontario, out of province or international'
const estimateRateHint = 'Leave blank to use the Queen\u2019s estimate.'
const noPublishedRateHint = 'No published rate for this combination \u2014 enter your own.'

/**
 * Plan form fields. With rates, faculty and student status are selects fed by /semester/rates (an "Other" choice
 * reveals free text); without them (still loading or failed) they stay free text.
 */
function planFieldsFor(values: Record<string, string>, rates: TuitionRates | null): RecordField[] {
  const choiceFields: RecordField[] = rates
    ? [
        {
          name: 'facultyChoice', label: 'Faculty / program', half: true,
          options: [{ value: notSetChoice, label: 'Not set' }, ...rates.programs.map((p) => ({ value: p.key, label: p.label })), { value: otherChoice, label: 'Other' }],
        },
        {
          name: 'statusChoice', label: 'Student status', half: true, hint: studentStatusHint,
          options: [{ value: notSetChoice, label: 'Not set' }, ...rates.residencies.map((r) => ({ value: r.key, label: r.label })), { value: otherChoice, label: 'Other' }],
        },
        ...(values.facultyChoice === otherChoice ? [{ name: 'facultyOther', label: 'Your faculty / program', maxLength: 100 }] : []),
        ...(values.statusChoice === otherChoice ? [{ name: 'statusOther', label: 'Your student status', maxLength: 100 }] : []),
      ]
    : [
        { name: 'facultyOther', label: 'Faculty / program', required: false, maxLength: 100, half: true },
        { name: 'statusOther', label: 'Student status', required: false, maxLength: 100, half: true, hint: studentStatusHint },
      ]
  const rate = rates ? publishedRate(rates, values.facultyChoice, values.statusChoice) : undefined
  return [
    { name: 'startDate', label: 'Start date', type: 'date', half: true }, { name: 'endDate', label: 'End date (exclusive)', type: 'date', half: true },
    ...choiceFields,
    { name: 'income', label: 'Expected income excluding bursaries (CAD)', type: 'number', min: '0' },
    { name: 'courseCount', label: 'Course count (0-30)', type: 'number', min: '0', step: '1', half: true },
    {
      name: 'rate', label: 'Tuition per course (CAD)', type: 'number', min: '0', required: false, half: true,
      hint: rate === null ? noPublishedRateHint : estimateRateHint,
    },
    { name: 'fees', label: 'Additional tuition fees (CAD)', type: 'number', min: '0' },
  ]
}

/** Form values for a stored plan; a faculty or status that is not in the rates table pre-selects "Other" with its text. */
function planInitialValues(plan: SemesterPlan, rates: TuitionRates | null): Record<string, string> {
  const faculty = rates ? matchRateOption(plan.faculty, rates.programs) : { choice: otherChoice, other: plan.faculty }
  const status = rates ? matchRateOption(plan.studentStatus, rates.residencies) : { choice: otherChoice, other: plan.studentStatus }
  return {
    startDate: plan.startDate, endDate: plan.endDate, income: (plan.expectedIncomeCents / 100).toFixed(2),
    facultyChoice: faculty.choice, facultyOther: faculty.other, statusChoice: status.choice, statusOther: status.other,
    courseCount: String(plan.courseCount), rate: plan.tuitionPerCourseCents ? (plan.tuitionPerCourseCents / 100).toFixed(2) : '',
    fees: (plan.additionalFeesCents / 100).toFixed(2),
  }
}

function TuitionCaption({ summary, rates }: { summary: SemesterSummary; rates: TuitionRates | undefined }) {
  const rate = formatMoney(summary.tuitionPerCourseCents)
  if (summary.tuitionRateSource === 'entered') return <>Your rate: {rate} per course</>
  if (summary.tuitionRateSource === 'estimate') {
    const units = rates ? ` (${rates.unitsPerCourse} units)` : ''
    return (
      <>
        Queen&rsquo;s {rates?.academicYear ? `${rates.academicYear} ` : ''}estimate: {rate} per course{units}. Tuition only &mdash; excludes student fees and health insurance.
        {rates?.source && (
          <>
            {' '}
            <a href={rates.source} target="_blank" rel="noopener noreferrer" className={`rounded font-medium text-primary hover:underline ${focusRing}`}>
              Source
            </a>
          </>
        )}
      </>
    )
  }
  return <>Choose a faculty and student status, or enter a rate.</>
}

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

function SemesterStats({ summary, rates }: { summary: SemesterSummary; rates: TuitionRates | undefined }) {
  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-5">
        <StatCard tone="success" icon={ArrowUp} label="Expected income" value={formatMoney(summary.expectedIncomeCents)} caption="Includes approved bursaries" />
        <StatCard tone="primary" icon={GraduationCap} label="Estimated tuition" value={formatMoney(summary.estimatedTuitionCents)} caption={<TuitionCaption summary={summary} rates={rates} />} />
        <StatCard tone="danger" icon={ArrowDown} label="Planned costs" value={formatMoney(summary.plannedCostsCents)} caption="Tuition, scheduled costs and kept fees" />
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

interface PlanCardProps {
  summary: SemesterSummary
  rates: TuitionRates | undefined
  onEditPlan: () => void
}

function tuitionRateLabel(summary: SemesterSummary): string {
  if (summary.tuitionRateSource === 'none') return ''
  const rate = formatMoney(summary.tuitionPerCourseCents)
  return summary.tuitionRateSource === 'estimate' ? `${rate} (estimate)` : rate
}

function PlanCard({ summary, rates, onEditPlan }: PlanCardProps) {
  const plan = summary.plan
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
        <PlanDetail label="Faculty / program" value={rateOptionLabel(plan.faculty, rates?.programs)} />
        <PlanDetail label="Student status" value={rateOptionLabel(plan.studentStatus, rates?.residencies)} />
        <PlanDetail label="Courses" value={String(plan.courseCount)} />
        <PlanDetail label="Tuition per course" value={tuitionRateLabel(summary)} />
        <PlanDetail label="Additional tuition fees" value={formatMoney(plan.additionalFeesCents)} />
        <PlanDetail label="Expected income excluding bursaries" value={formatMoney(plan.expectedIncomeCents)} />
      </dl>
      <p className="mt-5 text-sm text-muted">
        Tuition is estimated from your faculty and student status using Queen&rsquo;s published rates, unless you enter your own
        per-course rate. Approved bursaries count as income; record received bursaries as transactions.
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
  const { data, error, mutationError, clearMutationError, rates, savePlan, saveBursary, removeBursary, saveFee, removeFee } = useSemester()
  const [planForm, setPlanForm] = useState(false)
  /** Rates as they were when the plan form opened, so the form does not switch between selects and text while open. */
  const [formRates, setFormRates] = useState<TuitionRates | null>(null)
  const [bursary, setBursary] = useState<Bursary | null | undefined>()
  const [fee, setFee] = useState<StudentFee | null | undefined>()
  const plan = data?.summary.plan
  const dialogOpen = planForm || bursary !== undefined || fee !== undefined

  function onEditPlan() {
    clearMutationError()
    setFormRates(rates ?? null)
    setPlanForm(true)
  }

  function planFormFields(values: Record<string, string>) {
    return planFieldsFor(values, formRates)
  }

  function onClosePlanForm() {
    clearMutationError()
    setPlanForm(false)
  }

  function onSavePlan(v: Record<string, string>) {
    // Without rates the form only has the free-text fields, whose values are stored under the "Other" names.
    const faculty = formRates ? planChoiceValue(v.facultyChoice, v.facultyOther) : v.facultyOther.trim()
    const studentStatus = formRates ? planChoiceValue(v.statusChoice, v.statusOther) : v.statusOther.trim()
    // A blank or zero rate is sent as 0, which tells the API to use its estimate.
    return savePlan({ startDate: v.startDate, endDate: v.endDate, expectedIncomeCents: nonnegative(v.income), faculty, studentStatus, courseCount: Number(v.courseCount), tuitionPerCourseCents: optionalAmountToCents(v.rate), additionalFeesCents: nonnegative(v.fees) })
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
      {data && <SemesterStats summary={data.summary} rates={rates} />}
      {data && <PlanCard summary={data.summary} rates={rates} onEditPlan={onEditPlan} />}

      {planForm && plan && <RecordForm title="Semester plan" initial={planInitialValues(plan, formRates)} fields={planFormFields} error={mutationError} onClose={onClosePlanForm} onSave={onSavePlan} />}
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
