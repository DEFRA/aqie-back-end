import { vi, describe, test, expect, beforeEach } from 'vitest'
import { aurnScheduler } from './aurn-scheduler.js'

const mockSchedule = vi.hoisted(() => vi.fn())
const mockLock = vi.hoisted(() => vi.fn())
const mockUnlock = vi.hoisted(() => vi.fn())
const mockPopulateAurnMeasurementsApi = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))

vi.mock('node-cron', () => ({ schedule: mockSchedule }))
vi.mock('../../helpers/db/lock.js', () => ({
  lock: mockLock,
  unlock: mockUnlock
}))
vi.mock('./db/populate-api.js', () => ({
  populateAurnMeasurementsApi: mockPopulateAurnMeasurementsApi
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('*/30 * * * *') }
}))

describe('aurnScheduler', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = { db: {} }
    mockPopulateAurnMeasurementsApi.mockResolvedValue(undefined)
    mockUnlock.mockResolvedValue(undefined)
  })

  test('plugin has correct name', () => {
    expect(aurnScheduler.plugin.name).toBe('AURN Measurements Scheduler')
  })

  test('registers a cron schedule on plugin register', async () => {
    await aurnScheduler.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledWith(
      '*/30 * * * *',
      expect.any(Function)
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Starting AURN Measurements Scheduler')
    )
  })

  test('acquires lock and calls populateAurnMeasurementsApi when lock is available', async () => {
    mockLock.mockResolvedValue(true)
    await aurnScheduler.plugin.register(mockServer)

    const scheduledFn = mockSchedule.mock.calls[0][1]
    await scheduledFn()

    expect(mockLock).toHaveBeenCalledWith(mockServer.db, 'aurnMeasurements')
    expect(mockPopulateAurnMeasurementsApi).toHaveBeenCalledWith(mockServer)
    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'aurnMeasurements')
  })

  test('skips populate when lock is already held', async () => {
    mockLock.mockResolvedValue(false)
    await aurnScheduler.plugin.register(mockServer)

    const scheduledFn = mockSchedule.mock.calls[0][1]
    await scheduledFn()

    expect(mockPopulateAurnMeasurementsApi).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('lock already held')
    )
  })

  test('releases lock even when populate throws', async () => {
    mockLock.mockResolvedValue(true)
    mockPopulateAurnMeasurementsApi.mockRejectedValue(new Error('fetch failed'))

    await aurnScheduler.plugin.register(mockServer)
    const scheduledFn = mockSchedule.mock.calls[0][1]
    await scheduledFn()

    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'aurnMeasurements')
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error fetching and saving AURN measurements',
      expect.any(Error)
    )
  })
})
