import { describe, it, expect, vi, beforeEach } from 'vitest'
import { siteController } from './controller.js'
import { buildEnrichedTempData } from './helpers/build-enriched-temp-data.js'
import { fetchRicardoDataAll } from './helpers/fetch-ricardo-data-all.js'
import { refreshOAuthToken } from './helpers/oauth-helpers.js'

// Mock all dependencies
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }))
}))

vi.mock('./helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: vi.fn()
}))

vi.mock('../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'ricardoApiAllDataUrl') return 'http://mock-all-data-url'
      if (key === 'ricardoApiSiteIdUrl') return 'http://mock-site-id-url'
      return null
    })
  }
}))

vi.mock('./helpers/build-enriched-temp-data.js', () => ({
  buildEnrichedTempData: vi.fn()
}))

vi.mock('./helpers/fetch-ricardo-data-all.js', () => ({
  fetchRicardoDataAll: vi.fn()
}))

vi.mock('./helpers/oauth-helpers.js', () => ({
  refreshOAuthToken: vi.fn(),
  fetchOAuthToken: vi.fn()
}))

describe('siteController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      yar: {
        get: vi.fn()
      },
      query: {}
    }

    mockH = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }

    // Chain response().code()
    mockH.response.mockImplementation(() => ({
      code: mockH.code
    }))
  })

  describe('access token handling', () => {
    it('should use savedAccessToken from yar if available', async () => {
      mockRequest.yar.get.mockReturnValue('saved-token-123')
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(refreshOAuthToken).not.toHaveBeenCalled()
      expect(mockRequest.yar.get).toHaveBeenCalledWith('savedAccessToken')
    })

    it('should call refreshOAuthToken when no savedAccessToken in yar', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue('refreshed-token-456')
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(refreshOAuthToken).toHaveBeenCalled()
    })

    it('should return 500 error when accessToken is null', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'Failed to fetch access token'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should return 500 error when accessToken is undefined', async () => {
      mockRequest.yar.get.mockReturnValue(undefined)
      refreshOAuthToken.mockResolvedValue(undefined)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'Failed to fetch access token'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should return 500 error when accessToken is empty string', async () => {
      mockRequest.yar.get.mockReturnValue('')
      refreshOAuthToken.mockResolvedValue('')

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'Failed to fetch access token'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('should not call fetchRicardoDataAll when accessToken is null', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).not.toHaveBeenCalled()
    })

    it('should not call buildEnrichedTempData when accessToken is null', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).not.toHaveBeenCalled()
    })

    it('should use refreshed token in Authorization header when no savedAccessToken', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue('refreshed-token-789')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).toHaveBeenCalledWith(
        expect.objectContaining({
          optionsOAuthRicardo: expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer refreshed-token-789'
            })
          })
        })
      )
    })
  })

  describe('stream=data query branch', () => {
    it('should return measurements from dataAll when stream=data', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: 'data' }
      const mockDataAll = [{ id: 1 }, { id: 2 }]
      fetchRicardoDataAll.mockResolvedValue(mockDataAll)

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).not.toHaveBeenCalled()
      expect(mockH.response).toHaveBeenCalledWith({
        measurements: mockDataAll
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should return 200 with empty measurements when dataAll is empty and stream=data', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: 'data' }
      fetchRicardoDataAll.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({ measurements: [] })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should not include message property when stream=data', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: 'data' }
      fetchRicardoDataAll.mockResolvedValue([{ id: 1 }])

      await siteController.handler(mockRequest, mockH)

      const callArg = mockH.response.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('message')
    })
  })

  describe('non-stream branch (enriched data path)', () => {
    it('should return enriched data message when enrichedTempData has items', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      const mockEnrichedData = [
        { name: 'Station A' },
        { name: 'Station B' },
        { name: 'Station C' }
      ]
      buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'Monitoring Stations Info for Station A - Station B - Station C',
        measurements: mockEnrichedData
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should return not-available message when enrichedTempData is empty array', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'There are currently not monitoring stations for that station id.',
        measurements: []
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should return not-available message when enrichedTempData is null', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'There are currently not monitoring stations for that station id.',
        measurements: null
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should fill missing station names with Not Available when less than 3 items', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      const mockEnrichedData = [{ name: 'Station A' }]
      buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'Monitoring Stations Info for Station A - Not Available - Not Available',
        measurements: mockEnrichedData
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should handle 2 items and fill third with Not Available', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      const mockEnrichedData = [{ name: 'Station A' }, { name: 'Station B' }]
      buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'Monitoring Stations Info for Station A - Station B - Not Available',
        measurements: mockEnrichedData
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should handle item with no name property and fill with Not Available', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      const mockEnrichedData = [{ id: 1 }, { name: 'Station B' }, { id: 3 }]
      buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'Monitoring Stations Info for Not Available - Station B - Not Available',
        measurements: mockEnrichedData
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should call buildEnrichedTempData with correct parameters', async () => {
      mockRequest.yar.get.mockReturnValue('my-token')
      mockRequest.query = { site: '123' }
      const mockDataAll = [{ data: true }]
      fetchRicardoDataAll.mockResolvedValue(mockDataAll)
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).toHaveBeenCalledWith(
        expect.objectContaining({
          dataAll: mockDataAll,
          ricardoApiSiteIdUrl: 'http://mock-site-id-url',
          accessToken: 'my-token'
        })
      )
    })

    it('should call fetchRicardoDataAll with correct parameters', async () => {
      mockRequest.yar.get.mockReturnValue('my-token')
      mockRequest.query = { site: '456' }
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).toHaveBeenCalledWith(
        expect.objectContaining({
          ricardoApiAllDataUrl: 'http://mock-all-data-url',
          requestQuery: mockRequest.query
        })
      )
    })

    it('should set global.requestQuery from request.query', async () => {
      mockRequest.yar.get.mockReturnValue('token')
      const queryObj = { site: '789' }
      mockRequest.query = queryObj
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(global.requestQuery).toBe(queryObj)
    })

    it('should only use first 3 items for message even when more than 3 exist', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      const mockEnrichedData = [
        { name: 'Station A' },
        { name: 'Station B' },
        { name: 'Station C' },
        { name: 'Station D' },
        { name: 'Station E' }
      ]
      buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message:
          'Monitoring Stations Info for Station A - Station B - Station C',
        measurements: mockEnrichedData
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should include all measurements even when more than 3 in response', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      const mockEnrichedData = [
        { name: 'Station A' },
        { name: 'Station B' },
        { name: 'Station C' },
        { name: 'Station D' }
      ]
      buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

      await siteController.handler(mockRequest, mockH)

      const callArg = mockH.response.mock.calls[0][0]
      expect(callArg.measurements).toHaveLength(4)
    })
  })

  describe('stream query edge cases', () => {
    it('should go to enriched path when stream is not "data"', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: 'other' }
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).toHaveBeenCalled()
    })

    it('should go to enriched path when query is empty object', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([{ name: 'X' }])

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).toHaveBeenCalled()
    })

    it('should go to enriched path when stream key is absent', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { someOtherKey: 'value' }
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).toHaveBeenCalled()
    })

    it('should go to enriched path when stream is undefined', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: undefined }
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).toHaveBeenCalled()
    })

    it('should go to stream path when stream equals exactly "data"', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: 'data' }
      const mockDataAll = [{ id: 99 }]
      fetchRicardoDataAll.mockResolvedValue(mockDataAll)

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).not.toHaveBeenCalled()
      expect(mockH.response).toHaveBeenCalledWith({ measurements: mockDataAll })
    })

    it('should go to enriched path when stream is "DATA" (case sensitive check)', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      mockRequest.query = { stream: 'DATA' }
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(buildEnrichedTempData).toHaveBeenCalled()
    })
  })

  describe('OAuth options setup', () => {
    it('should pass Bearer token in Authorization header to fetchRicardoDataAll', async () => {
      mockRequest.yar.get.mockReturnValue('bearer-token-xyz')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).toHaveBeenCalledWith(
        expect.objectContaining({
          optionsOAuthRicardo: expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
              Authorization: 'Bearer bearer-token-xyz',
              'Content-Type': 'application/json'
            })
          })
        })
      )
    })

    it('should always use GET method in OAuth options', async () => {
      mockRequest.yar.get.mockReturnValue('some-token')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).toHaveBeenCalledWith(
        expect.objectContaining({
          optionsOAuthRicardo: expect.objectContaining({
            method: 'GET'
          })
        })
      )
    })

    it('should always set Content-Type to application/json', async () => {
      mockRequest.yar.get.mockReturnValue('some-token')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).toHaveBeenCalledWith(
        expect.objectContaining({
          optionsOAuthRicardo: expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        })
      )
    })
  })

  describe('response code verification', () => {
    it('should always return 200 on success for enriched path', async () => {
      mockRequest.yar.get.mockReturnValue('token')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([{ name: 'Station A' }])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should always return 200 on success for stream path', async () => {
      mockRequest.yar.get.mockReturnValue('token')
      mockRequest.query = { stream: 'data' }
      fetchRicardoDataAll.mockResolvedValue([{ id: 1 }])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('should call h.response exactly once on success', async () => {
      mockRequest.yar.get.mockReturnValue('token')
      mockRequest.query = {}
      fetchRicardoDataAll.mockResolvedValue([])
      buildEnrichedTempData.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledTimes(1)
    })

    it('should call h.response exactly once on 500 error', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledTimes(1)
    })
  })
})
