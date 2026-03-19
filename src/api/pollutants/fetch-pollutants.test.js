import { vi, describe, test, expect, beforeEach } from 'vitest'

import { fetchPollutants, savePollutants } from './fetch-pollutants.js'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}))
const mockGetAPIPollutants = vi.hoisted(() => vi.fn())

vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('./helpers/get-api-pollutants.js', () => ({
  getAPIPollutants: mockGetAPIPollutants
}))
vi.mock('moment-timezone', () => {
  const chain = { tz: vi.fn().mockReturnThis() }
  return { default: vi.fn().mockReturnValue(chain) }
})

describe('fetchPollutants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('fetches pollutants for all regions and flattens results', async () => {
    const regionResult = [[{ name: 'Site A' }], [{ name: 'Site B' }]]
    mockGetAPIPollutants.mockResolvedValue(regionResult)

    const result = await fetchPollutants()

    expect(mockGetAPIPollutants).toHaveBeenCalledTimes(16)
    expect(result).toBeInstanceOf(Array)
  })

  test('returns flat list of measurements', async () => {
    mockGetAPIPollutants.mockResolvedValue([[{ name: 'Site A' }]])

    const result = await fetchPollutants()

    expect(result.every((item) => typeof item === 'object')).toBe(true)
  })
})

describe('savePollutants', () => {
  test('bulk writes measurements and inserts historical records', async () => {
    const pollutants = [{ name: 'Site A' }, { name: 'Site B' }]
    const mockBulkWrite = vi.fn().mockResolvedValue({ ok: 1 })
    const mockInsertMany = vi.fn().mockResolvedValue({ insertedCount: 2 })
    const mockCollection = vi.fn().mockReturnValue({
      bulkWrite: mockBulkWrite,
      insertMany: mockInsertMany
    })
    const mockServer = { db: { collection: mockCollection } }

    await savePollutants(mockServer, pollutants)

    expect(mockCollection).toHaveBeenCalledWith('measurements')
    expect(mockBulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ replaceOne: expect.any(Object) })
      ])
    )
    expect(mockCollection).toHaveBeenCalledWith('historicalMeasurements')
    expect(mockInsertMany).toHaveBeenCalledWith(pollutants)
  })

  test('logs error when bulkWrite fails but still inserts historical', async () => {
    const pollutants = [{ name: 'Site A' }]
    const mockBulkWrite = vi.fn().mockRejectedValue(new Error('DB error'))
    const mockInsertMany = vi.fn().mockResolvedValue({ insertedCount: 1 })
    const mockCollection = vi.fn().mockReturnValue({
      bulkWrite: mockBulkWrite,
      insertMany: mockInsertMany
    })
    const mockServer = { db: { collection: mockCollection } }

    await savePollutants(mockServer, pollutants)

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('pollutants measurements error'),
      expect.any(Error)
    )
    expect(mockInsertMany).toHaveBeenCalledWith(pollutants)
  })
})
