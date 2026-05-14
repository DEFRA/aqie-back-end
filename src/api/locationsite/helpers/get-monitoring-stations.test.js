import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMonitoringStations } from './get-monitoring-stations.js'

describe('getMonitoringStations', () => {
  let mockDb

  beforeEach(() => {
    mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({
          toArray: vi.fn()
        })
      })
    }
  })

  it('queries the monitoringStations collection excluding _id', async () => {
    mockDb.collection().find().toArray.mockResolvedValue([])

    await getMonitoringStations(mockDb)

    expect(mockDb.collection).toHaveBeenCalledWith('monitoringStations')
    expect(mockDb.collection().find).toHaveBeenCalledWith(
      {},
      { projection: { _id: 0 } }
    )
  })

  it('returns an array of station documents', async () => {
    const stations = [
      { name: 'Station A', area: 'North West' },
      { name: 'Station B', area: 'South East' }
    ]
    mockDb.collection().find().toArray.mockResolvedValue(stations)

    const result = await getMonitoringStations(mockDb)

    expect(result).toEqual(stations)
  })

  it('returns an empty array when no stations are in the collection', async () => {
    mockDb.collection().find().toArray.mockResolvedValue([])

    const result = await getMonitoringStations(mockDb)

    expect(result).toEqual([])
  })
})
