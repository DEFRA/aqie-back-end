import { vi, describe, test, expect, beforeEach } from 'vitest'

import { secureContext } from './secure-context.js'

const mockGetTrustStoreCerts = vi.hoisted(() => vi.fn())

vi.mock('./get-trust-store-certs.js', () => ({
  getTrustStoreCerts: mockGetTrustStoreCerts
}))

describe('secureContext plugin', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = {
      logger: { info: vi.fn() },
      decorate: vi.fn()
    }
  })

  test('plugin has correct name', () => {
    expect(secureContext.plugin.name).toBe('secure-context')
  })

  test('decorates server with secureContext', async () => {
    mockGetTrustStoreCerts.mockReturnValue([])

    await secureContext.plugin.register(mockServer)

    expect(mockServer.decorate).toHaveBeenCalledWith(
      'server',
      'secureContext',
      expect.any(Object)
    )
  })

  test('adds CA certs from trust store', async () => {
    const fakeCert = 'FAKE_CERT_DATA'
    mockGetTrustStoreCerts.mockReturnValue([fakeCert])

    await secureContext.plugin.register(mockServer)

    expect(mockServer.decorate).toHaveBeenCalled()
  })

  test('logs info when no TRUSTSTORE_ certs are found', async () => {
    mockGetTrustStoreCerts.mockReturnValue([])

    await secureContext.plugin.register(mockServer)

    expect(mockServer.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('TRUSTSTORE_')
    )
  })
})
