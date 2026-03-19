import { vi, describe, test, expect, beforeEach } from 'vitest'

import { pollutantsScheduler } from './pollutants-scheduler.js'

const mockSchedule = vi.hoisted(() => vi.fn())
const mockLock = vi.hoisted(() => vi.fn())
const mockUnlock = vi.hoisted(() => vi.fn())
const mockFetchPollutants = vi.hoisted(() => vi.fn())
const mockSavePollutants = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))

vi.mock('node-cron', () => ({ schedule: mockSchedule }))
vi.mock('../../helpers/db/lock.js', () => ({
  lock: mockLock,
  unlock: mockUnlock
}))
vi.mock('./fetch-pollutants.js', () => ({
  fetchPollutants: mockFetchPollutants,
  savePollutants: mockSavePollutants
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('0 * * * *') }
}))

describe('pollutantsScheduler', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = { db: {} }
    mockFetchPollutants.mockResolvedValue([
      { name: 'Site A' },
      { name: 'Site B' },
      { name: 'Site A' }
    ])
    mockSavePollutants.mockResolvedValue(undefined)
    mockUnlock.mockResolvedValue(undefined)
  })

  test('plugin has correct name', () => {
    expect(pollutantsScheduler.plugin.name).toBe('Pollutants Scheduler')
  })

  test('registers a cron schedule on plugin register', async () => {
    await pollutantsScheduler.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function))
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('starting pollutants Scheduler')
    )
  })

  test('fetches, deduplicates, and saves pollutants when lock is acquired', async () => {
    mockLock.mockResolvedValue(true)
    await pollutantsScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockFetchPollutants).toHaveBeenCalled()
    // 3 measurements with 'Site A' duplicated → 2 unique
    expect(mockSavePollutants).toHaveBeenCalledWith(
      mockServer,
      expect.arrayContaining([
        expect.objectContaining({ name: 'Site A' }),
        expect.objectContaining({ name: 'Site B' })
      ])
    )
    const saved = mockSavePollutants.mock.calls[0][1]
    expect(saved).toHaveLength(2)
  })

  test('skips fetch when lock is not acquired', async () => {
    mockLock.mockResolvedValue(false)
    await pollutantsScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockFetchPollutants).not.toHaveBeenCalled()
    expect(mockUnlock).not.toHaveBeenCalled()
  })

  test('always unlocks in finally block even when fetchPollutants throws', async () => {
    mockLock.mockResolvedValue(true)
    mockFetchPollutants.mockRejectedValue(new Error('fetch error'))
    await pollutantsScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await expect(scheduledCallback()).rejects.toThrow('fetch error')

    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'pollutants')
  })
})
