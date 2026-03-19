import { vi, describe, test, expect } from 'vitest'

import { pulse } from './pulse.js'

vi.mock('./logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({ info: vi.fn() })
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
})
