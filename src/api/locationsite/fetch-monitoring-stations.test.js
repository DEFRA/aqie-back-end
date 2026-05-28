import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchMonitoringStations,
  saveMonitoringStations
} from './fetch-monitoring-stations.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { fetchOAuthToken } from './helpers/oauth-helpers.js'
import { getLocalAuthorityForCoords } from './helpers/get-local-authority.js'

vi.mock('./helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: vi.fn()
}))

vi.mock('./helpers/oauth-helpers.js', () => ({
  fetchOAuthToken: vi.fn()
}))

vi.mock('./helpers/get-local-authority.js', () => ({
  getLocalAuthorityForCoords: vi.fn()
}))

vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })
}))

vi.mock('../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'ricardoApiAllDataUrl') return 'https://mock-ricardo/all-data'
      return null
    })
  }
}))

const mockMember = (n) => ({
  siteName: `Station ${n}`,
  governmentRegion: 'South East',
  siteId: `SITE${n}`,
  siteType: 'Urban',
  areaType: 'Background',
  latitude: 51.5 + n * 0.01,
  longitude: -0.1 + n * 0.01,
  distanceFromPoint: n * 0.5,
  stationStatus: 'current'
})

describe('fetchMonitoringStations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getLocalAuthorityForCoords.mockResolvedValue('Greater London')
  })

  it('returns a mapped array of station objects on success', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([
      200,
      { member: [mockMember(1), mockMember(2)] }
    ])

    const result = await fetchMonitoringStations()

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      name: 'Station 1',
      area: 'South East',
      localAuthority: 'Greater London',
      localSiteID: 'SITE1',
      areaType: 'Urban Background',
      location: { type: 'Point' },
      distance: 0.5,
      stationStatus: 'current'
    })
    expect(result[0].location.coordinates[0]).toBeCloseTo(51.51, 5)
    expect(result[0].location.coordinates[1]).toBeCloseTo(-0.09, 5)
  })

  it('throws when OAuth token fetch fails', async () => {
    fetchOAuthToken.mockResolvedValue(null)

    await expect(fetchMonitoringStations()).rejects.toThrow(
      'Failed to fetch OAuth token for monitoring stations refresh'
    )
    expect(catchProxyFetchError).not.toHaveBeenCalled()
  })

  it('returns empty array when dataAll has no member array', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([200, {}])

    const result = await fetchMonitoringStations()

    expect(result).toEqual([])
  })

  it('returns empty array when dataAll.member is not an array', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([200, { member: null }])

    const result = await fetchMonitoringStations()

    expect(result).toEqual([])
  })

  it('returns empty array when dataAll is null', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([500, null])

    const result = await fetchMonitoringStations()

    expect(result).toEqual([])
  })

  it('passes the Bearer token in the Authorization header', async () => {
    fetchOAuthToken.mockResolvedValue('my-token-abc')
    catchProxyFetchError.mockResolvedValue([200, { member: [] }])

    await fetchMonitoringStations()

    expect(catchProxyFetchError).toHaveBeenCalledWith(
      'https://mock-ricardo/all-data?with-closed=true',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token-abc'
        })
      })
    )
  })

  it('sets localAuthority to null when getLocalAuthorityForCoords rejects', async () => {
    getLocalAuthorityForCoords.mockRejectedValue(new Error('OS Names timeout'))
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([200, { member: [mockMember(1)] }])

    const result = await fetchMonitoringStations()

    expect(result[0].localAuthority).toBeNull()
  })

  it('calls getLocalAuthorityForCoords with the station lat/lng', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([200, { member: [mockMember(1)] }])

    await fetchMonitoringStations()

    expect(getLocalAuthorityForCoords).toHaveBeenCalledWith(
      expect.closeTo(51.51, 4),
      expect.closeTo(-0.09, 4)
    )
  })

  it('returns empty array when member is an empty array', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([200, { member: [] }])

    const result = await fetchMonitoringStations()

    expect(result).toEqual([])
  })

  it('includes closed stations in the returned array', async () => {
    const closedMember = {
      ...mockMember(3),
      stationStatus: 'closed'
    }
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([
      200,
      { member: [mockMember(1), closedMember] }
    ])

    const result = await fetchMonitoringStations()

    expect(result).toHaveLength(2)
    expect(result.find((s) => s.stationStatus === 'closed')).toBeDefined()
    expect(result.find((s) => s.localSiteID === 'SITE3')).toMatchObject({
      stationStatus: 'closed'
    })
  })

  it('requests with-closed=true in the URL', async () => {
    fetchOAuthToken.mockResolvedValue('valid-token')
    catchProxyFetchError.mockResolvedValue([200, { member: [] }])

    await fetchMonitoringStations()

    const calledUrl = catchProxyFetchError.mock.calls[0][0]
    expect(calledUrl).toContain('with-closed=true')
  })
})

describe('saveMonitoringStations', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = {
      db: {
        collection: vi.fn().mockReturnValue({
          bulkWrite: vi.fn().mockResolvedValue({})
        })
      }
    }
  })

  it('calls bulkWrite with a replaceOne upsert per station', async () => {
    const stations = [
      { name: 'Station A', area: 'North' },
      { name: 'Station B', area: 'South' }
    ]

    await saveMonitoringStations(mockServer, stations)

    const collection = mockServer.db.collection.mock.results[0].value
    expect(mockServer.db.collection).toHaveBeenCalledWith('monitoringStations')
    expect(collection.bulkWrite).toHaveBeenCalledWith([
      {
        replaceOne: {
          filter: { name: 'Station A' },
          replacement: { name: 'Station A', area: 'North' },
          upsert: true
        }
      },
      {
        replaceOne: {
          filter: { name: 'Station B' },
          replacement: { name: 'Station B', area: 'South' },
          upsert: true
        }
      }
    ])
  })

  it('does not throw when bulkWrite throws — error is caught and logged', async () => {
    mockServer.db.collection.mockReturnValue({
      bulkWrite: vi.fn().mockRejectedValue(new Error('db error'))
    })

    await expect(
      saveMonitoringStations(mockServer, [{ name: 'Station A' }])
    ).resolves.not.toThrow()
  })

  it('calls bulkWrite with an empty array when stations is empty', async () => {
    await saveMonitoringStations(mockServer, [])

    const collection = mockServer.db.collection.mock.results[0].value
    expect(collection.bulkWrite).toHaveBeenCalledWith([])
  })
})
