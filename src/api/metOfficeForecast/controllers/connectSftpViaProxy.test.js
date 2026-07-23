import { vi, describe, test, expect, beforeEach } from 'vitest'
import { EventEmitter } from 'node:events'
import { Buffer } from 'node:buffer'

const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))
const mockConfigGet = vi.hoisted(() => vi.fn())
const mockHttpRequest = vi.hoisted(() => vi.fn())

vi.mock('../../../config/index.js', () => ({
  config: { get: mockConfigGet }
}))
vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))
vi.mock('node:http', () => ({
  default: { request: mockHttpRequest }
}))
vi.mock('node:https', () => ({
  default: { request: vi.fn() }
}))

class MockSshClient extends EventEmitter {
  connect() {
    setImmediate(() => this.emit('ready'))
    return this
  }

  sftp(callback) {
    callback(null, { fake: 'sftp' })
  }
}

vi.mock('ssh2', () => ({
  Client: MockSshClient
}))

const { connectSftpThroughProxy } = await import('./connectSftpViaProxy.js')

const DECODED_PRIVATE_KEY = 'PRIVATE-KEY-CONTENT-that-must-never-be-logged'
const ENCODED_PRIVATE_KEY = Buffer.from(DECODED_PRIVATE_KEY).toString('base64')

describe('connectSftpThroughProxy secret logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConfigGet.mockImplementation((key) => {
      const configMap = {
        httpProxyNew: 'http://proxy.example.com:3128',
        sftpPrivateKey: ENCODED_PRIVATE_KEY
      }
      return configMap[key]
    })
  })

  test('Should never write the decoded private key to any log', async () => {
    const fakeReq = new EventEmitter()
    fakeReq.end = vi.fn()
    mockHttpRequest.mockImplementation(() => {
      setImmediate(() => {
        fakeReq.emit('connect', { statusCode: 200 }, {})
      })
      return fakeReq
    })

    const result = await connectSftpThroughProxy()

    expect(result).toHaveProperty('sftp')
    expect(result).toHaveProperty('conn')

    const allLoggedText = [
      ...mockLogger.info.mock.calls,
      ...mockLogger.error.mock.calls
    ]
      .flat()
      .join('\n')

    expect(allLoggedText).not.toContain(DECODED_PRIVATE_KEY)
  })
})
