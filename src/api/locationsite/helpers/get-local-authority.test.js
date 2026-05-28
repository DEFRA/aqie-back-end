import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getLocalAuthorityForCoords } from './get-local-authority.js'
import { config } from '../../../config/index.js'
import { latLngToNationalGrid } from './lat-lng-to-national-grid.js'

vi.mock('../../../helpers/logging/logger.js', () => ({
  createLogger: () => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() })
}))

vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn() }
}))

vi.mock('./lat-lng-to-national-grid.js', () => ({
  latLngToNationalGrid: vi.fn().mockReturnValue({ easting: 473468, northing: 173207 })
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockOkResponse = (gazeteerEntry) =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        results: [{ GAZETTEER_ENTRY: gazeteerEntry }]
      })
  })

describe('getLocalAuthorityForCoords', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    config.get.mockImplementation((key) => {
      if (key === 'osNamesApiKey') return 'test-api-key'
      if (key === 'osNamesApiUrl') return 'https://api.os.uk/search/names/v1/'
      return null
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal('fetch', mockFetch)
  })

  it('returns null immediately when no API key is configured', async () => {
    config.get.mockImplementation((key) =>
      key === 'osNamesApiKey' ? '' : 'https://api.os.uk/search/names/v1/'
    )

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('returns COUNTY_UNITARY when present in the OS Names response', async () => {
    mockFetch.mockReturnValue(
      mockOkResponse({ COUNTY_UNITARY: 'Reading', DISTRICT_BOROUGH: null })
    )

    const result = await getLocalAuthorityForCoords(51.45309, -0.944067)

    expect(result).toBe('Reading')
  })

  it('falls back to DISTRICT_BOROUGH when COUNTY_UNITARY is absent', async () => {
    mockFetch.mockReturnValue(
      mockOkResponse({ DISTRICT_BOROUGH: 'South Oxfordshire' })
    )

    const result = await getLocalAuthorityForCoords(51.6, -1.1)

    expect(result).toBe('South Oxfordshire')
  })

  it('returns null when the API responds with a non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when the results array is empty', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] })
    })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when results is missing from the response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('returns null when the entry has neither COUNTY_UNITARY nor DISTRICT_BOROUGH', async () => {
    mockFetch.mockReturnValue(mockOkResponse({ NAME1: 'RG6 1LD' }))

    const result = await getLocalAuthorityForCoords(51.45, -0.94)

    expect(result).toBeNull()
  })

  it('builds the correct OS Names URL with easting, northing, radius and key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] })
    })

    await getLocalAuthorityForCoords(51.45309, -0.944067)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.os.uk/search/names/v1/nearest?point=473468,173207&radius=1000&key=test-api-key',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })

  it('converts the supplied lat/lng to BNG before building the URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] })
    })

    await getLocalAuthorityForCoords(51.45309, -0.944067)

    expect(latLngToNationalGrid).toHaveBeenCalledWith(51.45309, -0.944067)
  })
})
