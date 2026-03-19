import { vi, describe, test, expect, beforeEach } from 'vitest'

import { connectSftpViaProxyAgent } from './connectSftpviaProxyAgent.js'
import { HTTP_PROXY_URL } from '../../../api/pollutants/helpers/common/constants.js'

const mockProxyFetch = vi.hoisted(() => vi.fn())
const mockSftpConnect = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))
const mockConfigGet = vi.hoisted(() => vi.fn())

vi.mock('../../../helpers/proxy-fetch.js', () => ({
  proxyFetch: mockProxyFetch
}))
vi.mock('ssh2-sftp-client', () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: mockSftpConnect
  }))
}))
vi.mock('../../../config/index.js', () => ({
  config: { get: mockConfigGet }
}))
vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))

const FAKE_PRIVATE_KEY = Buffer.from('fake-key').toString('base64')

describe('connectSftpViaProxyAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigGet.mockImplementation((key) => {
      if (key === 'httpProxy') {
        return HTTP_PROXY_URL
      }
      if (key === 'sftpPrivateKey') {
        return FAKE_PRIVATE_KEY
      }
      return null
    })
  })

  test('throws when no proxy is configured', async () => {
    mockConfigGet.mockReturnValue(null)

    await expect(connectSftpViaProxyAgent()).rejects.toThrow(
      'No proxy configured'
    )
  })

  test('connects via SFTP when proxy and key are configured', async () => {
    mockProxyFetch.mockResolvedValue({ socket: {} })
    mockSftpConnect.mockResolvedValue(undefined)

    const result = await connectSftpViaProxyAgent()

    expect(mockProxyFetch).toHaveBeenCalled()
    expect(mockSftpConnect).toHaveBeenCalled()
    expect(result).toHaveProperty('sftp')
    expect(result).toHaveProperty('conn')
  })

  test('throws and logs error when proxyFetch fails', async () => {
    mockProxyFetch.mockRejectedValue(new Error('proxy connection failed'))

    await expect(connectSftpViaProxyAgent()).rejects.toThrow(
      'proxy connection failed'
    )
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('throws and logs error when SFTP connect fails', async () => {
    mockProxyFetch.mockResolvedValue({ socket: {} })
    mockSftpConnect.mockRejectedValue(new Error('SFTP auth failed'))

    await expect(connectSftpViaProxyAgent()).rejects.toThrow('SFTP auth failed')
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
