import { describe, test, expect } from 'vitest'
import { failAction } from './fail-action.js'

describe('failAction', () => {
  test('throws the provided error', () => {
    const mockRequest = { logger: { error: () => {} } }
    const mockError = new Error('Validation failed')

    expect(() => failAction(mockRequest, {}, mockError)).toThrow(
      'Validation failed'
    )
  })

  test('logs the error before throwing', () => {
    const logSpy = { error: vi.fn() }
    const mockRequest = { logger: logSpy }
    const mockError = new Error('Bad input')

    expect(() => failAction(mockRequest, {}, mockError)).toThrow()

    expect(logSpy.error).toHaveBeenCalledWith(mockError, mockError.message)
  })
})
