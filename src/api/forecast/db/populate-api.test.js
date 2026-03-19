import { vi, describe, test, expect, beforeEach } from 'vitest'

import { populateApi } from './populate-api.js'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))
const mockFetchForecasts = vi.hoisted(() => vi.fn())

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('../fetch-forecast.js', () => ({
  fetchForecasts: mockFetchForecasts
}))

const forecasts = [{ name: 'Site A' }, { name: 'Site B' }]

describe('populateApi (forecast/db)', () => {
  let mockMongo
  let mockDb
  let mockSession

  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn().mockResolvedValue(undefined)
    }
    mockMongo = { startSession: vi.fn().mockReturnValue(mockSession) }
    mockDb = {
      collection: vi.fn().mockReturnValue({
        deleteMany: vi.fn().mockResolvedValue({}),
        insertMany: vi.fn().mockResolvedValue({})
      })
    }
    mockFetchForecasts.mockResolvedValue(forecasts)
  })

  test('inserts forecasts and commits transaction', async () => {
    await populateApi(mockMongo, mockDb)

    expect(mockDb.collection).toHaveBeenCalledWith('forecasts')
    expect(mockSession.commitTransaction).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith('Updated 2 forecasts')
  })

  test('skips insert when forecasts list is empty', async () => {
    mockFetchForecasts.mockResolvedValue([])
    const mockCollection = { deleteMany: vi.fn(), insertMany: vi.fn() }
    mockDb.collection.mockReturnValue(mockCollection)

    await populateApi(mockMongo, mockDb)

    expect(mockCollection.deleteMany).not.toHaveBeenCalled()
    expect(mockSession.commitTransaction).toHaveBeenCalled()
  })

  test('logs error when fetchForecasts throws', async () => {
    mockFetchForecasts.mockRejectedValue(new Error('fetch failed'))

    await populateApi(mockMongo, mockDb)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error))
  })
})
