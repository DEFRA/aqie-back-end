import { vi, describe, test, expect } from 'vitest'

import { pulse } from './pulse.js'

const mockLogger = vi.hoisted(() => ({ info: vi.fn() }))

vi.mock('./logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('hapi-pulse', () => ({ default: {} }))

describe('pulse', () => {
  test('exports a plugin object with hapiPulse as the plugin', () => {
    expect(pulse).toHaveProperty('plugin')
    expect(pulse).toHaveProperty('options')
  })

  test('options include a logger and timeout', () => {
    expect(pulse.options).toHaveProperty('logger')
    expect(pulse.options).toHaveProperty('timeout')
    expect(typeof pulse.options.timeout).toBe('number')
  })

  test('logs when shutdown starts and when the server has stopped', async () => {
    await pulse.options.preServerStop()
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Shutdown signal received, stopping server'
    )

    await pulse.options.postServerStop()
    expect(mockLogger.info).toHaveBeenCalledWith('Server stopped, exiting')
  })
})
