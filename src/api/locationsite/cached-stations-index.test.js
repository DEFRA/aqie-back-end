import { vi, describe, test, expect } from 'vitest'

vi.mock('./cached-stations-controller.js', () => ({
  cachedStationsController: {
    handler: vi.fn()
  }
}))

const { monitoringStations } = await import('./cached-stations-index.js')

describe('#monitoringStations', () => {
  test('Should be a plugin with correct structure', () => {
    expect(monitoringStations).toBeDefined()
    expect(monitoringStations.plugin).toBeDefined()
    expect(monitoringStations.plugin.name).toBe('monitoringStations')
    expect(typeof monitoringStations.plugin.register).toBe('function')
  })

  test('Should register route correctly', async () => {
    const mockServer = {
      route: vi.fn()
    }

    await monitoringStations.plugin.register(mockServer)

    expect(mockServer.route).toHaveBeenCalledWith({
      method: 'GET',
      path: '/monitoringStations',
      handler: expect.any(Function)
    })
  })
})
