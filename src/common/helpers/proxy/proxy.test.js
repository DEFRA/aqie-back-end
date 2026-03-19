import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  HTTP_PROXY_URL,
  HTTP_PORT,
  HTTPS_PORT,
  TEST_API_URL
} from '../../../api/pollutants/helpers/common/constants.js'

import { proxyFetch, provideProxy } from './proxy.js'
import { config } from '../../../config/index.js'
import { ProxyAgent } from 'undici'

vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn() }
}))
vi.mock('undici', () => ({
  ProxyAgent: vi.fn().mockImplementation((opts) => ({ uri: opts.uri }))
}))
vi.mock('https-proxy-agent', () => ({
  HttpsProxyAgent: vi.fn().mockImplementation((url) => ({ url }))
}))
vi.mock('../logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({ debug: vi.fn() })
}))

describe('provideProxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null when no proxy is configured', () => {
    config.get.mockReturnValue(null)

    expect(provideProxy()).toBeNull()
  })

  test('returns proxy object with url, port, proxyAgent, and httpAndHttpsProxyAgent', () => {
    config.get.mockImplementation((key) =>
      key === 'httpsProxy' ? 'https://proxy.internal:443' : null
    )

    const result = provideProxy()

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('port')
    expect(result).toHaveProperty('proxyAgent')
    expect(result).toHaveProperty('httpAndHttpsProxyAgent')
  })

  test('sets port to HTTP_PORT for http proxy', () => {
    config.get.mockImplementation((key) =>
      key === 'httpsProxy' ? HTTP_PROXY_URL : null
    )

    const result = provideProxy()

    expect(result.port).toBe(HTTP_PORT)
  })

  test('sets port to HTTPS_PORT for https proxy', () => {
    config.get.mockImplementation((key) =>
      key === 'httpsProxy' ? 'https://proxy.internal:8443' : null
    )

    const result = provideProxy()

    expect(result.port).toBe(HTTPS_PORT)
  })

  test('falls back to httpProxy when httpsProxy is null', () => {
    config.get.mockImplementation((key) => {
      if (key === 'httpsProxy') {
        return null
      }
      if (key === 'httpProxy') {
        return HTTP_PROXY_URL
      }
      return null
    })

    const result = provideProxy()

    expect(result).not.toBeNull()
    expect(ProxyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ uri: HTTP_PROXY_URL })
    )
  })
})

describe('proxyFetch', () => {
  let fetchSpy

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, status: 200 })
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test('calls fetch directly when no proxy is configured', async () => {
    config.get.mockReturnValue(null)

    await proxyFetch(TEST_API_URL, { method: 'GET' })

    expect(fetchSpy).toHaveBeenCalledWith(TEST_API_URL, { method: 'GET' })
  })

  test('calls fetch with ProxyAgent dispatcher when proxy is configured', async () => {
    config.get.mockImplementation((key) =>
      key === 'httpsProxy' ? 'https://proxy.internal:443' : null
    )

    await proxyFetch(TEST_API_URL, { method: 'GET' })

    expect(fetchSpy).toHaveBeenCalledWith(
      TEST_API_URL,
      expect.objectContaining({ dispatcher: expect.any(Object) })
    )
  })
})
