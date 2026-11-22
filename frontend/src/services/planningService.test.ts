import { beforeEach, expect, it, vi } from 'vitest'
const client = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), get: vi.fn() }))
vi.mock('../lib/apiClient', () => ({ apiClient: client }))
import { getTuitionRates, saveRecurring } from './planningService'
const entry = {
  description: 'Rent', categoryId: 'rent', type: 'expense' as const, amountCents: -100000,
  startDate: '2026-11-01', endDate: null, frequency: 'monthly' as const, active: true,
}
beforeEach(() => { vi.resetAllMocks(); client.post.mockResolvedValue(undefined); client.put.mockResolvedValue(undefined) })
it('generates due occurrences only after a schedule has been saved', async () => {
  let finish!: () => void
  client.post.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
  const saving = saveRecurring(null, entry)
  expect(client.post).toHaveBeenCalledTimes(1)
  finish()
  await saving
  expect(client.post).toHaveBeenNthCalledWith(1, '/recurring', entry)
  expect(client.post).toHaveBeenNthCalledWith(2, '/recurring/sync', {})
})
it('does not process schedules when saving fails', async () => {
  client.put.mockRejectedValueOnce(new Error('Save denied'))
  await expect(saveRecurring('schedule', entry)).rejects.toThrow('Save denied')
  expect(client.post).not.toHaveBeenCalled()
})
it('reports a failed synchronization so the user can retry safely', async () => {
  client.post.mockRejectedValueOnce(new Error('Sync unavailable'))
  await expect(saveRecurring('schedule', entry)).rejects.toThrow('Sync unavailable')
  expect(client.put).toHaveBeenCalledWith('/recurring/schedule', entry)
})
it('loads tuition rates from the semester rates endpoint', async () => {
  const rates = { academicYear: '2026-2027', source: 'https://example.org/rates', unitsPerCourse: 3, programs: [], residencies: [] }
  client.get.mockResolvedValueOnce(rates)
  await expect(getTuitionRates()).resolves.toEqual(rates)
  expect(client.get).toHaveBeenCalledWith('/semester/rates')
})
