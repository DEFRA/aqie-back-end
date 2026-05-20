import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cachedStationsController } from './cached-stations-controller.js'
import { getMonitoringStations } from './helpers/get-monitoring-stations.js'
import { HTTP_OK } from '../pollutants/helpers/common/constants.js'

vi.mock('./helpers/get-monitoring-stations.js', () => ({
  getMonitoringStations: vi.fn()
}))

describe('cachedStationsController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      db: {}
    }

    mockH = {
      response: vi.fn().mockImplementation(() => ({
        code: mockH.code
      })),
      code: vi.fn().mockReturnThis()
    }
  })

  it('reads stations from MongoDB via getMonitoringStations', async () => {
    getMonitoringStations.mockResolvedValue([])

    await cachedStationsController.handler(mockRequest, mockH)

    expect(getMonitoringStations).toHaveBeenCalledWith(mockRequest.db)
  })

  it('returns 200 with stations array and count message when cache has data', async () => {
    const mockStations = [{ name: 'Station A' }, { name: 'Station B' }]
    getMonitoringStations.mockResolvedValue(mockStations)

    await cachedStationsController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message: 'Monitoring Stations Info (2 stations)',
      stations: mockStations
    })
    expect(mockH.code).toHaveBeenCalledWith(HTTP_OK)
  })

  it('returns 200 with empty-cache message when no stations in DB', async () => {
    getMonitoringStations.mockResolvedValue([])

    await cachedStationsController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message: 'No monitoring stations currently available in cache.',
      stations: []
    })
    expect(mockH.code).toHaveBeenCalledWith(HTTP_OK)
  })

  it('calls h.response exactly once', async () => {
    getMonitoringStations.mockResolvedValue([])

    await cachedStationsController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledTimes(1)
  })
})
