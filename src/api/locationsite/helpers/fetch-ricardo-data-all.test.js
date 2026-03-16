import { describe, it, expect, vi } from 'vitest'
import { fetchRicardoDataAll } from './fetch-ricardo-data-all.js'

describe('fetchRicardoDataAll', () => {
  const baseUrl = 'https://api.example.com/data'
  const optionsOAuthRicardo = { headers: { Authorization: 'Bearer token' } }

  describe('buildqueryparam (via fetchRicardoDataAll)', () => {
    it('builds URL with all allowed query params', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {
          page: '1',
          'networks[]': ['net1', 'net2'],
          'with-closed': 'true',
          'with-pollutants': 'true',
          'start-date': '2024-01-01',
          latitude: '51.5',
          longitude: '-0.1',
          distance: '10'
        },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.get('page')).toBe('1')
      expect(url.searchParams.getAll('networks[]')).toEqual(['net1', 'net2'])
      expect(url.searchParams.get('with-closed')).toBe('true')
      expect(url.searchParams.get('with-pollutants')).toBe('true')
      expect(url.searchParams.get('start-date')).toBe('2024-01-01')
      expect(url.searchParams.get('latitude')).toBe('51.5')
      expect(url.searchParams.get('longitude')).toBe('-0.1')
      expect(url.searchParams.get('distance')).toBe('10')
    })

    it('skips undefined values', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { page: undefined },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.has('page')).toBe(false)
    })

    it('skips null values', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { page: null },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.has('page')).toBe(false)
    })

    it('skips empty string values', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { page: '' },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.has('page')).toBe(false)
    })

    it('skips undefined/null/empty string items in array values', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {
          'networks[]': [undefined, null, '', 'validNet']
        },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.getAll('networks[]')).toEqual(['validNet'])
    })

    it('handles empty requestQuery', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.search).toBe('')
    })

    it('ignores keys not in allowedKeys', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { unknownKey: 'value', page: '2' },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.has('unknownKey')).toBe(false)
      expect(url.searchParams.get('page')).toBe('2')
    })

    it('converts non-string scalar values to string', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { page: 3, latitude: 51.5 },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.get('page')).toBe('3')
      expect(url.searchParams.get('latitude')).toBe('51.5')
    })

    it('handles networks[] with a single valid value', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { 'networks[]': ['onlyNet'] },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.getAll('networks[]')).toEqual(['onlyNet'])
    })

    it('handles networks[] with all invalid values resulting in no param', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { 'networks[]': [undefined, null, ''] },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.getAll('networks[]')).toEqual([])
    })

    it('preserves base URL path when appending query params', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { page: '1' },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.pathname).toBe('/data')
      expect(url.origin).toBe('https://api.example.com')
    })

    it('handles boolean false value for with-closed', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { 'with-closed': 'false' },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.get('with-closed')).toBe('false')
    })

    it('handles zero as a valid value for distance', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { distance: 0 },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.get('distance')).toBe('0')
    })

    it('handles negative longitude value', async () => {
      let capturedUrl
      const catchProxyFetchError = vi.fn(async (url) => {
        capturedUrl = url
        return [null, { items: [] }]
      })

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { longitude: '-180' },
        catchProxyFetchError
      })

      const url = new URL(capturedUrl)
      expect(url.searchParams.get('longitude')).toBe('-180')
    })
  })

  describe('fetchRicardoDataAll error handling', () => {
    it('throws if catchProxyFetchError is not a function', async () => {
      await expect(
        fetchRicardoDataAll({
          ricardoApiAllDataUrl: baseUrl,
          optionsOAuthRicardo,
          requestQuery: {},
          catchProxyFetchError: undefined
        })
      ).rejects.toThrow(
        'catchProxyFetchError must be provided as a function dependency'
      )
    })

    it('throws if catchProxyFetchError is null', async () => {
      await expect(
        fetchRicardoDataAll({
          ricardoApiAllDataUrl: baseUrl,
          optionsOAuthRicardo,
          requestQuery: {},
          catchProxyFetchError: null
        })
      ).rejects.toThrow(
        'catchProxyFetchError must be provided as a function dependency'
      )
    })

    it('throws if catchProxyFetchError is a string', async () => {
      await expect(
        fetchRicardoDataAll({
          ricardoApiAllDataUrl: baseUrl,
          optionsOAuthRicardo,
          requestQuery: {},
          catchProxyFetchError: 'not-a-function'
        })
      ).rejects.toThrow(
        'catchProxyFetchError must be provided as a function dependency'
      )
    })

    it('throws if catchProxyFetchError is a number', async () => {
      await expect(
        fetchRicardoDataAll({
          ricardoApiAllDataUrl: baseUrl,
          optionsOAuthRicardo,
          requestQuery: {},
          catchProxyFetchError: 42
        })
      ).rejects.toThrow(
        'catchProxyFetchError must be provided as a function dependency'
      )
    })

    it('throws if catchProxyFetchError is an object', async () => {
      await expect(
        fetchRicardoDataAll({
          ricardoApiAllDataUrl: baseUrl,
          optionsOAuthRicardo,
          requestQuery: {},
          catchProxyFetchError: {}
        })
      ).rejects.toThrow(
        'catchProxyFetchError must be provided as a function dependency'
      )
    })

    it('returns {} when catchProxyFetchError throws', async () => {
      const catchProxyFetchError = vi.fn(async () => {
        throw new Error('Network error')
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching Ricardo data:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('logs the correct error message when catchProxyFetchError throws', async () => {
      const networkError = new Error('Network error')
      const catchProxyFetchError = vi.fn(async () => {
        throw networkError
      })
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching Ricardo data:',
        networkError
      )
      consoleSpy.mockRestore()
    })

    it('returns {} when dataAll is null', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, null])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
    })

    it('returns {} when dataAll is undefined', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, undefined])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
    })

    it('returns {} when dataAll is a string', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, 'not-an-object'])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
    })

    it('returns {} when dataAll is a number', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, 42])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
    })

    it('returns {} when dataAll is false', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, false])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
    })

    it('returns {} when dataAll is an array', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, [1, 2, 3]])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual([1, 2, 3])
    })

    it('returns dataAll when it is a valid object', async () => {
      const mockData = { items: [{ id: 1 }, { id: 2 }], total: 2 }
      const catchProxyFetchError = vi.fn(async () => [null, mockData])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual(mockData)
    })

    it('returns dataAll when it is an empty object', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, {}])

      const result = await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(result).toEqual({})
    })

    it('passes correct url and options to catchProxyFetchError', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, { data: 'ok' }])

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: { page: '1' },
        catchProxyFetchError
      })

      expect(catchProxyFetchError).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        optionsOAuthRicardo
      )
    })

    it('calls catchProxyFetchError exactly once', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, { items: [] }])

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(catchProxyFetchError).toHaveBeenCalledTimes(1)
    })

    it('passes optionsOAuthRicardo as second argument to catchProxyFetchError', async () => {
      const customOptions = { headers: { Authorization: 'Bearer custom' } }
      const catchProxyFetchError = vi.fn(async () => [null, { items: [] }])

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo: customOptions,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(catchProxyFetchError).toHaveBeenCalledWith(
        expect.any(String),
        customOptions
      )
    })

    it('does not call console.error on success', async () => {
      const catchProxyFetchError = vi.fn(async () => [null, { items: [] }])
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await fetchRicardoDataAll({
        ricardoApiAllDataUrl: baseUrl,
        optionsOAuthRicardo,
        requestQuery: {},
        catchProxyFetchError
      })

      expect(consoleSpy).not.toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })
})
