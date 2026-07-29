import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aurnDataController } from './controller.js'
import { HTTP_OK } from '../pollutants/helpers/common/constants.js'

const mockToArray = vi.fn()

describe('aurnDataController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      db: {
        collection: vi.fn().mockReturnValue({
          find: vi.fn().mockReturnValue({
            toArray: mockToArray
          })
        })
      },
      logger: { info: vi.fn(), error: vi.fn() }
    }

    mockH = {
      response: vi.fn().mockReturnValue({
        code: vi.fn().mockReturnValue({
          header: vi.fn().mockReturnThis()
        })
      })
    }
  })

  it('queries the aurnMeasurements collection excluding _id', async () => {
    mockToArray.mockResolvedValue([])

    await aurnDataController.handler(mockRequest, mockH)

    expect(mockRequest.db.collection).toHaveBeenCalledWith('aurnMeasurements')
    expect(
      mockRequest.db.collection.mock.results[0].value.find
    ).toHaveBeenCalledWith({}, { projection: { _id: 0 } })
  })

  it('returns 200 with measurements and count message when cache has data', async () => {
    const measurements = [
      { localSiteID: 'UKA00012', daqiIndex: 2 },
      { localSiteID: 'UKA00651', daqiIndex: 1 }
    ]
    mockToArray.mockResolvedValue(measurements)

    await aurnDataController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message: 'AURN measurements (2 stations)',
      measurements
    })
    expect(mockH.response.mock.results[0].value.code).toHaveBeenCalledWith(
      HTTP_OK
    )
  })

  it('returns 200 with empty-cache message when no measurements in DB', async () => {
    mockToArray.mockResolvedValue([])

    await aurnDataController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message: 'No AURN measurements currently available in cache.',
      measurements: []
    })
    expect(mockH.response.mock.results[0].value.code).toHaveBeenCalledWith(
      HTTP_OK
    )
  })
})
