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

const HOUR_MS = 60 * 60 * 1000
const QUARTER_MS = 15 * 60 * 1000
const LATEST = Date.parse('2026-07-29T10:00:00Z')

/** One row per entry, newest last, each ending on the hour at or before LATEST. */
function hourlyRows(pollutantName, values) {
  return values.map((value, i) => {
    const end = LATEST - (values.length - 1 - i) * HOUR_MS
    return {
      pollutantName,
      value,
      startDateTime: new Date(end - HOUR_MS).toISOString(),
      endDateTime: new Date(end).toISOString()
    }
  })
}

function quarterRows(pollutantName, values) {
  return values.map((value, i) => {
    const end = LATEST - (values.length - 1 - i) * QUARTER_MS
    return {
      pollutantName,
      value,
      startDateTime: new Date(end - QUARTER_MS).toISOString(),
      endDateTime: new Date(end).toISOString()
    }
  })
}

const repeat = (value, count) => Array.from({ length: count }, () => value)

function respondWith(member) {
  mockCatchProxyFetchError.mockResolvedValue([200, { member, view: {} }])
}

async function run(stationIds = ['UKA00651']) {
  const { fetchAurnMeasurements } = await import('./fetch-aurn-measurements.js')
  return fetchAurnMeasurements(stationIds)
}

/** The concentrations passed to calculateDaqiIndex on the last call, as { code: { value } }. */
const lastConcentrations = () =>
  Object.fromEntries(
    Object.entries(mockCalculateDaqiIndex.mock.calls.at(-1)[0]).map(
      ([code, value]) => [code, { value }]
    )
  )

