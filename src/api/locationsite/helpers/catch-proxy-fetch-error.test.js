import { vi, describe, test, expect, beforeEach } from 'vitest'
import { catchProxyFetchError } from './catch-proxy-fetch-error.js'

// Mock dependencies
vi.mock('../../../common/helpers/proxy/proxy.js', () => ({
  proxyFetch: vi.fn()
}))

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn()
  })
}))

// Mock performance.now() for consistent timing tests
global.performance = {
  now: vi.fn(() => 100)
}

describe('#catch-proxy-fetch-error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.performance.now.mockReturnValue(100)
  })

  test('Should successfully return status code and data when fetch succeeds', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'GET', headers: {} }
    const mockResponseData = { data: 'test' }
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResponseData)
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(proxyFetch).toHaveBeenCalledWith(mockUrl, mockOptions)
    expect(result).toEqual([200, mockResponseData])
    expect(mockResponse.json).toHaveBeenCalled()
  })

  test('Should return error array when response is not ok', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'GET', headers: {} }
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found'
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe(
      'HTTP error! status from https://api.example.com/data: 404'
    )
  })

  test('Should return error array when network request fails', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'GET', headers: {} }
    const networkError = new Error('Network error')

    proxyFetch.mockRejectedValue(networkError)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(networkError)
  })

  test('Should return error array when JSON parsing fails', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'GET', headers: {} }
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe('Invalid JSON')
  })

  test('Should handle different HTTP status codes', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'POST', headers: {} }
    const mockResponseData = { success: true }
    const mockResponse = {
      ok: true,
      status: 201,
      json: vi.fn().mockResolvedValue(mockResponseData)
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(result).toEqual([201, mockResponseData])
  })

  test('Should handle server errors (5xx)', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'GET', headers: {} }
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe(
      'HTTP error! status from https://api.example.com/data: 500'
    )
  })

  test('Should handle authentication errors (401)', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = { method: 'GET', headers: {} }
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(result).toHaveLength(1)
    expect(result[0]).toBeInstanceOf(Error)
    expect(result[0].message).toBe(
      'HTTP error! status from https://api.example.com/data: 401'
    )
  })

  test('Should work with complex request options', async () => {
    const { proxyFetch } = await vi.importMock(
      '../../../common/helpers/proxy/proxy.js'
    )

    const mockUrl = 'https://api.example.com/data'
    const mockOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify({ test: 'data' })
    }
    const mockResponseData = { updated: true }
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResponseData)
    }

    proxyFetch.mockResolvedValue(mockResponse)

    const result = await catchProxyFetchError(mockUrl, mockOptions)

    expect(proxyFetch).toHaveBeenCalledWith(mockUrl, mockOptions)
    expect(result).toEqual([200, mockResponseData])
  })
})
