import { describe, it, expect, vi, beforeEach } from 'vitest'
import { siteController } from './controller.js'
import { fetchRicardoDataAll } from './helpers/fetch-ricardo-data-all.js'
import { refreshOAuthToken } from './helpers/oauth-helpers.js'
import { getMonitoringStations } from './helpers/get-monitoring-stations.js'

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
      return null
    })
  }
}))

vi.mock('./helpers/get-monitoring-stations.js', () => ({
  getMonitoringStations: vi.fn()
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
      yar: { get: vi.fn() },
      query: {},
      db: {}
    }

    mockH = {
      response: vi.fn().mockImplementation(() => ({
        code: mockH.code
      })),
      code: vi.fn().mockReturnThis()
    }
  })

  // ─── Default (cached) path ──────────────────────────────────────────────────

  describe('cached path (no stream=data)', () => {
    it('reads stations from MongoDB via getMonitoringStations', async () => {
      getMonitoringStations.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(getMonitoringStations).toHaveBeenCalledWith(mockRequest.db)
    })

    it('returns 200 with stations array and count message when cache has data', async () => {
      const mockStations = [{ name: 'Station A' }, { name: 'Station B' }]
      getMonitoringStations.mockResolvedValue(mockStations)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message: 'Monitoring Stations Info (2 stations)',
        stations: mockStations
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('returns 200 with empty-cache message when no stations in DB', async () => {
      getMonitoringStations.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        message: 'No monitoring stations currently available in cache.',
        stations: []
      })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('does NOT call OAuth or Ricardo when serving from cache', async () => {
      getMonitoringStations.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(refreshOAuthToken).not.toHaveBeenCalled()
      expect(fetchRicardoDataAll).not.toHaveBeenCalled()
      expect(mockRequest.yar.get).not.toHaveBeenCalled()
    })

    it('uses the cached path when stream is not "data"', async () => {
      mockRequest.query = { stream: 'other' }
      getMonitoringStations.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(getMonitoringStations).toHaveBeenCalled()
      expect(fetchRicardoDataAll).not.toHaveBeenCalled()
    })

    it('uses the cached path when stream is "DATA" (case-sensitive check)', async () => {
      mockRequest.query = { stream: 'DATA' }
      getMonitoringStations.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(getMonitoringStations).toHaveBeenCalled()
    })

    it('uses the cached path when stream key is absent', async () => {
      mockRequest.query = { someOtherKey: 'value' }
      getMonitoringStations.mockResolvedValue([{ name: 'X' }])

      await siteController.handler(mockRequest, mockH)

      expect(getMonitoringStations).toHaveBeenCalled()
    })

    it('calls h.response exactly once', async () => {
      getMonitoringStations.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledTimes(1)
    })
  })

  // ─── stream=data path (live Ricardo pass-through) ───────────────────────────

  describe('stream=data path (live Ricardo pass-through)', () => {
    beforeEach(() => {
      mockRequest.query = { stream: 'data' }
    })

    it('does NOT call getMonitoringStations', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      fetchRicardoDataAll.mockResolvedValue([{ id: 1 }])

      await siteController.handler(mockRequest, mockH)

      expect(getMonitoringStations).not.toHaveBeenCalled()
    })

    it('uses savedAccessToken from yar when available', async () => {
      mockRequest.yar.get.mockReturnValue('saved-token-123')
      fetchRicardoDataAll.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(refreshOAuthToken).not.toHaveBeenCalled()
      expect(mockRequest.yar.get).toHaveBeenCalledWith('savedAccessToken')
    })

    it('calls refreshOAuthToken when no savedAccessToken in yar', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue('refreshed-token-456')
      fetchRicardoDataAll.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(refreshOAuthToken).toHaveBeenCalled()
    })

    it('returns 500 when accessToken is null', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'Failed to fetch access token'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('returns 500 when accessToken is empty string', async () => {
      mockRequest.yar.get.mockReturnValue('')
      refreshOAuthToken.mockResolvedValue('')

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({
        error: 'Failed to fetch access token'
      })
      expect(mockH.code).toHaveBeenCalledWith(500)
    })

    it('does not call fetchRicardoDataAll when accessToken is null', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).not.toHaveBeenCalled()
    })

    it('returns { measurements: dataAll } with 200 on success', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      const mockDataAll = [{ id: 1 }, { id: 2 }]
      fetchRicardoDataAll.mockResolvedValue(mockDataAll)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({ measurements: mockDataAll })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('response does not include a message property', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      fetchRicardoDataAll.mockResolvedValue([{ id: 1 }])

      await siteController.handler(mockRequest, mockH)

      const callArg = mockH.response.mock.calls[0][0]
      expect(callArg).not.toHaveProperty('message')
    })

    it('passes the Bearer token in the Authorization header to fetchRicardoDataAll', async () => {
      mockRequest.yar.get.mockReturnValue('bearer-token-xyz')
      fetchRicardoDataAll.mockResolvedValue([])

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

    it('passes ricardoApiAllDataUrl and requestQuery to fetchRicardoDataAll', async () => {
      mockRequest.yar.get.mockReturnValue('token')
      mockRequest.query = { stream: 'data', page: '2' }
      fetchRicardoDataAll.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(fetchRicardoDataAll).toHaveBeenCalledWith(
        expect.objectContaining({
          ricardoApiAllDataUrl: 'http://mock-all-data-url',
          requestQuery: mockRequest.query
        })
      )
    })

    it('returns 200 with empty measurements when dataAll is empty', async () => {
      mockRequest.yar.get.mockReturnValue('token-abc')
      fetchRicardoDataAll.mockResolvedValue([])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledWith({ measurements: [] })
      expect(mockH.code).toHaveBeenCalledWith(200)
    })

    it('calls h.response exactly once on success', async () => {
      mockRequest.yar.get.mockReturnValue('token')
      fetchRicardoDataAll.mockResolvedValue([{ id: 1 }])

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledTimes(1)
    })

    it('calls h.response exactly once on 500 error', async () => {
      mockRequest.yar.get.mockReturnValue(null)
      refreshOAuthToken.mockResolvedValue(null)

      await siteController.handler(mockRequest, mockH)

      expect(mockH.response).toHaveBeenCalledTimes(1)
    })
  })
})