describe('fetch-aurn-measurements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchOAuthToken.mockResolvedValue('mock-token')
    mockCalculateDaqiIndex.mockReturnValue(2)
  })

  describe('pollutant name mapping', () => {
    it('maps Nitrogen dioxide to NO2', async () => {
      respondWith(hourlyRows('Nitrogen dioxide', [45]))
      const result = await run()
      expect(lastConcentrations()).toEqual({ NO2: { value: 45 } })
      expect(result[0].pollutants.NO2.measuredAt).toBe(
        '2026-07-29T10:00:00.000Z'
      )
    })

    it('maps PM<sub>10</sub> particulate matter to PM10', async () => {
      respondWith(
        hourlyRows(
          'PM<sub>10</sub> particulate matter (Hourly measured)',
          repeat(20, 24)
        )
      )
      await run()
      expect(lastConcentrations().PM10.value).toBe(20)
    })

    it('maps PM<sub>2.5</sub> particulate matter to PM25', async () => {
      respondWith(
        hourlyRows(
          'PM<sub>2.5</sub> particulate matter (Hourly measured)',
          repeat(8, 24)
        )
      )
      await run()
      expect(lastConcentrations().PM25.value).toBe(8)
    })

    it('maps Ozone to O3 as an 8-hour mean', async () => {
      respondWith(hourlyRows('Ozone', [10, 10, 10, 10, 10, 10, 10, 90]))
      await run()
      expect(lastConcentrations().O3.value).toBeCloseTo(20)
    })

    it('ignores Nitric oxide (not a DAQI pollutant)', async () => {
      respondWith(hourlyRows('Nitric oxide', [100]))
      mockCalculateDaqiIndex.mockReturnValue(null)
      const result = await run()
      expect(mockCalculateDaqiIndex).toHaveBeenCalledWith({})
      expect(result).toHaveLength(0)
    })
  })

  describe('data capture rules', () => {
    it('omits PM when fewer than 18 of the last 24 hours are valid', async () => {
      const values = [...repeat(-9999, 7), ...repeat(12, 17)]
      respondWith(hourlyRows('PM10', values))
      await run()
      expect(lastConcentrations()).toEqual({})
    })

    it('includes PM at exactly 18 of 24 valid hours, unrounded', async () => {
      const values = [...repeat(-9999, 6), ...repeat(12.5, 17), 13]
      respondWith(hourlyRows('PM10', values))
      await run()
      expect(lastConcentrations().PM10.value).toBeCloseTo((12.5 * 17 + 13) / 18)
    })

    it('does not estimate PM from a short history', async () => {
      respondWith(hourlyRows('PM2.5', repeat(10, 5)))
      mockCalculateDaqiIndex.mockReturnValue(null)
      expect(await run()).toHaveLength(0)
    })

    it('omits O3 below 6 of 8 valid hours and keeps it at 6', async () => {
      respondWith(
        hourlyRows('Ozone', [50, 50, -9999, -9999, -9999, 50, 50, 50])
      )
      await run()
      expect(lastConcentrations()).toEqual({})

      respondWith(hourlyRows('Ozone', [50, 50, -9999, -9999, 50, 50, 50, 50]))
      await run()
      expect(lastConcentrations().O3.value).toBe(50)
    })

    it('counts hours missing from the response as invalid', async () => {
      const rows = hourlyRows('Ozone', [50, 50, 50, 50, 50, 50, 50, 50, 50, 50])
      respondWith([rows[0], rows[1], rows[2], rows[8], rows[9]])
      mockCalculateDaqiIndex.mockReturnValue(null)
      await run()
      expect(lastConcentrations()).toEqual({})
    })

    it('uses the latest 15-minute mean for SO2', async () => {
      respondWith([
        ...hourlyRows('Sulphur dioxide', repeat(1, 24)),
        ...quarterRows('Sulphur dioxide', [5, 6, 7.5, -9999])
      ])
      const result = await run()
      expect(lastConcentrations().SO2.value).toBe(7.5)
      expect(result[0].pollutants.SO2.measuredAt).toBe(
        new Date(LATEST - QUARTER_MS).toISOString()
      )
    })

    it('omits SO2 when only hourly data is available', async () => {
      respondWith(hourlyRows('Sulphur dioxide', repeat(300, 24)))
      mockCalculateDaqiIndex.mockReturnValue(null)
      await run()
      expect(lastConcentrations()).toEqual({})
    })

    it('does not mix 15-minute rows into the hourly series', async () => {
      respondWith([
        ...hourlyRows('Nitrogen dioxide', [30]),
        ...quarterRows('Nitrogen dioxide', [999])
      ])
      await run()
      expect(lastConcentrations().NO2.value).toBe(30)
    })

    it('ignores rows with an unknown or odd interval', async () => {
      respondWith([
        {
          pollutantName: 'Nitrogen dioxide',
          value: 9,
          endDateTime: '2026-07-29T10:00:00Z'
        },
        {
          pollutantName: 'Nitrogen dioxide',
          value: 9,
          startDateTime: '2026-07-29T08:00:00Z',
          endDateTime: '2026-07-29T10:00:00Z'
        },
        {
          pollutantName: 'Nitrogen dioxide',
          value: 9,
          startDateTime: '2026-07-29T09:00:00Z'
        }
      ])
      mockCalculateDaqiIndex.mockReturnValue(null)
      await run()
      expect(lastConcentrations()).toEqual({})
    })

    it('treats duplicate rows for the same hour as one reading', async () => {
      const [row] = hourlyRows('Nitrogen dioxide', [20])
      respondWith([{ ...row, value: -9999 }, row])
      await run()
      expect(lastConcentrations().NO2.value).toBe(20)
    })
  })

  describe('fetchAurnMeasurements', () => {
    it('throws when OAuth token fetch fails', async () => {
      mockFetchOAuthToken.mockResolvedValue(null)
      await expect(run()).rejects.toThrow(
        'Failed to fetch OAuth token for AURN measurements refresh'
      )
    })

    it('returns an empty array when no stationIds provided', async () => {
      const result = await run([])
      expect(result).toEqual([])
      expect(mockCatchProxyFetchError).not.toHaveBeenCalled()
    })

    it('skips a station when the API returns a non-200 response', async () => {
      mockCatchProxyFetchError.mockResolvedValue([
        500,
        { error: 'server error' }
      ])
      expect(await run()).toHaveLength(0)
    })

    it('skips a station when the API returns no records', async () => {
      respondWith([])
      expect(await run()).toHaveLength(0)
    })

    it('skips a station when calculateDaqiIndex returns null', async () => {
      respondWith(hourlyRows('Nitrogen dioxide', [10]))
      mockCalculateDaqiIndex.mockReturnValue(null)
      expect(await run()).toHaveLength(0)
    })

    it('returns daqiIndex, unrounded values and the latest measuredAt', async () => {
      respondWith([
        ...hourlyRows('Nitrogen dioxide', [45.4]),
        ...quarterRows('Sulphur dioxide', [3, 4])
      ])
      const result = await run()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        localSiteID: 'UKA00651',
        daqiIndex: 2,
        measuredAt: '2026-07-29T10:00:00.000Z',
        pollutants: {
          NO2: { value: 45.4 },
          SO2: { value: 4 }
        }
      })
      expect(result[0].updatedAt).toBeInstanceOf(Date)
    })

    it('uses the most recent valid hour across duplicate pollutant records', async () => {
      respondWith(hourlyRows('Nitrogen dioxide', [10, 20]))
      await run()
      expect(lastConcentrations().NO2.value).toBe(20)
    })

    it('processes multiple stations in batches', async () => {
      respondWith(hourlyRows('Nitrogen dioxide', [15]))
      mockCalculateDaqiIndex.mockReturnValue(1)
      const result = await run(['UKA00001', 'UKA00002', 'UKA00003'])

      expect(result).toHaveLength(3)
      expect(mockCatchProxyFetchError).toHaveBeenCalledTimes(3)
    })
  })
})
