import { vi, describe, test, expect, beforeEach } from 'vitest'

import { metOfficeForecastReadController } from './read-forecast.js'
import {
  SFTP_TEST_FILENAME,
  SFTP_TEST_FILE_CONTENT
} from '../../../api/pollutants/helpers/common/constants.js'

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

describe('metOfficeForecastReadController', () => {
  let mockH
  let mockConn
  let mockSftp
  let mockRequest

  beforeEach(() => {
    vi.clearAllMocks()
    mockConn = { end: vi.fn().mockResolvedValue(undefined) }
    mockSftp = { readdir: vi.fn(), readFile: vi.fn() }
    mockConnectSftpThroughProxy.mockResolvedValue({
      sftp: mockSftp,
      conn: mockConn
    })
    mockRequest = { params: { filename: SFTP_TEST_FILENAME } }
    mockH = {
      response: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      code: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis()
    }
  })

  test('returns file content with 200 status when file is found', async () => {
    mockSftp.readdir.mockImplementation((_dir, cb) => {
      cb(null, [{ filename: SFTP_TEST_FILENAME }])
    })
    mockSftp.readFile.mockImplementation((_path, cb) => {
      cb(null, Buffer.from(SFTP_TEST_FILE_CONTENT))
    })

    await metOfficeForecastReadController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith(SFTP_TEST_FILE_CONTENT)
    expect(mockH.code).toHaveBeenCalledWith(200)
    expect(mockConn.end).toHaveBeenCalled()
  })

  test('returns 404 when file is not found in directory', async () => {
    mockSftp.readdir.mockImplementation((_dir, cb) => {
      cb(null, [{ filename: 'other-file.xml' }])
    })

    await metOfficeForecastReadController.handler(mockRequest, mockH)

    expect(mockH.response).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining(SFTP_TEST_FILENAME)
      })
    )
    expect(mockH.code).toHaveBeenCalledWith(404)
    expect(mockConn.end).toHaveBeenCalled()
  })

  test('returns 500 on SFTP connection error', async () => {
    mockConnectSftpThroughProxy.mockRejectedValue(
      new Error('connection failed')
    )

    await metOfficeForecastReadController.handler(mockRequest, mockH)

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

    await metOfficeForecastReadController.handler(mockRequest, mockH)

    expect(mockH.code).toHaveBeenCalledWith(500)
  })

  test('returns 500 when readFile fails', async () => {
    mockSftp.readdir.mockImplementation((_dir, cb) => {
      cb(null, [{ filename: SFTP_TEST_FILENAME }])
    })
    mockSftp.readFile.mockImplementation((_path, cb) => {
      cb(new Error('read failed'), null)
    })

    await metOfficeForecastReadController.handler(mockRequest, mockH)

    expect(mockH.code).toHaveBeenCalledWith(500)
  })
})
