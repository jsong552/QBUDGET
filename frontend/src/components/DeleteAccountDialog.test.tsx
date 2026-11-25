import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { DeleteAccountDialog } from './DeleteAccountDialog'

it('warns that deletion is permanent and asks for the password', () => {
  const html = renderToStaticMarkup(<DeleteAccountDialog onDelete={vi.fn()} onClose={vi.fn()} />)
  expect(html).toContain('Delete your account?')
  expect(html).toContain('all of your data')
  expect(html).toContain('be undone')
  expect(html).toContain('Enter your password to confirm')
  expect(html).toContain('type="password"')
  expect(html).toContain('autoComplete="current-password"')
  expect(html).toContain('>Delete account<')
  expect(html).toContain('>Cancel<')
})
