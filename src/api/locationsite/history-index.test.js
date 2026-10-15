import { vi, describe, test, expect } from 'vitest'

vi.mock('./history-controller.js', () => ({
  monitoringStationHistoryController: {
    handler: vi.fn()
  }
}))

const { monitoringStationHistory } = await import('./history-index.js')

describe('#monitoringStationHistory', () => {
  test('Should be a plugin with correct structure', () => {
    expect(monitoringStationHistory).toBeDefined()
    expect(monitoringStationHistory.plugin).toBeDefined()
    expect(monitoringStationHistory.plugin.name).toBe(
      'monitoringStationHistory'
    )
    expect(typeof monitoringStationHistory.plugin.register).toBe('function')
  })

  test('Should register route correctly', async () => {
    const mockServer = {
      route: vi.fn()
    }

    await monitoringStationHistory.plugin.register(mockServer)

    expect(mockServer.route).toHaveBeenCalledWith({
      method: 'GET',
      path: '/monitoringStationHistory',
      handler: expect.any(Function)
    })
  })
})
