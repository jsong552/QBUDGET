import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DataCell, DataRow, DataTable } from './DataTable'
import { StatusBadge } from './StatusBadge'

const columns = [{ key: 'name', label: 'Name' }, { key: 'amount', label: 'Amount', align: 'right' as const }]

it('shows loading, empty and failed rows instead of the children', () => {
  expect(renderToStaticMarkup(<DataTable columns={columns} loading emptyMessage="No rows yet." />)).toContain('Loading…')
  expect(renderToStaticMarkup(<DataTable columns={columns} empty emptyMessage="No rows yet." />)).toContain('No rows yet.')
  expect(renderToStaticMarkup(<DataTable columns={columns} failed emptyMessage="No rows yet." />)).toContain('Could not load this list.')
})

it('renders rows with aligned cells', () => {
  const html = renderToStaticMarkup(
    <DataTable columns={columns} emptyMessage="No rows yet.">
      <DataRow>
        <DataCell>Rent</DataCell>
        <DataCell align="right">$700.00</DataCell>
      </DataRow>
    </DataTable>,
  )
  expect(html).toContain('Rent')
  expect(html).toContain('text-right')
  expect(html).not.toContain('No rows yet.')
})

it('labels statuses for people', () => {
  expect(renderToStaticMarkup(<StatusBadge status="opted_out" />)).toContain('Opted out')
  expect(renderToStaticMarkup(<StatusBadge status="over_budget" />)).toContain('bg-danger-soft')
})
