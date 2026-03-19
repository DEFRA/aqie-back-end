import { vi, describe, test, expect, beforeEach } from 'vitest'

import { fetchForecast, saveForecasts } from './fetch-forecast.js'
import { parseForecast } from './parse-forecast.js'

const mockParse = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}))
const mockProxyFetch = vi.hoisted(() => vi.fn())

vi.mock('../../helpers/proxy-fetch.js', () => ({ proxyFetch: mockProxyFetch }))
vi.mock('fast-xml-parser', () => ({
  XMLParser: vi.fn().mockImplementation(() => ({ parse: mockParse }))
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://forecast-api.test/rss') }
}))
vi.mock('./parse-forecast.js', () => ({
  parseForecast: vi.fn().mockImplementation((item) => ({
    name: item.title,
    location: { type: 'Point', coordinates: [51.5, -0.1] },
    forecast: []
  }))
}))

describe('fetchForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('fetches and parses forecast items', async () => {
    const items = [{ title: 'Site A' }, { title: 'Site B' }]
    mockProxyFetch.mockResolvedValue({
      text: vi.fn().mockResolvedValue('<xml/>')
    })
    mockParse.mockReturnValue({ rss: { channel: { item: items } } })

    const result = await fetchForecast()

    expect(mockProxyFetch).toHaveBeenCalledWith(
      'http://forecast-api.test/rss',
      { method: 'get', headers: { 'Content-Type': 'text/xml' } }
    )
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('Site A')
  })

  test('filters out items that fail to parse', async () => {
    const items = [{ title: 'Site A' }, { title: 'Bad Site' }]
    mockProxyFetch.mockResolvedValue({
      text: vi.fn().mockResolvedValue('<xml/>')
    })
    mockParse.mockReturnValue({ rss: { channel: { item: items } } })
    parseForecast
      .mockImplementationOnce((item) => ({ name: item.title, forecast: [] }))
      .mockImplementationOnce(() => {
        throw new Error('parse error')
      })

    const result = await fetchForecast()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Site A')
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Forecast Parser error')
    )
  })

  test('returns empty array when all items fail to parse', async () => {
    mockProxyFetch.mockResolvedValue({
      text: vi.fn().mockResolvedValue('<xml/>')
    })
    mockParse.mockReturnValue({
      rss: { channel: { item: [{ title: 'Bad' }] } }
    })
    parseForecast.mockImplementation(() => {
      throw new Error('parse error')
    })

    const result = await fetchForecast()

    expect(result).toEqual([])
  })
})

describe('saveForecasts', () => {
  test('bulk writes forecasts and inserts historical records', async () => {
    const forecasts = [
      { name: 'Site A', location: {}, forecast: [] },
      { name: 'Site B', location: {}, forecast: [] }
    ]
    const mockBulkWrite = vi.fn().mockResolvedValue({ ok: 1 })
    const mockInsertMany = vi.fn().mockResolvedValue({ insertedCount: 2 })
    const mockCollection = vi.fn().mockReturnValue({
      bulkWrite: mockBulkWrite,
      insertMany: mockInsertMany
    })
    const mockServer = { db: { collection: mockCollection } }

    await saveForecasts(mockServer, forecasts)

    expect(mockCollection).toHaveBeenCalledWith('forecasts')
    expect(mockBulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ replaceOne: expect.any(Object) })
      ])
    )
    expect(mockCollection).toHaveBeenCalledWith('historicalForecasts')
    expect(mockInsertMany).toHaveBeenCalledWith(forecasts)
  })

  test('logs error when bulkWrite fails but still inserts historical', async () => {
    const forecasts = [{ name: 'Site A', location: {}, forecast: [] }]
    const mockBulkWrite = vi.fn().mockRejectedValue(new Error('DB error'))
    const mockInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 })
    const mockCollection = vi.fn().mockReturnValue({
      bulkWrite: mockBulkWrite,
      insertMany: mockInsertMany
    })
    const mockServer = { db: { collection: mockCollection } }

    await saveForecasts(mockServer, forecasts)

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('forecasts update error')
    )
    expect(mockInsertMany).toHaveBeenCalledWith(forecasts)
  })
})
