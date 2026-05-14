import { vi, describe, test, expect, beforeEach } from 'vitest'
import { populateMonitoringStationsApi } from './populate-api.js'

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))
const mockFetchMonitoringStations = vi.hoisted(() => vi.fn())
const mockSaveMonitoringStations = vi.hoisted(() => vi.fn())

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../fetch-monitoring-stations.js', () => ({
  fetchMonitoringStations: mockFetchMonitoringStations,
  saveMonitoringStations: mockSaveMonitoringStations
}))

describe('populateMonitoringStationsApi', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = {
      db: {
        collection: vi.fn().mockReturnValue({
          deleteMany: vi.fn().mockResolvedValue({})
        })
      }
    }
    mockSaveMonitoringStations.mockResolvedValue(undefined)
  })

  test('deletes existing records and saves fetched stations when stations returned', async () => {
    const stations = [{ name: 'Station A' }, { name: 'Station B' }]
    mockFetchMonitoringStations.mockResolvedValue(stations)

    await populateMonitoringStationsApi(mockServer)

    expect(mockServer.db.collection).toHaveBeenCalledWith('monitoringStations')
    expect(
      mockServer.db.collection.mock.results[0].value.deleteMany
    ).toHaveBeenCalledWith({})
    expect(mockSaveMonitoringStations).toHaveBeenCalledWith(
      mockServer,
      stations
    )
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Updated 2 monitoring stations'
    )
  })

  test('skips delete and save when fetch returns empty array', async () => {
    mockFetchMonitoringStations.mockResolvedValue([])

    await populateMonitoringStationsApi(mockServer)

    expect(mockServer.db.collection).not.toHaveBeenCalled()
    expect(mockSaveMonitoringStations).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('skipping update')
    )
  })

  test('logs error when fetchMonitoringStations throws', async () => {
    mockFetchMonitoringStations.mockRejectedValue(new Error('Ricardo down'))

    await populateMonitoringStationsApi(mockServer)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error))
    expect(mockSaveMonitoringStations).not.toHaveBeenCalled()
  })
})
