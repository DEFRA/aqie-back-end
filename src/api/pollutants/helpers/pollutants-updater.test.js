import { vi, describe, test, expect, beforeEach } from 'vitest'

import { pollutantUpdater } from './pollutants-updater.js'

const mockParse = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}))
const mockProxyFetch = vi.hoisted(() => vi.fn())
const mockGetValueMeasured = vi.hoisted(() => vi.fn())
const mockGetTempDate = vi.hoisted(() => vi.fn())
const mockGetDateMeasured = vi.hoisted(() => vi.fn())

vi.mock('fast-xml-parser', () => ({
  XMLParser: vi.fn().mockImplementation(() => ({ parse: mockParse }))
}))
vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://test-api/') }
}))
vi.mock('../../../helpers/proxy-fetch.js', () => ({
  proxyFetch: mockProxyFetch
}))
vi.mock('./body-parser.js', () => ({
  getValueMeasured: mockGetValueMeasured,
  getTempDate: mockGetTempDate,
  getDateMeasured: mockGetDateMeasured
}))
vi.mock('moment-timezone', () => {
  const chain = {
    add: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnValue('2023-01-01T00:00:00Z'),
    tz: vi.fn().mockReturnThis()
  }
  const momentFn = vi.fn().mockReturnValue(chain)
  momentFn.utc = vi.fn().mockReturnValue(chain)
  return { default: momentFn }
})

function makeSite(pollutantEntries) {
  const pollutants = {}
  for (const [key, foi] of Object.entries(pollutantEntries)) {
    pollutants[key] = {
      featureOfInterest: foi,
      time: { date: null },
      exception: ''
    }
  }
  return { name: 'Test Site', pollutants }
}

describe('pollutantUpdater', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParse.mockReturnValue({})
    mockGetValueMeasured.mockReturnValue('25')
    mockGetTempDate.mockReturnValue(['a', 'b', 'c', 'd', '2023-01-01'])
    mockGetDateMeasured.mockReturnValue('2023-01-01T00:00:00Z')
  })

  test('returns the original data array', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })

    const result = await pollutantUpdater(data)

    expect(result).toBe(data)
  })

  test('sets pollutant value to Math.round result when measured >= 1', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockGetValueMeasured.mockReturnValue('25.7')
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })

    await pollutantUpdater(data)

    expect(data[0].pollutants.NO2.value).toBe(26)
  })

  test('sets pollutant value to toFixed(2) when measured is between 0 and NEAR_ONE_THRESHOLD', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockGetValueMeasured.mockReturnValue(0.5)
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })

    await pollutantUpdater(data)

    expect(data[0].pollutants.NO2.value).toBe('0.50')
  })

  test('sets pollutant value to toFixed(0) when measured is above NEAR_ONE_THRESHOLD', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockGetValueMeasured.mockReturnValue(0.99)
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })

    await pollutantUpdater(data)

    expect(data[0].pollutants.NO2.value).toBe('1')
  })

  test('sets pollutant value to null for missingFOI', async () => {
    const data = [makeSite({ PM10: 'missingFOI' })]

    await pollutantUpdater(data)

    expect(mockProxyFetch).not.toHaveBeenCalled()
    expect(data[0].pollutants.PM10.exception).toBe('N/A')
    expect(data[0].pollutants.PM10.value).toBeNull()
  })

  test('skips response when ok is false', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockProxyFetch.mockResolvedValue({ ok: false })

    const result = await pollutantUpdater(data)

    expect(result).toBe(data)
    expect(mockGetValueMeasured).not.toHaveBeenCalled()
  })

  test('sets exception to N/M when ows:ExceptionReport is present', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })
    mockParse.mockReturnValue({
      'ows:ExceptionReport': {
        'ows:Exception': { 'ows:ExceptionText': 'InvalidParameter' }
      }
    })

    await pollutantUpdater(data)

    expect(data[0].pollutants.NO2.exception).toBe('N/M')
  })

  test('sets exception to N/M when reporting period is present', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })
    mockParse.mockReturnValue({
      'gml:FeatureCollection': {
        'gml:featureMember': {
          'aqd:AQD_ReportingHeader': { 'aqd:reportingPeriod': '2023' }
        }
      }
    })

    await pollutantUpdater(data)

    expect(data[0].pollutants.NO2.exception).toBe('N/M')
  })

  test('handles error thrown during response.text() and continues', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockRejectedValue(new Error('network error'))
    })

    const result = await pollutantUpdater(data)

    expect(result).toBe(data)
    expect(mockLogger.info).toHaveBeenCalled()
  })

  test('handles multiple pollutants including mixed missingFOI and real FOIs', async () => {
    const data = [
      makeSite({
        NO2: 'http://example.com/no2',
        PM10: 'missingFOI'
      })
    ]
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })

    const result = await pollutantUpdater(data)

    expect(result).toBe(data)
    expect(mockProxyFetch).toHaveBeenCalledTimes(1)
  })

  test('handles multiple sites', async () => {
    const data = [
      makeSite({ NO2: 'http://example.com/no2' }),
      makeSite({ PM10: 'http://example.com/pm10' })
    ]
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })

    const result = await pollutantUpdater(data)

    expect(result).toBe(data)
    expect(mockProxyFetch).toHaveBeenCalledTimes(2)
  })

  test('handles proxyFetch error during promise building', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockProxyFetch.mockImplementation(() => {
      throw new Error('fetch failed')
    })

    const result = await pollutantUpdater(data)

    expect(result).toBe(data)
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('sets pollutant value to null when measured is NaN string', async () => {
    const data = [makeSite({ NO2: 'http://example.com/foi' })]
    mockGetValueMeasured.mockReturnValue('N/M')
    mockProxyFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<xml/>')
    })
    mockParse.mockReturnValue({ 'ows:ExceptionReport': {} })

    await pollutantUpdater(data)

    expect(data[0].pollutants.NO2.value).toBeNull()
  })
})
