export function DataError({ error }: { error: unknown }) {
  if (!error) return null
  return <p role="alert" className="my-4 rounded-lg bg-danger-soft p-4 text-danger">{error instanceof Error ? error.message : 'Could not load your data. Please try again.'}</p>
}
