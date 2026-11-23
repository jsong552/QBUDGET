import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { RecordForm } from './RecordForm'

const save = () => Promise.resolve(true)
const close = () => {}

it('keeps working with the original props only', () => {
  const html = renderToStaticMarkup(
    <RecordForm
      title="Record payment"
      initial={{ paidDate: '2026-11-22', kind: 'rent' }}
      fields={[
        { name: 'paidDate', label: 'Date paid', type: 'date' },
        { name: 'kind', label: 'Kind', options: [{ value: 'rent', label: 'Rent' }] },
      ]}
      onSave={save}
      onClose={close}
      onDelete={save}
    />,
  )
  expect(html).toContain('Record payment')
  expect(html).toContain('Date paid')
  expect(html).toContain('type="date"')
  expect(html).toContain('Delete')
  expect(html).toContain('Save')
})

it('lays out half-width fields two per row', () => {
  const html = renderToStaticMarkup(
    <RecordForm
      title="Add transaction"
      initial={{ date: '', amount: '' }}
      fields={[
        { name: 'date', label: 'Date', type: 'date', half: true },
        { name: 'amount', label: 'Amount (CAD)', type: 'number', half: true },
      ]}
      onSave={save}
      onClose={close}
    />,
  )
  expect(html.match(/col-span-1/g)).toHaveLength(2)
  expect(html).toContain('step="0.01"')
})
