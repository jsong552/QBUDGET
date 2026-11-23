import { ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { focusRing } from './focus'

type Align = 'left' | 'center' | 'right'

export interface DataColumn<K extends string = string> {
  key: K
  label: string
  /** Width or other header classes, e.g. "w-[15%]". */
  className?: string
  align?: Align
  /** Sortable header: `range` shows an up/down arrow, `menu` a single chevron. Needs `onSortChange`. */
  sort?: 'range' | 'menu' | null
}

const alignClasses: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

interface DataTableProps<K extends string> {
  columns: DataColumn<K>[]
  /** Rows, built with DataRow and DataCell. */
  children?: ReactNode
  /** True until the first data arrives; shows a muted loading row. */
  loading?: boolean
  /** True when loaded with no rows; shows `emptyMessage`. */
  empty?: boolean
  /** True when loading failed and there is nothing to show (the page shows the error itself). */
  failed?: boolean
  emptyMessage: string
  loadingMessage?: string
  onSortChange?: (key: K) => void
  className?: string
}

function SortHeader<K extends string>({ column, onSortChange }: { column: DataColumn<K>; onSortChange?: (key: K) => void }) {
  if (!column.sort || !onSortChange) return <span>{column.label}</span>
  const SortIcon = column.sort === 'range' ? ChevronsUpDown : ChevronDown
  const sortKey = column.key
  const onSort = onSortChange

  function onHeaderClick() {
    onSort(sortKey)
  }

  return (
    <button type="button" onClick={onHeaderClick} className={`inline-flex items-center gap-1.5 rounded font-medium ${focusRing}`}>
      {column.label}
      <SortIcon className="size-3.5" strokeWidth={2.25} />
    </button>
  )
}

/**
 * Table in the Expenses style: tinted header with rounded ends, ruled rows, and built-in loading and empty rows.
 * The first column gets the wider inset (px-6), the others px-3.
 */
export function DataTable<K extends string>({
  columns,
  children,
  loading = false,
  empty = false,
  failed = false,
  emptyMessage,
  loadingMessage = 'Loading…',
  onSortChange,
  className = '',
}: DataTableProps<K>) {
  return (
    <table className={`w-full table-fixed [&_td]:px-3 [&_td:first-child]:px-6 [&_th]:px-3 [&_th:first-child]:px-6 ${className}`}>
      <thead>
        <tr className="bg-surface-muted text-sm text-ink">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`py-3 font-medium first:rounded-l-lg last:rounded-r-lg ${alignClasses[column.align ?? 'left']} ${column.className ?? ''}`}
            >
              <SortHeader column={column} onSortChange={onSortChange} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <tr>
            <td colSpan={columns.length} role="status" className="py-8 text-center text-[15px] text-muted">
              {loadingMessage}
            </td>
          </tr>
        ) : empty || failed ? (
          <tr>
            <td colSpan={columns.length} className="py-8 text-center text-[15px] text-muted">
              {failed ? 'Could not load this list.' : emptyMessage}
            </td>
          </tr>
        ) : (
          children
        )}
      </tbody>
    </table>
  )
}

export function DataRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-line text-[15px] text-ink">{children}</tr>
}

interface DataCellProps {
  children?: ReactNode
  align?: Align
  className?: string
}

export function DataCell({ children, align = 'left', className = '' }: DataCellProps) {
  return <td className={`py-2.5 ${alignClasses[align]} ${className}`}>{children}</td>
}
