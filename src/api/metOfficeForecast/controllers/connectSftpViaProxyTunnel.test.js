import { vi, describe, test, expect, beforeEach } from 'vitest'

import { connectSftpViaProxyTunnel } from './connectSftpViaProxyTunnel.js'
import { Client } from 'ssh2'
import { HTTP_PROXY_URL } from '../../../api/pollutants/helpers/common/constants.js'

const mockCreateSocket = vi.hoisted(() => vi.fn())
const mockConfigGet = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))

vi.mock('tunnel', () => ({
  default: {
    httpsOverHttp: vi.fn().mockReturnValue({ createSocket: mockCreateSocket })
  }
}))
vi.mock('ssh2', () => {
  const mockConn = {
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockReturnThis(),
    sftp: vi.fn()
  }
  return { Client: vi.fn().mockImplementation(() => mockConn) }
})
vi.mock('../../../config/index.js', () => ({
  config: { get: mockConfigGet }
}))
vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))

const FAKE_PRIVATE_KEY = Buffer.from('fake-key').toString('base64')

function buildMockConn({ triggerEvent = 'ready', triggerArg, sftpImpl } = {}) {
  return {
    on: vi.fn().mockImplementation(function (event, handler) {
      if (event === triggerEvent) {
        setTimeout(() => handler(triggerArg), 0)
      }
      return this
    }),
    connect: vi.fn().mockReturnThis(),
    sftp: sftpImpl ?? vi.fn()
  }
}

function setupSocket() {
  const socket = {}
  mockCreateSocket.mockImplementation((_opts, cb) => cb(null, socket))
  return socket
}

describe('connectSftpViaProxyTunnel', () => {
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

  test('resolves with sftp and conn on successful connection', async () => {
    setupSocket()
    const mockSftp = {}
    const mockConnInstance = buildMockConn({
      sftpImpl: (cb) => cb(null, mockSftp)
    })
    Client.mockImplementation(() => mockConnInstance)

    const result = await connectSftpViaProxyTunnel()

    expect(result).toHaveProperty('sftp', mockSftp)
    expect(result).toHaveProperty('conn', mockConnInstance)
  })

  test('rejects when tunnel socket creation fails', async () => {
    mockCreateSocket.mockImplementation((_opts, cb) =>
      cb(new Error('tunnel failed'), null)
    )

    await expect(connectSftpViaProxyTunnel()).rejects.toThrow(
      'Failed to create tunnel socket'
    )
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('rejects when SFTP open fails', async () => {
    setupSocket()
    const mockConnInstance = buildMockConn({
      sftpImpl: (cb) => cb(new Error('sftp open failed'), null)
    })
    Client.mockImplementation(() => mockConnInstance)

    await expect(connectSftpViaProxyTunnel()).rejects.toThrow(
      'sftp open failed'
    )
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('rejects when SSH connection emits error', async () => {
    setupSocket()
    const mockConnInstance = buildMockConn({
      triggerEvent: 'error',
      triggerArg: new Error('ssh error')
    })
    Client.mockImplementation(() => mockConnInstance)

    await expect(connectSftpViaProxyTunnel()).rejects.toThrow('ssh error')
  })
})
