import { vi, describe, test, expect, beforeEach } from 'vitest'
import { buildEnrichedTempData } from './build-enriched-temp-data.js'

// Mock dependencies
vi.mock('./pollutant-helpers.js', () => ({
  enrichSitesWithPollutants: vi.fn()
}))

describe('#build-enriched-temp-data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock global.requestQuery
    global.requestQuery = undefined
  })

  test('Should handle empty dataAll', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    const mockDataAll = { member: [] }
    const mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }

    enrichSitesWithPollutants.mockResolvedValue([])

    const result = await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'test-token',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    expect(result).toEqual([])
    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      [],
      'https://api.example.com/site',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      }),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} 00:00:00$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} 23:59:00$/),
      mockLogger,
      expect.any(Function)
    )
  })

  test('Should process dataAll with member data', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    const mockDataAll = {
      member: [
        {
          siteName: 'Test Site 1',
          governmentRegion: 'South East',
          siteId: '123',
          siteType: 'Urban',
          areaType: 'Background',
          latitude: 50.123,
          longitude: -1.456,
          distanceFromPoint: 5.2
        },
        {
          siteName: 'Test Site 2',
          governmentRegion: 'London',
          siteId: '456',
          siteType: 'Roadside',
          areaType: 'Traffic',
          latitude: 51.789,
          longitude: -0.123,
          distanceFromPoint: 2.1
        }
      ]
    }

    const mockEnrichedData = [
      {
        name: 'Test Site 1',
        area: 'South East',
        localSiteID: '123',
        areaType: 'Urban Background',
        location: { type: 'Point', coordinates: [50.123, -1.456] },
        distance: 5.2,
        pollutants: []
      }
    ]

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }

    enrichSitesWithPollutants.mockResolvedValue(mockEnrichedData)

    const result = await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'test-token',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    expect(result).toEqual(mockEnrichedData)

    // Verify tempData structure passed to enrichSitesWithPollutants
    const expectedTempData = [
      {
        name: 'Test Site 1',
        area: 'South East',
        localSiteID: '123',
        areaType: 'Urban Background',
        location: { type: 'Point', coordinates: [50.123, -1.456] },
        distance: 5.2
      },
      {
        name: 'Test Site 2',
        area: 'London',
        localSiteID: '456',
        areaType: 'Roadside Traffic',
        location: { type: 'Point', coordinates: [51.789, -0.123] },
        distance: 2.1
      }
    ]

    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      expectedTempData,
      'https://api.example.com/site',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      }),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} 00:00:00$/),
      expect.stringMatching(/^\d{4}-\d{2}-\d{2} 23:59:00$/),
      mockLogger,
      expect.any(Function)
    )

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('tempData:')
    )
  })

  test('Should handle global.requestQuery.totalItems limit', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    // Set global.requestQuery with totalItems
    global.requestQuery = { totalItems: 1 }

    const mockDataAll = {
      member: [
        {
          siteName: 'Site 1',
          governmentRegion: 'Region 1',
          siteId: '1',
          siteType: 'Urban',
          areaType: 'Background',
          latitude: 50.1,
          longitude: -1.1,
          distanceFromPoint: 1.0
        },
        {
          siteName: 'Site 2',
          governmentRegion: 'Region 2',
          siteId: '2',
          siteType: 'Rural',
          areaType: 'Background',
          latitude: 50.2,
          longitude: -1.2,
          distanceFromPoint: 2.0
        }
      ]
    }

    const mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }

    enrichSitesWithPollutants.mockResolvedValue([])

    await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'test-token',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    // Should only process the first item due to totalItems: 1
    const expectedTempData = [
      {
        name: 'Site 1',
        area: 'Region 1',
        localSiteID: '1',
        areaType: 'Urban Background',
        location: { type: 'Point', coordinates: [50.1, -1.1] },
        distance: 1.0
      }
    ]

    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      expectedTempData,
      expect.any(String),
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    )
  })

  test('Should handle null/undefined totalItems in global.requestQuery', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    // Set global.requestQuery with null totalItems
    global.requestQuery = { totalItems: null }

    const mockDataAll = {
      member: [
        {
          siteName: 'Site 1',
          siteId: '1',
          siteType: 'Urban',
          areaType: 'Background',
          latitude: 50.1,
          longitude: -1.1
        }
      ]
    }

    const mockLogger = { info: vi.fn(), error: vi.fn() }
    enrichSitesWithPollutants.mockResolvedValue([])

    await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'test-token',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    // Should process all items when totalItems is null
    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ localSiteID: '1' })]),
      expect.any(String),
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    )
  })

  test('Should generate correct date-time strings for current date', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    const mockDataAll = { member: [] }
    const mockLogger = { info: vi.fn(), error: vi.fn() }
    enrichSitesWithPollutants.mockResolvedValue([])

    // Mock Date to return a specific date
    const mockDate = new Date('2025-08-11T12:30:45Z')
    vi.spyOn(global, 'Date').mockImplementation(() => mockDate)

    await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'test-token',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      [],
      'https://api.example.com/site',
      expect.any(Object),
      '2025-08-11 00:00:00',
      '2025-08-11 23:59:00',
      mockLogger,
      expect.any(Function)
    )

    global.Date.mockRestore()
  })

  test('Should handle missing properties in member data gracefully', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    const mockDataAll = {
      member: [
        {
          siteName: 'Incomplete Site',
          siteId: '999'
          // Missing some properties
        }
      ]
    }

    const mockLogger = { info: vi.fn(), error: vi.fn() }
    enrichSitesWithPollutants.mockResolvedValue([])

    await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'test-token',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    const expectedTempData = [
      {
        name: 'Incomplete Site',
        area: undefined,
        localSiteID: '999',
        areaType: 'undefined undefined',
        location: { type: 'Point', coordinates: [undefined, undefined] },
        distance: undefined
      }
    ]

    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      expectedTempData,
      expect.any(String),
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    )
  })

  test('Should pass correct authorization headers', async () => {
    const { enrichSitesWithPollutants } = await vi.importMock(
      './pollutant-helpers.js'
    )

    const mockDataAll = { member: [] }
    const mockLogger = { info: vi.fn(), error: vi.fn() }
    enrichSitesWithPollutants.mockResolvedValue([])

    await buildEnrichedTempData({
      dataAll: mockDataAll,
      ricardoApiSiteIdUrl: 'https://api.example.com/site',
      accessToken: 'custom-access-token-123',
      logger: mockLogger,
      catchProxyFetchError: vi.fn()
    })

    expect(enrichSitesWithPollutants).toHaveBeenCalledWith(
      [],
      'https://api.example.com/site',
      {
        method: 'GET',
        headers: {
          Authorization: 'Bearer custom-access-token-123',
          'Content-Type': 'application/json'
        }
      },
      expect.any(String),
      expect.any(String),
      mockLogger,
      expect.any(Function)
    )
  })
})
