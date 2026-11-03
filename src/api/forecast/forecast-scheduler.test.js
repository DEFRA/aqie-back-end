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
    mockServer = { db: {}, events: { once: vi.fn() } }
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

  test('does not fetch forecasts while registering, so the server can start listening', async () => {
    mockLock.mockResolvedValue(true)

    await forecastScheduler.plugin.register(mockServer)

    expect(mockServer.events.once).toHaveBeenCalledWith(
      'start',
      expect.any(Function)
    )
    expect(mockLock).not.toHaveBeenCalled()
    expect(mockFetchForecast).not.toHaveBeenCalled()
  })

  test('fetches and saves forecasts once the server has started', async () => {
    mockLock.mockResolvedValue(true)
    await forecastScheduler.plugin.register(mockServer)

    const onStart = mockServer.events.once.mock.calls[0][1]
    onStart()

    await vi.waitFor(() =>
      expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'forecasts')
    )
    expect(mockFetchForecast).toHaveBeenCalled()
    expect(mockSaveForecasts).toHaveBeenCalledWith(
      mockServer,
      expect.any(Array)
    )
  })

  test('logs instead of leaving an unhandled rejection when the initial fetch fails', async () => {
    const error = new Error('db down')
    mockLock.mockRejectedValue(error)
    await forecastScheduler.plugin.register(mockServer)

    const onStart = mockServer.events.once.mock.calls[0][1]
    onStart()

    await vi.waitFor(() =>
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error running initial forecasts fetch',
        error
      )
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
