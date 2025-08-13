import { vi, describe, test, expect, beforeEach } from 'vitest'
import { fetchOAuthToken } from './oauth-helpers.js'
import { config } from '../../../config/index.js'

// Mock the config module
vi.mock('../../../config/index.js', () => ({
  config: {
    get: vi.fn()
  }
}))

describe('#oauth-helpers', () => {
  let mockCatchProxyFetchError
  let mockLogger

  beforeEach(() => {
    vi.clearAllMocks()

    mockCatchProxyFetchError = vi.fn()
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    }
  })

  describe('#fetchOAuthToken', () => {
    test('Should return token when fetch is successful', async () => {
      // Mock config values
      config.get.mockImplementation((key) => {
        const configMap = {
          ricardoApiLoginUrl: 'https://example.com/token',
          ricardoApiEmail: 'test@example.com',
          ricardoApiPassword: 'password123'
        }
        return configMap[key]
      })

      // Mock successful response
      mockCatchProxyFetchError.mockResolvedValue([
        200,
        { token: 'test-access-token-12345' }
      ])

      const token = await fetchOAuthToken(mockCatchProxyFetchError, mockLogger)

      expect(token).toBe('test-access-token-12345')
      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(
        'https://example.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'OAuth token fetched successfully via Postman API.'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed fetchOAuthTokenNewRicardoAPI execution'
      )
    })

    test('Should handle non-200 status code and return null', async () => {
      config.get.mockImplementation((key) => {
        const configMap = {
          ricardoApiLoginUrl: 'https://example.com/token',
          ricardoApiEmail: 'test@example.com',
          ricardoApiPassword: 'password123'
        }
        return configMap[key]
      })

      // Mock failed response with non-200 status code
      mockCatchProxyFetchError.mockResolvedValue([
        401,
        { error: 'invalid_credentials' }
      ])

      const token = await fetchOAuthToken(mockCatchProxyFetchError, mockLogger)

      expect(token).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching OAuth token via Postman API: Error fetching OAuth token via Postman API: 401'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed fetchOAuthTokenNewRicardoAPI execution'
      )
    })

    test('Should handle network errors and return null', async () => {
      config.get.mockImplementation((key) => {
        const configMap = {
          ricardoApiLoginUrl: 'https://example.com/token',
          ricardoApiEmail: 'test@example.com',
          ricardoApiPassword: 'password123'
        }
        return configMap[key]
      })

      // Mock network failure
      mockCatchProxyFetchError.mockRejectedValue(new Error('Network error'))

      const token = await fetchOAuthToken(mockCatchProxyFetchError, mockLogger)

      expect(token).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching OAuth token via Postman API: Network error'
      )
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Completed fetchOAuthTokenNewRicardoAPI execution'
      )
    })

    test('Should handle different non-200 status codes', async () => {
      config.get.mockImplementation((key) => {
        const configMap = {
          ricardoApiLoginUrl: 'https://example.com/token',
          ricardoApiEmail: 'test@example.com',
          ricardoApiPassword: 'password123'
        }
        return configMap[key]
      })

      // Test 500 error
      mockCatchProxyFetchError.mockResolvedValue([
        500,
        { error: 'server_error' }
      ])

      const token = await fetchOAuthToken(mockCatchProxyFetchError, mockLogger)

      expect(token).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error fetching OAuth token via Postman API: Error fetching OAuth token via Postman API: 500'
      )
    })

    test('Should handle missing config values', async () => {
      config.get.mockReturnValue(undefined)

      mockCatchProxyFetchError.mockResolvedValue([200, { token: 'token' }])

      const token = await fetchOAuthToken(mockCatchProxyFetchError, mockLogger)
      expect(token).toBe('token')
    })
  })
})
