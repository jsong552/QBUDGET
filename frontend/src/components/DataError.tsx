import { errorMessage } from '../lib/errors'

export function DataError({ error }: { error: unknown }) {
  if (!error) return null
  return <p role="alert" className="my-4 rounded-lg bg-danger-soft p-4 text-danger">{errorMessage(error)}</p>
}
