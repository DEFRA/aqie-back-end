import { vi, describe, test, expect, beforeEach } from 'vitest'

import { forecastScheduler } from './forecast-scheduler.js'

const mockSchedule = vi.hoisted(() => vi.fn())
const mockLock = vi.hoisted(() => vi.fn())
const mockUnlock = vi.hoisted(() => vi.fn())
const mockFetchForecast = vi.hoisted(() => vi.fn())
const mockSaveForecasts = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))

vi.mock('node-cron', () => ({ schedule: mockSchedule }))
vi.mock('../../helpers/db/lock.js', () => ({
  lock: mockLock,
  unlock: mockUnlock
}))
vi.mock('./fetch-forecast.js', () => ({
  fetchForecast: mockFetchForecast,
  saveForecasts: mockSaveForecasts
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('0 5 * * *') }
}))

describe('forecastScheduler', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = { db: {} }
    mockFetchForecast.mockResolvedValue([{ name: 'Site A' }])
    mockSaveForecasts.mockResolvedValue(undefined)
    mockUnlock.mockResolvedValue(undefined)
  })

  test('plugin has correct name', () => {
    expect(forecastScheduler.plugin.name).toBe('Forecast Scheduler')
  })

  test('registers a cron schedule on plugin register', async () => {
    await forecastScheduler.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledWith('0 5 * * *', expect.any(Function))
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('starting forecasts Scheduler')
    )
  })

  test('fetches and saves forecasts when lock is acquired', async () => {
    mockLock.mockResolvedValue(true)
    await forecastScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockFetchForecast).toHaveBeenCalled()
    expect(mockSaveForecasts).toHaveBeenCalledWith(
      mockServer,
      expect.any(Array)
    )
    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'forecasts')
  })

  test('skips fetch when lock is not acquired', async () => {
    mockLock.mockResolvedValue(false)
    await forecastScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockFetchForecast).not.toHaveBeenCalled()
    expect(mockUnlock).not.toHaveBeenCalled()
  })

  test('unlocks in finally block even when fetchForecast throws', async () => {
    mockLock.mockResolvedValue(true)
    mockFetchForecast.mockRejectedValue(new Error('fetch failed'))
    await forecastScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching and saving forecasts'),
      expect.any(Error)
    )
    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'forecasts')
  })
})
