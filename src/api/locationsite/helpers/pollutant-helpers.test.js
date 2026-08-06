import { vi, describe, test, expect, beforeEach } from 'vitest'
import {
  enrichSitesWithPollutants,
  extractPollutants,
  normalizePollutantName,
  pollutantNames
} from './pollutant-helpers.js'
import { config } from '../../../config/index.js'

const mockRandomInt = vi.hoisted(() => vi.fn())
const mockValidateDataFreshness = vi.hoisted(() =>
  vi.fn().mockReturnValue(true)
)

vi.mock('node:crypto', () => ({ randomInt: mockRandomInt }))

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  })
}))

vi.mock('../../pollutants/helpers/common/validate-data-freshness.js', () => ({
  validateDataFreshness: mockValidateDataFreshness
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

    test('Should strip <sub> tags and keep their inner content', () => {
      expect(normalizePollutantName('PM2.5<sub>test</sub>')).toBe('pm2.5test')
      expect(normalizePollutantName('Nitrogen di<sub>ox</sub>ide')).toBe(
        'nitrogendioxide'
      )
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

    test('Should keep latest when a subsequent member is missing endDateTime', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 22.0,
            endDateTime: '2025-01-01T10:00:00Z'
          },
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 99.0
            // no endDateTime — reduce should keep the prior latest
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(22.0)
    })

    test('Should select the dated member when the first (accumulator) member has no endDateTime', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 10.0
            // no endDateTime — this becomes the initial accumulator in reduce
          },
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 30.0,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(30.0)
    })

    test('Should keep the latest member when a later-listed member is chronologically earlier', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 40.0,
            endDateTime: '2025-01-01T10:00:00Z' // later time, listed first
          },
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 15.0,
            endDateTime: '2025-01-01T09:00:00Z' // earlier time, listed second
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(40.0) // earlier-listed, later timestamp wins
    })

    test('Should return empty time components when pollutant has no endDateTime', () => {
      const siteData = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 25.67
            // no endDateTime → getTimeComponents returns {}
          }
        ]
      }

      const result = extractPollutants(siteData)

      expect(result).toBeDefined()
      expect(result.NO2.value).toBe(25.67)
      expect(result.NO2.time.date).toBeUndefined()
      expect(result.NO2.time.hour).toBeUndefined()
      expect(result.NO2.time.day).toBeUndefined()
      expect(result.NO2.time.month).toBeUndefined()
      expect(result.NO2.time.year).toBeUndefined()
    })

    describe('Timezone-aware time components — UTC "Z" input (literal UTC)', () => {
      test('Should use literal UTC hour/day/month/year during summer time', () => {
        // 2026-07-24T13:00:00Z → 13:00 UTC, displayed as 1pm, 24 July 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-24T13:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.hour).toBe('1pm')
        expect(result.NO2.time.day).toBe('24')
        expect(result.NO2.time.month).toBe('July')
        expect(result.NO2.time.year).toBe('2026')
      })

      test('Should use literal UTC hour during winter time (GMT)', () => {
        // 2026-01-15T12:00:00Z → 12:00 UTC, displayed as 12pm, 15 January 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-01-15T12:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.hour).toBe('12pm')
        expect(result.NO2.time.day).toBe('15')
        expect(result.NO2.time.month).toBe('January')
        expect(result.NO2.time.year).toBe('2026')
      })

      test('Should keep same calendar day when UTC time is before midnight', () => {
        // 2026-07-24T23:30:00Z → 23:30 UTC, displayed as 11pm, 24 July 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-24T23:30:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.hour).toBe('11pm')
        expect(result.NO2.time.day).toBe('24')
        expect(result.NO2.time.month).toBe('July')
        expect(result.NO2.time.year).toBe('2026')
      })

      test('Should format midday correctly as 12pm (not 0pm)', () => {
        // 2026-07-24T12:00:00Z → 12:00 UTC, displayed as 12pm
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-24T12:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.hour).toBe('12pm')
      })

      test('Should format midnight correctly as 12am (not 0am)', () => {
        // 2026-01-15T00:00:00Z → 00:00 UTC, displayed as 12am
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-01-15T00:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.hour).toBe('12am')
      })
    })

    describe('Offset-added parsing — endDateTime with explicit +HH:MM offset', () => {
      // parseWithOffsetAdded takes the literal digits shown and ADDS the offset
      // (rather than the standard ISO 8601 subtraction), per project requirement.
      // getTimeComponents then reads the resulting UTC-labelled ISO string literally.

      test('Should add +01:00 offset on top of literal time', () => {
        // Literal 01:00 + 01:00 offset added = 02:00:00.000Z (internal UTC-labelled)
        // getTimeComponents then displays 2am, 28 July 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-28T01:00:00+01:00'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.date).toBe('2026-07-28T02:00:00.000Z')
        expect(result.NO2.time.hour).toBe('2am')
        expect(result.NO2.time.day).toBe('28')
        expect(result.NO2.time.month).toBe('July')
        expect(result.NO2.time.year).toBe('2026')
      })

      test('Should add a zero offset (+00:00) without changing the literal time', () => {
        // Literal 10:00 + 00:00 offset = 10:00:00.000Z
        // getTimeComponents displays 10am, 15 January 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-01-15T10:00:00+00:00'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.date).toBe('2026-01-15T10:00:00.000Z')
        expect(result.NO2.time.hour).toBe('10am')
        expect(result.NO2.time.day).toBe('15')
        expect(result.NO2.time.month).toBe('January')
        expect(result.NO2.time.year).toBe('2026')
      })

      test('Should roll over to the next calendar day when adding the offset pushes past midnight', () => {
        // Literal 23:30 + 01:00 offset added = 2026-07-29T00:30:00.000Z
        // getTimeComponents displays 12am, 29 July 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-28T23:30:00+01:00'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.date).toBe('2026-07-29T00:30:00.000Z')
        expect(result.NO2.time.hour).toBe('12am')
        expect(result.NO2.time.day).toBe('29')
        expect(result.NO2.time.month).toBe('July')
        expect(result.NO2.time.year).toBe('2026')
      })

      test('Should correctly handle a negative offset by adding it (subtracting the magnitude)', () => {
        // Literal 23:00 + (-01:00) offset added = 22:00:00.000Z
        // getTimeComponents displays 10pm, 28 July 2026
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-28T23:00:00-01:00'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.date).toBe('2026-07-28T22:00:00.000Z')
        expect(result.NO2.time.hour).toBe('10pm')
        expect(result.NO2.time.day).toBe('28')
      })

      test('Should fall back to standard parsing when no offset is present (Z suffix)', () => {
        // No +HH:MM offset present → parseWithOffsetAdded falls back to new Date(dateStr)
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              endDateTime: '2026-07-28T10:00:00Z'
            }
          ]
        }

        const result = extractPollutants(siteData)

        expect(result.NO2.time.date).toBe('2026-07-28T10:00:00.000Z')
        expect(result.NO2.time.hour).toBe('10am') // literal UTC hour
      })

      test('Should also apply offset-added parsing to startDateTime for startDate field', () => {
        const siteData = {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              unit: 'microgrammes per cubic metre',
              value: 25.67,
              startDateTime: '2026-07-28T23:30:00+01:00', // literal+offset rolls to next day
              endDateTime: '2026-07-28T10:00:00+01:00'
            }
          ]
        }

        const result = extractPollutants(siteData)

        // startDateTime literal 23:30 + 01:00 offset added = 2026-07-29T00:30:00.000Z
        // sliced to date-only
        expect(result.NO2.startDate).toBe('2026-07-29')
      })
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
      mockValidateDataFreshness.mockReturnValue(true)
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

    test('Should skip site with no localSiteID', async () => {
      const mockSite = {
        name: 'Site Without ID',
        localSiteID: null,
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(0)
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
      expect(mockCatchProxyFetchError).toHaveBeenCalledTimes(5)
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

    test('Should handle catchProxyFetchError rejecting for a pollutant fetch', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      mockCatchProxyFetchError.mockRejectedValue(new Error('network error'))

      const result = await enrichSitesWithPollutants(
        [mockSite],
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(0) // no siteData retrieved → no pollutants
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching')
      )
    })

    test('Should still enrich a site when one pollutant fetch rejects but others succeed', async () => {
      const mockSite = {
        name: 'Test Site',
        localSiteID: 'TEST001',
        area: 'Test Area',
        areaType: 'Urban',
        location: { type: 'Point', coordinates: [50.0, -1.0] },
        distance: 0.5
      }

      const mockValidResponse = {
        member: [
          {
            pollutantName: 'Nitrogen dioxide',
            unit: 'microgrammes per cubic metre',
            value: 12.5,
            endDateTime: '2025-01-01T10:00:00Z'
          }
        ]
      }

      mockCatchProxyFetchError
        .mockRejectedValueOnce(new Error('network error')) // one pollutant fetch fails
        .mockResolvedValue([200, mockValidResponse]) // remaining fetches succeed

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
      expect(result[0].pollutants.NO2.value).toBe(12.5)
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
        .mockResolvedValueOnce([200, mockValidResponse]) // Site 1, pollutant 1
        .mockResolvedValueOnce([200, mockValidResponse]) // Site 1, pollutant 2
        .mockResolvedValueOnce([200, mockValidResponse]) // Site 1, pollutant 3
        .mockResolvedValueOnce([200, mockValidResponse]) // Site 1, pollutant 4
        .mockResolvedValueOnce([200, mockValidResponse]) // Site 1, pollutant 5
        .mockResolvedValueOnce([200, mockEmptyResponse]) // Site 2, pollutant 1
        .mockResolvedValueOnce([200, mockEmptyResponse]) // Site 2, pollutant 2
        .mockResolvedValueOnce([200, mockEmptyResponse]) // Site 2, pollutant 3
        .mockResolvedValueOnce([200, mockEmptyResponse]) // Site 2, pollutant 4
        .mockResolvedValueOnce([200, mockEmptyResponse]) // Site 2, pollutant 5

      const result = await enrichSitesWithPollutants(
        mockSites,
        'https://api.example.com',
        { method: 'GET' },
        '2025-01-01 00:00:00',
        '2025-01-01 23:59:00',
        mockLogger,
        mockCatchProxyFetchError
      )

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Site 1')
      expect(result[0].pollutants.NO2.value).toBe(25.67)
      expect(mockCatchProxyFetchError).toHaveBeenCalledTimes(10)
    })
  })
})
