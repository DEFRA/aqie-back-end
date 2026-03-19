import { vi, describe, test, expect, beforeEach } from 'vitest'

import { metOfficeForecastListController } from './list-forecast.js'

const mockConnectSftpThroughProxy = vi.hoisted(() => vi.fn())
const mockLogger = vi.hoisted(() => ({
  info: vi.fn(),
  error: vi.fn()
}))

vi.mock('./connectSftpViaProxy.js', () => ({
  connectSftpThroughProxy: mockConnectSftpThroughProxy
}))
vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://localhost:3000') }
}))
vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue(mockLogger)
}))

describe('metOfficeForecastListController', () => {
  let mockH
  let mockConn
  let mockSftp

  beforeEach(() => {
    vi.clearAllMocks()
    mockConn = { end: vi.fn().mockResolvedValue(undefined) }
    mockSftp = { readdir: vi.fn() }
    mockConnectSftpThroughProxy.mockResolvedValue({
      sftp: mockSftp,
      conn: mockConn
    })
    mockH = {
      response: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis()
    }
  })

  test('returns file list with 200 status on success', async () => {
    mockSftp.readdir.mockImplementation((_dir, cb) => {
      cb(null, [{ filename: 'file1.xml' }, { filename: 'file2.xml' }])
    })

    await metOfficeForecastListController.handler({}, mockH)

    expect(mockH.response).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        files: ['file1.xml', 'file2.xml']
      })
    )
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(mockConn.end).toHaveBeenCalled()
  })

  test('returns 500 on SFTP connection error', async () => {
    mockConnectSftpThroughProxy.mockRejectedValue(new Error('SFTP failed'))

    await metOfficeForecastListController.handler({}, mockH)

    expect(mockH.response).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    )
    expect(mockH.code).toHaveBeenCalledWith(500)
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('returns 500 when readdir fails', async () => {
    mockSftp.readdir.mockImplementation((_dir, cb) => {
      cb(new Error('readdir failed'), null)
    })

    await metOfficeForecastListController.handler({}, mockH)

    expect(mockH.code).toHaveBeenCalledWith(500)
  })
})
