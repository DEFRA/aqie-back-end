import { vi, describe, test, expect, beforeEach } from 'vitest'

// Mock all dependencies first
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

vi.mock('../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      const configMap = {
        ricardoApiAllDataUrl: 'https://api.example.com/data',
        ricardoApiSiteIdUrl: 'https://api.example.com/site'
      }
      return configMap[key]
    })
  }
}))

vi.mock('./helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: vi.fn()
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

// Import after mocks are set up
const { siteController } = await import('./controller.js')

describe('#siteController', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      yar: {
        get: vi.fn(),
        set: vi.fn(),
        clear: vi.fn()
      },
      query: {
        page: '1',
        latitude: '50.950300',
        longitude: '-1.356700'
      }
    }

    mockH = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis()
    }

    global.requestQuery = undefined
  })

  test('Should handle successful request with saved access token', async () => {
    const { fetchRicardoDataAll } = await import(
      './helpers/fetch-ricardo-data-all.js'
    )
    const { buildEnrichedTempData } = await import(
      './helpers/build-enriched-temp-data.js'
    )
    const { catchProxyFetchError } = await import(
      './helpers/catch-proxy-fetch-error.js'
    )

    const savedToken = 'saved-access-token'
    const mockDataAll = { member: [{ siteId: '123', siteName: 'Test Site' }] }
    const mockEnrichedData = [
      { name: 'Site 1', localSiteID: '123' },
      { name: 'Site 2', localSiteID: '456' },
      { name: 'Site 3', localSiteID: '789' }
    ]

    mockRequest.yar.get.mockReturnValue(savedToken)
    fetchRicardoDataAll.mockResolvedValue(mockDataAll)
    buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

    await siteController.handler(mockRequest, mockH)

    expect(mockRequest.yar.get).toHaveBeenCalledWith('savedAccessToken')
    expect(fetchRicardoDataAll).toHaveBeenCalledWith({
      ricardoApiAllDataUrl: 'https://api.example.com/data',
      optionsOAuthRicardo: {
        method: 'GET',
        headers: {
          Authorization: 'Bearer saved-access-token',
          'Content-Type': 'application/json'
        }
      },
      requestQuery: mockRequest.query,
      catchProxyFetchError
    })
    expect(buildEnrichedTempData).toHaveBeenCalledWith({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: savedToken,
      logger: expect.any(Object),
      catchProxyFetchError
    })
    expect(mockH.response).toHaveBeenCalledWith({
      message: 'Monitoring Stations Info for Site 1 - Site 2 - Site 3',
      measurements: mockEnrichedData
    })
    expect(mockH.code).toHaveBeenCalledWith(200)
  })

  test('Should return error when access token fetch fails', async () => {
    const { refreshOAuthToken } = await import('./helpers/oauth-helpers.js')

    mockRequest.yar.get.mockReturnValue(null)
    refreshOAuthToken.mockResolvedValue(null)

    await siteController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      error: 'Failed to fetch access token'
    })
    expect(mockH.code).toHaveBeenCalledWith(500)
  })

  test('Should handle empty enriched data with proper message', async () => {
    const { fetchRicardoDataAll } = await import(
      './helpers/fetch-ricardo-data-all.js'
    )
    const { buildEnrichedTempData } = await import(
      './helpers/build-enriched-temp-data.js'
    )

    const savedToken = 'saved-access-token'
    const mockDataAll = { member: [] }
    const mockEnrichedData = []

    mockRequest.yar.get.mockReturnValue(savedToken)
    fetchRicardoDataAll.mockResolvedValue(mockDataAll)
    buildEnrichedTempData.mockResolvedValue(mockEnrichedData)

    await siteController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith({
      message:
        'There are currently not monitoring stations for that station id.',
      measurements: mockEnrichedData
    })
    expect(mockH.code).toHaveBeenCalledWith(200)
  })
})
