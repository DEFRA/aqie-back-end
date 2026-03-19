import { vi, describe, test, expect, beforeEach } from 'vitest'
import {
  enrichSitesWithPollutants,
  extractPollutants,
  normalizePollutantName,
  pollutantNames
} from './pollutant-helpers.js'
import { config } from '../../../config/index.js'

const mockRandomInt = vi.hoisted(() => vi.fn())

vi.mock('node:crypto', () => ({ randomInt: mockRandomInt }))

// Mock the logger before importing the module
vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  })
}))

// Mock the config module
vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn().mockReturnValue(false) // Default to no mocking
  }
}))

describe('#pollutant-helpers', () => {
  describe('#pollutantNames', () => {
    test('Should export pollutant names array', () => {
      expect(pollutantNames).toBeDefined()
      expect(Array.isArray(pollutantNames)).toBe(true)
      expect(pollutantNames).toContain('Nitrogen dioxide')
      expect(pollutantNames).toContain('PM10')
      expect(pollutantNames).toContain('PM2.5')
      expect(pollutantNames).toContain('Ozone')
      expect(pollutantNames).toContain('Sulphur dioxide')
    })
  })

  describe('#normalizePollutantName', () => {
    test('Should normalize pollutant names by removing spaces and converting to lowercase', () => {
      expect(normalizePollutantName('Nitrogen dioxide')).toBe('nitrogendioxide')
      expect(normalizePollutantName('PM10 particulate matter')).toBe(
        'pm10particulatematter'
      )
      expect(normalizePollutantName('PM2.5 particulate matter')).toBe(
        'pm2.5particulatematter'
      )
      expect(normalizePollutantName('Ozone')).toBe('ozone')
      expect(normalizePollutantName('Sulphur dioxide')).toBe('sulphurdioxide')
    })

    test('Should handle empty and undefined inputs', () => {
      // The function doesn't handle null/undefined gracefully, so we expect errors
      expect(() => normalizePollutantName('')).not.toThrow()
      expect(normalizePollutantName('')).toBe('')
      expect(() => normalizePollutantName(undefined)).toThrow()
      expect(() => normalizePollutantName(null)).toThrow()
    })

    test('Should handle special characters and numbers', () => {
      expect(normalizePollutantName('PM2.5 Test-Value_123')).toBe(
        'pm2.5test-value_123'
      )
      expect(normalizePollutantName('  Extra  Spaces  ')).toBe('extraspaces')
    })
  })

  describe('#extractPollutants', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('Should return undefined for null or undefined siteData', () => {
      expect(extractPollutants(null)).toBeUndefined()
      expect(extractPollutants(undefined)).toBeUndefined()
      expect(extractPollutants({})).toBeUndefined()
    })

    test('Should return undefined for siteData without member array', () => {
      expect(extractPollutants({ member: null })).toBeUndefined()
      expect(extractPollutants({ member: 'not an array' })).toBeUndefined()
      expect(extractPollutants({ member: [] })).toBeUndefined()
    })

    test('Should extract valid pollutants from member data', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.67,
            endDateTime: '2025-01-01T10:00:00Z'
          },
          {
            pollutantName: 'PM10 particulate matter',
            unit: 'microgrammes per cubic metre',
            value: 18.34,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2).toBeDefined()
      expect(result.NO2.value).toBe(25.67)
      expect(result.NO2.unit).toBe('μg/m3')
      expect(result.PM10).toBeDefined()
      expect(result.PM10.value).toBe(18.34)
      expect(result.PM10.unit).toBe('μg/m3')
    })

    test('Should filter out invalid pollutant values', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: -9999, // Invalid value
            endDateTime: '2025-01-01T10:00:00Z'
          },
          {
            pollutantName: 'PM10 particulate matter',
            unit: 'microgrammes per cubic metre',
            value: 25.5, // Valid value
            endDateTime: '2025-01-01T10:00:00Z'
          },
          {
            pollutantName: 'Ozone',
            unit: 'microgrammes per cubic metre',
            value: 0, // Invalid value
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2).toBeUndefined() // Filtered out
      expect(result.PM10).toBeDefined() // Valid
      expect(result.PM10.value).toBe(25.5)
      expect(result.O3).toBeUndefined() // Filtered out
    })

    test('Should handle missing pollutant properties', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            // Missing unit and value
            endDateTime: '2025-01-01T10:00:00Z'
          },
          {
            // Missing pollutantName
            unit: 'microgrammes per cubic metre',
            value: 25.5,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      const result = extractPollutants(siteData)

      // The function may still return data for entries with undefined values
      // since it processes them through buildPollutantData
      expect(result).toBeDefined()
      if (result?.NO2) {
        expect(result.NO2.value).toBeUndefined() // No valid value
        expect(result.NO2.unit).toBe('NA') // Default unit
      }
    })

    test('Should round pollutant values to 2 decimal places', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.6789, // Should be rounded to 25.68
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(25.68)
    })

    test('Should select most recent pollutant when multiple exist', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 20.0,
            endDateTime: '2025-01-01T09:00:00Z' // Earlier time
          },
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.0,
            endDateTime: '2025-01-01T10:00:00Z' // Later time - should be selected
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(25.0) // Should use the more recent value
    })

    describe('Mocking functionality in buildPollutantData', () => {
      beforeEach(() => {
        config.get.mockReturnValue(true)
        mockRandomInt.mockReset()
      })

      afterEach(() => {
        config.get.mockReturnValue(false)
      })

      test('Should mock pollutant values when mockInvalidPollutants is enabled and shouldMock is true', () => {
        // randomInt(0,100) returns 50 (<90) → triggers mock; randomInt(0,5) returns 0 → index 0 = -9999
        mockRandomInt.mockReturnValueOnce(50).mockReturnValueOnce(0)

        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2025-01-01T10:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        // When mocking is enabled and shouldMock=true, value should be -9999
        // and the pollutant should be filtered out
        expect(result).toBeUndefined() // All pollutants filtered out due to -9999
      })

      test('Should not mock pollutant values when mockInvalidPollutants is enabled but shouldMock is false', () => {
        // randomInt(0,100) returns a value >= 90 → does NOT trigger mocking
        mockRandomInt.mockReturnValue(90)

        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2025-01-01T10:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        // When mocking is enabled but shouldMock=false, original value should be kept
        expect(result).toBeDefined()
        expect(result.NO2.value).toBe(25.67) // Original value preserved
      })

      test('Should handle different invalid mock values', () => {
        // Test all possible invalid values
        const invalidValues = [-9999, -99, null, '0', 0]

        for (let i = 0; i < invalidValues.length; i++) {
          // randomInt(0,100)=50 triggers mock; randomInt(0,5)=i selects invalid value
          mockRandomInt.mockReset()
          mockRandomInt.mockReturnValueOnce(50).mockReturnValueOnce(i)

          const siteData = {
            member: [
              {
                pollutantName: 'Nitrogen dioxide',
                unit: 'microgrammes per cubic metre',
                value: 25.67,
                endDateTime: '2025-01-01T10:00:00Z'
              }
            ]
          }

          const result = extractPollutants(siteData)

          // All invalid values should cause pollutants to be filtered out
          expect(result).toBeUndefined()
        }
      })
    })

    test('Should not mock when mockInvalidPollutants is disabled', () => {
      // Ensure mocking is disabled
      config.get.mockReturnValue(false)

      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.67,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(25.67) // Original value should be preserved
    })
  })

  describe('#enrichSitesWithPollutants', () => {
    let mockLogger
    let mockCatchProxyFetchError

    beforeEach(() => {
      vi.clearAllMocks()
      mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      }
      mockCatchProxyFetchError = vi.fn()
    })

    test('Should handle empty sites array', async () => {
      const result = await enrichSitesWithPollutants(
        [],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toEqual([])
      expect(mockCatchProxyFetchError).not.toHaveBeenCalled()
    })

    test('Should handle site with no pollutant data', async () => {
      const mockSite = {
        name: 'Empty Site',
        localSiteID: '999',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      const mockEmptyResponse = { member: [] }
      mockCatchProxyFetchError.mockResolvedValue([200, mockEmptyResponse])

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      // Sites with no pollutants get filtered out
      expect(result).toHaveLength(0)
    })

    test('Should successfully enrich site with valid pollutant data', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      const mockPollutantResponse = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.67,
            endDateTime: '2025-01-01T10:00:00Z'
          },
          {
            pollutantName: 'PM10 particulate matter',
            unit: 'microgrammes per cubic metre',
            value: 18.34,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }
      mockCatchProxyFetchError.mockResolvedValue([200, mockPollutantResponse])

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        name: 'Test Site',
        localSiteID: 'TEST001',
        pollutants: {
          NO2: {
            value: 25.67,
            unit: 'μg/m3'
          },
          PM10: {
            value: 18.34,
            unit: 'μg/m3'
          }
        }
      })
      expect(mockCatchProxyFetchError).toHaveBeenCalledTimes(1)
    })

    test('Should handle API error responses', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      mockCatchProxyFetchError.mockResolvedValue([500, null])

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(0) // Site filtered out due to no pollutants
      // The function doesn't explicitly log errors for non-200 responses
      // It just gets null data and handles it gracefully
    })

    test('Should handle sites with invalid pollutant values', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      const mockInvalidResponse = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: -9999, // Invalid value
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }
      mockCatchProxyFetchError.mockResolvedValue([200, mockInvalidResponse])

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(0) // Site filtered out due to no valid pollutants
    })

    test('Should round pollutant values to 2 decimal places', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      const mockPollutantResponse = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.6789, // Should be rounded to 25.68
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }
      mockCatchProxyFetchError.mockResolvedValue([200, mockPollutantResponse])

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result[0].pollutants.NO2.value).toBe(25.68)
    })

    test('Should handle multiple sites with mixed results', async () => {
      const mockSites = [
        {
          name: 'Site 1',
          localSiteID: 'TEST001',
          area: 'Test Area',
          areaType: 'Urban',
          location: { type: 'Point', coordinates: [50.0, -1.0] },
          distance: 0.5
        },
        {
          name: 'Site 2',
          localSiteID: 'TEST002',
          area: 'Test Area',
          areaType: 'Urban',
          location: { type: 'Point', coordinates: [50.1, -1.1] },
          distance: 1.0
        }
      ]

      const mockValidResponse = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.67,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }
      const mockEmptyResponse = { member: [] }

      mockCatchProxyFetchError
        .mockResolvedValueOnce([200, mockValidResponse]) // First site has data
        .mockResolvedValueOnce([200, mockEmptyResponse]) // Second site has no data

      const result = await enrichSitesWithPollutants(
        mockSites,
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(1) // Only first site has valid data
      expect(result[0].name).toBe('Site 1')
      expect(result[0].pollutants.NO2.value).toBe(25.67)
      expect(mockCatchProxyFetchError).toHaveBeenCalledTimes(2)
    })

    test('Should handle fetch errors gracefully', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      mockCatchProxyFetchError.mockRejectedValue(new Error('Network error'))

      await expect(
        enrichSitesWithPollutants(
          [mockSite],
          'https://api.example.com',
          { method: 'GET' },
          '2025-01-01 00:00:00',
          '2025-01-01 23:59:00',
          mockLogger,
          mockCatchProxyFetchError
        )
      ).rejects.toThrow('Network error')
    })

    test('Should construct correct API URL with site ID and date range', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      mockCatchProxyFetchError.mockResolvedValue([200, { member: [] }])

      await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(
        'https://api.example.comstation-id=TEST001&start-date-time=2025-01-01 00:00:00&end-date-time=2025-01-01 23:59:00',
        { method: 'GET' }
      )
    })
  })
})
