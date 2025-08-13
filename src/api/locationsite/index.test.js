import { vi, describe, test, expect } from 'vitest'

// Mock the controller first
vi.mock('./controller.js', () => ({
  siteController: {
    handler: vi.fn(),
    options: { id: 'site' },
    validate: {
      query: {}
    }
  }
}))

// Import after mocking
const { monitoringStationInfo } = await import('./index.js')

describe('#monitoringStationInfo', () => {
  test('Should be a plugin with correct structure', () => {
    expect(monitoringStationInfo).toBeDefined()
    expect(monitoringStationInfo.plugin).toBeDefined()
    expect(monitoringStationInfo.plugin.name).toBe('site')
    expect(typeof monitoringStationInfo.plugin.register).toBe('function')
  })

  test('Should register route correctly', async () => {
    const mockServer = {
      route: vi.fn()
    }

    await monitoringStationInfo.plugin.register(mockServer)

    expect(mockServer.route).toHaveBeenCalledWith({
      method: 'GET',
      path: '/monitoringStationInfo',
      handler: expect.any(Function),
      options: expect.any(Object),
      validate: expect.any(Object)
    })
  })
})
