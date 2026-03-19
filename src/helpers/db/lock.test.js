import { vi, describe, test, expect, beforeEach } from 'vitest'

import { lock, unlock } from './lock.js'

vi.mock('../logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

describe('lock', () => {
  let mockDb
  let mockInsertOne
  let mockDeleteOne

  beforeEach(() => {
    mockInsertOne = vi.fn()
    mockDeleteOne = vi.fn()
    mockDb = {
      collection: vi.fn().mockReturnValue({
        insertOne: mockInsertOne,
        deleteOne: mockDeleteOne
      })
    }
  })

  describe('lock()', () => {
    test('returns true when lock is acquired successfully', async () => {
      mockInsertOne.mockResolvedValue({ acknowledged: true })

      const result = await lock(mockDb, 'test-lock')

      expect(result).toBe(true)
      expect(mockDb.collection).toHaveBeenCalledWith('locks')
      expect(mockInsertOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'test-lock' })
      )
    })

    test('returns false when lock is already claimed (insert throws)', async () => {
      mockInsertOne.mockRejectedValue(new Error('duplicate key'))

      const result = await lock(mockDb, 'test-lock')

      expect(result).toBe(false)
    })
  })

  describe('unlock()', () => {
    test('returns result of deleteOne when lock is released', async () => {
      mockDeleteOne.mockResolvedValue({ deletedCount: 1 })

      await unlock(mockDb, 'test-lock')

      expect(mockDb.collection).toHaveBeenCalledWith('locks')
      expect(mockDeleteOne).toHaveBeenCalledWith({ _id: 'test-lock' })
    })

    test('returns false when deleteOne throws synchronously', async () => {
      mockDeleteOne.mockImplementation(() => {
        throw new Error('connection error')
      })

      const result = await unlock(mockDb, 'test-lock')

      expect(result).toBe(false)
    })
  })
})
