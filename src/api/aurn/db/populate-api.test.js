import { vi, describe, test, expect, beforeEach } from 'vitest'
import { populateAurnMeasurementsApi } from './populate-api.js'

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))
const mockFetchAurnMeasurements = vi.hoisted(() => vi.fn())

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../fetch-aurn-measurements.js', () => ({
  fetchAurnMeasurements: mockFetchAurnMeasurements
}))

describe('populateAurnMeasurementsApi', () => {
  let mockServer
  let mockBulkWrite
  let mockFind

  beforeEach(() => {
    vi.clearAllMocks()

    mockBulkWrite = vi.fn().mockResolvedValue({})
    mockFind = vi.fn().mockReturnValue({
      toArray: vi
        .fn()
        .mockResolvedValue([
          { localSiteID: 'UKA00012' },
          { localSiteID: 'UKA00651' }
        ])
    })

    mockServer = {
      db: {
        collection: vi.fn().mockReturnValue({
          find: mockFind,
          bulkWrite: mockBulkWrite
        })
      }
    }
  })

  test('reads active station IDs from monitoringStations collection', async () => {
    mockFetchAurnMeasurements.mockResolvedValue([])

    await populateAurnMeasurementsApi(mockServer)

    expect(mockServer.db.collection).toHaveBeenCalledWith('monitoringStations')
    expect(mockFind).toHaveBeenCalledWith(
      { stationStatus: 'current' },
      { projection: { _id: 0, localSiteID: 1 } }
    )
  })

  test('passes station IDs to fetchAurnMeasurements', async () => {
    mockFetchAurnMeasurements.mockResolvedValue([])

    await populateAurnMeasurementsApi(mockServer)

    expect(mockFetchAurnMeasurements).toHaveBeenCalledWith([
      'UKA00012',
      'UKA00651'
    ])
  })

  test('skips update and logs when no active stations are in the cache', async () => {
    mockFind.mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) })

    await populateAurnMeasurementsApi(mockServer)

    expect(mockFetchAurnMeasurements).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('skipping AURN update')
    )
  })

  test('skips bulkWrite and logs when fetchAurnMeasurements returns no results', async () => {
    mockFetchAurnMeasurements.mockResolvedValue([])

    await populateAurnMeasurementsApi(mockServer)

    expect(mockBulkWrite).not.toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('skipping update')
    )
  })

  test('upserts measurements into aurnMeasurements collection', async () => {
    const measurements = [
      {
        localSiteID: 'UKA00012',
        daqiIndex: 2,
        measuredAt: '2026-07-29T10:00:00+01:00',
        updatedAt: new Date()
      },
      {
        localSiteID: 'UKA00651',
        daqiIndex: 1,
        measuredAt: '2026-07-29T10:00:00+01:00',
        updatedAt: new Date()
      }
    ]
    mockFetchAurnMeasurements.mockResolvedValue(measurements)

    await populateAurnMeasurementsApi(mockServer)

    expect(mockServer.db.collection).toHaveBeenCalledWith('aurnMeasurements')
    expect(mockBulkWrite).toHaveBeenCalledWith([
      {
        replaceOne: {
          filter: { localSiteID: 'UKA00012' },
          replacement: measurements[0],
          upsert: true
        }
      },
      {
        replaceOne: {
          filter: { localSiteID: 'UKA00651' },
          replacement: measurements[1],
          upsert: true
        }
      }
    ])
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('2 stations')
    )
  })
})
