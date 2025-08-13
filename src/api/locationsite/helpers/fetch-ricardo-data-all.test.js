import { vi, describe, test, expect, beforeEach } from 'vitest'
import { fetchRicardoDataAll } from './fetch-ricardo-data-all.js'

describe('#fetch-ricardo-data-all', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    console.error.mockRestore?.()
  })

  describe('#fetchRicardoDataAll', () => {
    test('Should build correct URL with default query parameters', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: mockCatchProxyFetchError
      }

      const today = new Date().toISOString().split('T')[0]
      await fetchRicardoDataAll(mockParams)

      const expectedUrl = `https://api.example.com?page=1&networks[]=4&with-closed=false&with-pollutants=true&start-date=${today}&latitude=50.950300&longitude=-1.356700&distance=62`
      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(expectedUrl, {
        headers: {}
      })
    })

    test('Should use provided request query values when available', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {
          page: '2',
          'networks[]': '5',
          latitude: '51.5074',
          longitude: '-0.1278',
          distance: '100'
        },
        catchProxyFetchError: mockCatchProxyFetchError
      }

      await fetchRicardoDataAll(mockParams)

      const today = new Date().toISOString().split('T')[0]
      const expectedUrl = `https://api.example.com?page=2&networks[]=5&with-closed=false&with-pollutants=true&start-date=${today}&latitude=51.5074&longitude=-0.1278&distance=100`
      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(expectedUrl, {
        headers: {}
      })
    })

    test('Should handle undefined and null values correctly', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {
          latitude: undefined,
          longitude: null,
          distance: 0
        },
        catchProxyFetchError: mockCatchProxyFetchError
      }

      await fetchRicardoDataAll(mockParams)

      const today = new Date().toISOString().split('T')[0]
      const expectedUrl = `https://api.example.com?page=1&networks[]=4&with-closed=false&with-pollutants=true&start-date=${today}&latitude=50.950300&longitude=null&distance=0`
      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(expectedUrl, {
        headers: {}
      })
    })

    test('Should properly encode special characters in query params', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {
          latitude: '50.950300',
          longitude: '-1.356700'
        },
        catchProxyFetchError: mockCatchProxyFetchError
      }

      await fetchRicardoDataAll(mockParams)

      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(
        expect.stringContaining('latitude=50.950300&longitude=-1.356700'),
        { headers: {} }
      )
    })

    test('Should throw error when catchProxyFetchError is not a function', async () => {
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: 'not-a-function'
      }

      await expect(fetchRicardoDataAll(mockParams)).rejects.toThrow(
        'catchProxyFetchError must be provided as a function dependency'
      )
    })

    test('Should handle URL that already ends with ?', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com?',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: { page: '1' },
        catchProxyFetchError: mockCatchProxyFetchError
      }

      await fetchRicardoDataAll(mockParams)

      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(
        expect.stringMatching(/^https:\/\/api\.example\.com\?page=1&/),
        { headers: {} }
      )
    })

    test('Should handle URL that already contains query params', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com?existing=param',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: { page: '1' },
        catchProxyFetchError: mockCatchProxyFetchError
      }

      await fetchRicardoDataAll(mockParams)

      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(
        expect.stringMatching(
          /^https:\/\/api\.example\.com\?existing=param&page=1&/
        ),
        { headers: {} }
      )
    })

    test('Should handle empty params correctly', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, { member: [] }])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: mockCatchProxyFetchError
      }

      await fetchRicardoDataAll(mockParams)

      expect(mockCatchProxyFetchError).toHaveBeenCalledWith(
        expect.stringContaining('https://api.example.com?'),
        { headers: {} }
      )
    })

    test('Should return data from successful fetch', async () => {
      const mockData = { member: [{ id: 1, name: 'Test Site' }] }
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, mockData])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: mockCatchProxyFetchError
      }

      const result = await fetchRicardoDataAll(mockParams)

      expect(result).toEqual(mockData)
    })

    test('Should return empty object when fetch fails', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockRejectedValue(new Error('Network failed'))
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: mockCatchProxyFetchError
      }

      const result = await fetchRicardoDataAll(mockParams)

      expect(result).toEqual({})
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching Ricardo data:',
        expect.any(Error)
      )
    })

    test('Should return empty object when dataAll is undefined', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, undefined])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: mockCatchProxyFetchError
      }

      const result = await fetchRicardoDataAll(mockParams)

      expect(result).toEqual({})
    })

    test('Should return empty object when dataAll is not an object', async () => {
      const mockCatchProxyFetchError = vi
        .fn()
        .mockResolvedValue([200, 'invalid data'])
      const mockParams = {
        ricardoApiAllDataUrl: 'https://api.example.com',
        optionsOAuthRicardo: { headers: {} },
        requestQuery: {},
        catchProxyFetchError: mockCatchProxyFetchError
      }

      const result = await fetchRicardoDataAll(mockParams)

      expect(result).toEqual({})
    })
  })
})
