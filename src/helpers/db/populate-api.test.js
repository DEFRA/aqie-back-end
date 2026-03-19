import { vi, describe, test, expect, beforeEach } from 'vitest'

import { populateApi } from './populate-api.js'
import { fetchEntities } from './fetch-entities.js'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))

vi.mock('../logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('./fetch-entities.js', () => ({
  fetchEntities: vi.fn()
}))

const entities = [
  { entityId: '1', name: 'Tractor' },
  { entityId: '2', name: 'Bike' }
]

describe('populateApi', () => {
  let mockMongo
  let mockDb
  let mockSession

  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = {
      startTransaction: vi.fn(),
      commitTransaction: vi.fn().mockResolvedValue(undefined)
    }
    mockMongo = {
      startSession: vi.fn().mockReturnValue(mockSession)
    }
    mockDb = {
      collection: vi.fn().mockReturnValue({
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: 2 })
      })
    }
    fetchEntities.mockResolvedValue(entities)
  })

  test('inserts entities and commits transaction', async () => {
    await populateApi(mockMongo, mockDb)

    expect(mockDb.collection).toHaveBeenCalledWith('entities')
    expect(mockSession.commitTransaction).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Updated 2 entities')
    )
  })

  test('skips insert when entities list is empty', async () => {
    fetchEntities.mockResolvedValue([])
    const mockCollection = { deleteMany: vi.fn(), insertMany: vi.fn() }
    mockDb.collection.mockReturnValue(mockCollection)

    await populateApi(mockMongo, mockDb)

    expect(mockCollection.deleteMany).not.toHaveBeenCalled()
    expect(mockCollection.insertMany).not.toHaveBeenCalled()
    expect(mockSession.commitTransaction).toHaveBeenCalled()
  })

  test('logs error when fetchEntities throws', async () => {
    fetchEntities.mockRejectedValue(new Error('network error'))

    await populateApi(mockMongo, mockDb)

    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error))
  })
})
