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
    mockServer = { db: {}, events: { once: vi.fn() } }
  })

  test('plugin has correct name', () => {
    expect(populateMonitoringStationsDb.plugin.name).toBe(
      'Populate Monitoring Stations Db'
    )
  })

  test('does not populate while registering, so the server can start listening', async () => {
    await populateMonitoringStationsDb.plugin.register(mockServer)

    expect(mockServer.events.once).toHaveBeenCalledWith(
      'start',
      expect.any(Function)
    )
    expect(mockPopulateApi).not.toHaveBeenCalled()
  })

  test('calls populateMonitoringStationsApi with server once the server has started', async () => {
    mockPopulateApi.mockResolvedValue(undefined)
    await populateMonitoringStationsDb.plugin.register(mockServer)

    const onStart = mockServer.events.once.mock.calls[0][1]
    onStart()

    expect(mockPopulateApi).toHaveBeenCalledWith(mockServer)
  })

  test('logs error and leaves no unhandled rejection when populateMonitoringStationsApi rejects', async () => {
    const error = new Error('startup failure')
    mockPopulateApi.mockRejectedValue(error)
    await populateMonitoringStationsDb.plugin.register(mockServer)

    const onStart = mockServer.events.once.mock.calls[0][1]
    onStart()

    await vi.waitFor(() => expect(mockLogger.error).toHaveBeenCalledWith(error))
  })
})
