import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getLocalAuthorityForCoords } from './get-local-authority.js'
import { config } from '../../../config/index.js'

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() })
}))

vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn() }
}))

const mockFetch = vi.fn()

describe('getLocalAuthorityForCoords', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: null })
    })
    config.get.mockImplementation((key) => {
      if (key === 'postcodesApiUrl') return 'https://api.postcodes.io/'
      return null
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns admin_district from postcodes.io', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [{ admin_district: 'Reading' }] })
    })

    const result = await getLocalAuthorityForCoords(51.45309, -0.944067)

    expect(result).toBe('Reading')
  })

  it('returns admin_district for a Northern Ireland station', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [{ admin_district: 'Belfast' }] })
    })

    const result = await getLocalAuthorityForCoords(54.59653, -5.901667)

    expect(result).toBe('Belfast')
  })

  it('builds the correct postcodes.io URL with lon, lat, radius and wideSearch', async () => {
    await getLocalAuthorityForCoords(51.45309, -0.944067)

    const [calledUrl, calledOptions] = mockFetch.mock.calls[0]
    expect(calledUrl.toString()).toBe(
      'https://api.postcodes.io/postcodes?lon=-0.944067&lat=51.45309&radius=2000&wideSearch=true'
    )
    expect(calledOptions.signal).toBeInstanceOf(AbortSignal)
  })

  it('builds a valid URL when POSTCODES_API_URL has no trailing slash', async () => {
    config.get.mockImplementation((key) => {
      if (key === 'postcodesApiUrl') return 'https://api.postcodes.io'
      return null
    })

    await getLocalAuthorityForCoords(51.45309, -0.944067)

    const [calledUrl] = mockFetch.mock.calls[0]
    expect(calledUrl.toString()).toBe(
      'https://api.postcodes.io/postcodes?lon=-0.944067&lat=51.45309&radius=2000&wideSearch=true'
    )
  })

  it('returns null when the API responds with a non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when result is null', async () => {
    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when result array is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [] })
    })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when admin_district is absent from the result', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [{ admin_county: null }] })
    })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('fetch failed'))

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when JSON parsing throws', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error('invalid json'))
    })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })
})
