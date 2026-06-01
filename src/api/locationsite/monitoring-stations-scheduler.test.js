import { vi, describe, test, expect, beforeEach } from 'vitest'
import { monitoringStationsScheduler } from './monitoring-stations-scheduler.js'

const mockSchedule = vi.hoisted(() => vi.fn())
const mockLock = vi.hoisted(() => vi.fn())
const mockUnlock = vi.hoisted(() => vi.fn())
const mockFetchMonitoringStations = vi.hoisted(() => vi.fn())
const mockSaveMonitoringStations = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))

vi.mock('node-cron', () => ({ schedule: mockSchedule }))
vi.mock('../../helpers/db/lock.js', () => ({
  lock: mockLock,
  unlock: mockUnlock
}))
vi.mock('./fetch-monitoring-stations.js', () => ({
  fetchMonitoringStations: mockFetchMonitoringStations,
  saveMonitoringStations: mockSaveMonitoringStations
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('0 */6 * * *') }
}))

describe('monitoringStationsScheduler', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = { db: {} }
    mockFetchMonitoringStations.mockResolvedValue([
      { name: 'Station A' },
      { name: 'Station B' }
    ])
    mockSaveMonitoringStations.mockResolvedValue(undefined)
    mockUnlock.mockResolvedValue(undefined)
  })

  test('plugin has correct name', () => {
    expect(monitoringStationsScheduler.plugin.name).toBe(
      'Monitoring Stations Scheduler'
    )
  })

  test('registers a cron schedule on plugin register', async () => {
    await monitoringStationsScheduler.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledWith(
      '0 */6 * * *',
      expect.any(Function)
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('starting Monitoring Stations Scheduler')
    )
  })

  test('fetches and saves stations when lock is acquired', async () => {
    mockLock.mockResolvedValue(true)
    await monitoringStationsScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockFetchMonitoringStations).toHaveBeenCalled()
    expect(mockSaveMonitoringStations).toHaveBeenCalledWith(
      mockServer,
      expect.any(Array)
    )
    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'monitoringStations')
  })

  test('skips fetch when lock is not acquired', async () => {
    mockLock.mockResolvedValue(false)
    await monitoringStationsScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockFetchMonitoringStations).not.toHaveBeenCalled()
    expect(mockUnlock).not.toHaveBeenCalled()
  })

  test('unlocks in finally block even when fetchMonitoringStations throws', async () => {
    mockLock.mockResolvedValue(true)
    mockFetchMonitoringStations.mockRejectedValue(new Error('fetch failed'))
    await monitoringStationsScheduler.plugin.register(mockServer)

    const scheduledCallback = mockSchedule.mock.calls[0][1]
    await scheduledCallback()

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error fetching and saving monitoring stations'),
      expect.any(Error)
    )
    expect(mockUnlock).toHaveBeenCalledWith(mockServer.db, 'monitoringStations')
  })
})
