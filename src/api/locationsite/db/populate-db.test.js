import { vi, describe, test, expect, beforeEach } from 'vitest'
import { populateMonitoringStationsDb } from './populate-db.js'

const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn() }))
const mockPopulateApi = vi.hoisted(() => vi.fn())

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('./populate-api.js', () => ({
  populateMonitoringStationsApi: mockPopulateApi
}))

describe('populateMonitoringStationsDb plugin', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = { db: {} }
  })

  test('plugin has correct name', () => {
    expect(populateMonitoringStationsDb.plugin.name).toBe(
      'Populate Monitoring Stations Db'
    )
  })

  test('calls populateMonitoringStationsApi with server on register', async () => {
    mockPopulateApi.mockResolvedValue(undefined)

    await populateMonitoringStationsDb.plugin.register(mockServer)

    expect(mockPopulateApi).toHaveBeenCalledWith(mockServer)
  })

  test('logs error and does not throw when populateMonitoringStationsApi throws', async () => {
    mockPopulateApi.mockRejectedValue(new Error('startup failure'))

    await expect(
      populateMonitoringStationsDb.plugin.register(mockServer)
    ).resolves.not.toThrow()

    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error))
  })
})
