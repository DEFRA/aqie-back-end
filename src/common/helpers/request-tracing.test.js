import { vi, describe, test, expect } from 'vitest'

import { requestTracing } from './request-tracing.js'

vi.mock('@defra/hapi-tracing', () => ({
  tracing: { plugin: { name: 'hapi-tracing', register: vi.fn() } }
}))
vi.mock('../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('x-trace-id') }
}))

describe('requestTracing', () => {
  test('exports a plugin object', () => {
    expect(requestTracing).toHaveProperty('plugin')
  })

  test('options include the tracing header from config', () => {
    expect(requestTracing.options).toHaveProperty('tracingHeader')
    expect(requestTracing.options.tracingHeader).toBe('x-trace-id')
  })
})
