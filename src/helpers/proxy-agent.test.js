import { vi, describe, test, expect, beforeEach } from 'vitest'

import { proxyAgent } from './proxy-agent.js'
import { config } from '../config/index.js'
import { HTTPS_PROXY_TEST_URL } from '../api/pollutants/helpers/common/constants.js'

vi.mock('../config/index.js', () => ({
  config: { get: vi.fn() }
}))
vi.mock('https-proxy-agent', () => ({
  HttpsProxyAgent: vi.fn().mockImplementation((url) => ({ url }))
}))

describe('proxyAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns null when httpsProxy is not configured', () => {
    config.get.mockReturnValue(null)

    const result = proxyAgent()

    expect(result).toBeNull()
  })

  test('returns proxy object with url and agent when httpsProxy is set', () => {
    config.get.mockReturnValue(HTTPS_PROXY_TEST_URL)

    const result = proxyAgent()

    expect(result).not.toBeNull()
    expect(result).toHaveProperty('url')
    expect(result).toHaveProperty('agent')
  })
})
