import { vi, describe, test, expect, beforeEach } from 'vitest'

import { proxyFetch } from './proxy-fetch.js'
import { config } from '../config/index.js'
import { ProxyAgent } from 'undici'
import {
  HTTP_PROXY_URL,
  HTTPS_PROXY_TEST_URL,
  TEST_API_URL
} from '../api/pollutants/helpers/common/constants.js'

const mockUndiciFetch = vi.hoisted(() => vi.fn())

vi.mock('../config/index.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('undici', () => ({
  ProxyAgent: vi.fn().mockImplementation((opts) => ({ uri: opts.uri })),
  fetch: mockUndiciFetch
}))

describe('proxyFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUndiciFetch.mockResolvedValue({ ok: true, status: 200 })
  })

  test('calls fetch directly when no proxy is configured', async () => {
    config.get.mockReturnValue(null)

    await proxyFetch(TEST_API_URL, { method: 'GET' })

    expect(mockUndiciFetch).toHaveBeenCalledWith(TEST_API_URL, {
      method: 'GET'
    })
    expect(ProxyAgent).not.toHaveBeenCalled()
  })

  test('uses ProxyAgent when httpsProxy is configured', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'httpsProxy') {
        return HTTPS_PROXY_TEST_URL
      }
      return null
    })

    await proxyFetch(TEST_API_URL, { method: 'GET' })

    expect(ProxyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ uri: HTTPS_PROXY_TEST_URL })
    )
    expect(mockUndiciFetch).toHaveBeenCalledWith(
      TEST_API_URL,
      expect.objectContaining({ method: 'GET', dispatcher: expect.any(Object) })
    )
  })

  test('uses httpProxy as fallback when httpsProxy is not set', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'httpsProxy') {
        return null
      }
      if (key === 'httpProxy') {
        return HTTP_PROXY_URL
      }
      return null
    })

    await proxyFetch(TEST_API_URL, {})

    expect(ProxyAgent).toHaveBeenCalledWith(
      expect.objectContaining({ uri: HTTP_PROXY_URL })
    )
  })

  test('passes options to fetch when no proxy is set', async () => {
    config.get.mockReturnValue(null)
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }

    await proxyFetch(TEST_API_URL, opts)

    expect(mockUndiciFetch).toHaveBeenCalledWith(TEST_API_URL, opts)
  })
})
