import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCatchProxyFetchError = vi.hoisted(() => vi.fn())
const mockFetchOAuthToken = vi.hoisted(() => vi.fn())
const mockCalculateDaqiIndex = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}))

vi.mock('../locationsite/helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: mockCatchProxyFetchError
}))
vi.mock('../locationsite/helpers/oauth-helpers.js', () => ({
  fetchOAuthToken: mockFetchOAuthToken
}))
vi.mock('./helpers/daqi-calculator.js', () => ({
  calculateDaqiIndex: mockCalculateDaqiIndex
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../config/index.js', () => ({
  config: {
    get: vi
      .fn()
      .mockReturnValue('https://mock-ricardo/api/pollutant_measurement_datas?')
  }
}))

describe('fetch-aurn-measurements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchOAuthToken.mockResolvedValue('mock-token')
    mockCalculateDaqiIndex.mockReturnValue(2)
  })

  describe('pollutantNameToCode (via extractLatestPerPollutant)', () => {
    it('maps Nitrogen dioxide to NO2', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              value: 45,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])
      mockCalculateDaqiIndex.mockImplementation((vals) => {
        expect(vals).toHaveProperty('NO2', 45)
        return 1
      })

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      await fetchAurnMeasurements(['UKA00651'])

      expect(mockCalculateDaqiIndex).toHaveBeenCalledWith(
        expect.objectContaining({ NO2: 45 })
      )
    })

    it('maps PM<sub>10</sub> particulate matter to PM10', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName:
                'PM<sub>10</sub> particulate matter (Hourly measured)',
              value: 20,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      await fetchAurnMeasurements(['UKA00651'])

      expect(mockCalculateDaqiIndex).toHaveBeenCalledWith(
        expect.objectContaining({ PM10: 20 })
      )
    })

    it('maps PM<sub>2.5</sub> particulate matter to PM25', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName:
                'PM<sub>2.5</sub> particulate matter (Hourly measured)',
              value: 8,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      await fetchAurnMeasurements(['UKA00651'])

      expect(mockCalculateDaqiIndex).toHaveBeenCalledWith(
        expect.objectContaining({ PM25: 8 })
      )
    })

    it('ignores Nitric oxide (not a DAQI pollutant)', async () => {
      // First call is the bulk fetch; data-type override calls return empty to avoid false positives
      mockCatchProxyFetchError
        .mockResolvedValueOnce([
          200,
          {
            member: [
              {
                pollutantName: 'Nitric oxide',
                value: 100,
                endDateTime: '2026-07-29T10:00:00+01:00'
              }
            ],
            view: {}
          }
        ])
        .mockResolvedValue([200, { member: [], view: {} }])
      mockCalculateDaqiIndex.mockReturnValue(null)

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      const result = await fetchAurnMeasurements(['UKA00651'])

      expect(mockCalculateDaqiIndex).toHaveBeenCalledWith({})
      expect(result).toHaveLength(0)
    })
  })

  describe('fetchAurnMeasurements', () => {
    it('throws when OAuth token fetch fails', async () => {
      mockFetchOAuthToken.mockResolvedValue(null)

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )

      await expect(fetchAurnMeasurements(['UKA00651'])).rejects.toThrow(
        'Failed to fetch OAuth token for AURN measurements refresh'
      )
    })

    it('returns an empty array when no stationIds provided', async () => {
      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      const result = await fetchAurnMeasurements([])

      expect(result).toEqual([])
      expect(mockCatchProxyFetchError).not.toHaveBeenCalled()
    })

    it('skips a station when the API returns a non-200 response', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        500,
        { error: 'server error' }
      ])

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      const result = await fetchAurnMeasurements(['UKA00651'])

      expect(result).toHaveLength(0)
    })

    it('skips a station when calculateDaqiIndex returns null', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              value: 10,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])
      mockCalculateDaqiIndex.mockReturnValue(null)

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      const result = await fetchAurnMeasurements(['UKA00651'])

      expect(result).toHaveLength(0)
    })

    it('returns a station result with daqiIndex and measuredAt when data is valid', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              value: 45,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])
      mockCalculateDaqiIndex.mockReturnValue(2)

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      const result = await fetchAurnMeasurements(['UKA00651'])

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        localSiteID: 'UKA00651',
        daqiIndex: 2,
        measuredAt: '2026-07-29T10:00:00+01:00'
      })
      expect(result[0].updatedAt).toBeInstanceOf(Date)
    })

    it('picks the most recent endDateTime across duplicate pollutant records', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              value: 10,
              endDateTime: '2026-07-29T08:00:00+01:00'
            },
            {
              pollutantName: 'Nitrogen dioxide',
              value: 20,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      await fetchAurnMeasurements(['UKA00651'])

      // Should use the value from the more recent record
      expect(mockCalculateDaqiIndex).toHaveBeenCalledWith(
        expect.objectContaining({ NO2: 20 })
      )
    })

    it('processes multiple stations in batches', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        {
          member: [
            {
              pollutantName: 'Nitrogen dioxide',
              value: 15,
              endDateTime: '2026-07-29T10:00:00+01:00'
            }
          ],
          view: {}
        }
      ])
      mockCalculateDaqiIndex.mockReturnValue(1)

      const { fetchAurnMeasurements } = await import(
        './fetch-aurn-measurements.js'
      )
      const result = await fetchAurnMeasurements([
        'UKA00001',
        'UKA00002',
        'UKA00003'
      ])

      expect(result).toHaveLength(3)
      // 1 bulk call + 3 data-type override calls (O3, PM10, PM25) per station
      expect(mockCatchProxyFetchError).toHaveBeenCalledTimes(12)
    })
  })
})
