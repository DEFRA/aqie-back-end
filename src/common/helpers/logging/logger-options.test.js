import { vi, describe, test, expect, beforeEach } from 'vitest'

const mockGetTraceId = vi.hoisted(() => vi.fn())

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: mockGetTraceId
}))

vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      const values = {
        log: { isEnabled: true, redact: [], level: 'info', format: 'ecs' },
        serviceName: 'test-service',
        serviceVersion: '1.0.0'
      }
      return values[key]
    })
  }
}))

vi.mock('@elastic/ecs-pino-format', () => ({
  ecsFormat: vi.fn().mockReturnValue({})
}))

describe('#logger-options mixin', () => {
  let loggerOptions

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    ;({ loggerOptions } = await import('./logger-options.js'))
  })

  test('returns empty object when getTraceId returns undefined', () => {
    mockGetTraceId.mockReturnValue(undefined)

    expect(loggerOptions.mixin()).toEqual({})
  })

  test('returns trace object when getTraceId returns an id', () => {
    mockGetTraceId.mockReturnValue('abc-123')

    expect(loggerOptions.mixin()).toEqual({ trace: { id: 'abc-123' } })
  })
})
