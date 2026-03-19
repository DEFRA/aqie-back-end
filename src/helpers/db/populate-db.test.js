import { vi, describe, test, expect, beforeEach } from 'vitest'

import { populateDb } from './populate-db.js'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))
const mockPopulateApi = vi.hoisted(() => vi.fn())

vi.mock('../logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('./populate-api.js', () => ({
  populateApi: mockPopulateApi
}))

describe('populateDb plugin', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = {
      mongoClient: {},
      db: {}
    }
  })

  test('is a named plugin', () => {
    expect(populateDb.plugin.name).toBe('Populate Db')
  })

  test('calls populateApi with server mongoClient and db', async () => {
    mockPopulateApi.mockResolvedValue(undefined)

    await populateDb.plugin.register(mockServer)

    expect(mockPopulateApi).toHaveBeenCalledWith(
      mockServer.mongoClient,
      mockServer.db
    )
  })

  test('logs error when populateApi throws', async () => {
    const err = new Error('DB error')
    mockPopulateApi.mockRejectedValue(err)

    await populateDb.plugin.register(mockServer)

    expect(mockLogger.error).toHaveBeenCalledWith(err)
  })
})
