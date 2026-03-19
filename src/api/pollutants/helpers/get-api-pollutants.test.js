import { vi, describe, test, expect, beforeEach } from 'vitest'
import {
  SITE_ALPHA,
  SITE_ALPHA_LAT,
  SITE_ALPHA_LON
} from './common/constants.js'

import { getAPIPollutants } from './get-api-pollutants.js'

const mockProxyFetch = vi.hoisted(() => vi.fn())
const mockPollutantUpdater = vi.hoisted(() => vi.fn())

vi.mock('../../../helpers/proxy-fetch.js', () => ({
  proxyFetch: mockProxyFetch
}))
vi.mock('./pollutants-updater.js', () => ({
  pollutantUpdater: mockPollutantUpdater
}))
vi.mock('../../../config/index.js', () => ({
  config: { get: vi.fn().mockReturnValue('http://pollutants-api.test/') }
}))

const CURRENT_TIME = new Date('2023-06-01')
const region = { id: 7, name: 'Eastern', split: 2 }

const mockApiResponse = [
  {
    site_name: SITE_ALPHA,
    local_site_id: 'EA001',
    location_type: 'urban',
    latitude: String(SITE_ALPHA_LAT),
    longitude: String(SITE_ALPHA_LON),
    parameter_ids: [
      {
        parameter_id: 'NO2',
        feature_of_interest: [
          {
            featureOfInterset: 'http://example.com/foi/no2',
            start_date: '2023-01-01',
            ended_date: '2023-12-31'
          }
        ]
      },
      {
        parameter_id: 'UNKNOWN',
        feature_of_interest: []
      }
    ]
  },
  {
    site_name: 'Site Beta',
    local_site_id: 'EA002',
    location_type: 'rural',
    latitude: '52.0',
    longitude: '0.5',
    parameter_ids: [
      {
        parameter_id: 'PM10',
        feature_of_interest: [
          {
            featureOfInterset: 'http://example.com/foi/pm10',
            start_date: '2023-01-01',
            ended_date: '2023-12-31'
          }
        ]
      }
    ]
  }
]

describe('getAPIPollutants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProxyFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue(mockApiResponse)
    })
    mockPollutantUpdater.mockImplementation(async (sites) => sites)
  })

  test('fetches data from the correct URL', async () => {
    await getAPIPollutants(region, CURRENT_TIME)

    expect(mockProxyFetch).toHaveBeenCalledWith('http://pollutants-api.test/7')
  })

  test('maps API response to correct site objects', async () => {
    const result = await getAPIPollutants(region, CURRENT_TIME)

    const sites = result.flat()
    expect(sites.some((s) => s.name === SITE_ALPHA)).toBe(true)
    expect(sites.some((s) => s.name === 'Site Beta')).toBe(true)
  })

  test('only includes known parameter IDs in pollutants', async () => {
    const result = await getAPIPollutants(region, CURRENT_TIME)
    const sites = result.flat()
    const siteAlpha = sites.find((s) => s.name === SITE_ALPHA)

    expect(siteAlpha.pollutants).toHaveProperty('NO2')
    expect(siteAlpha.pollutants).not.toHaveProperty('UNKNOWN')
  })

  test('sets location coordinates from latitude and longitude', async () => {
    const result = await getAPIPollutants(region, CURRENT_TIME)
    const sites = result.flat()
    const siteAlpha = sites.find((s) => s.name === SITE_ALPHA)

    expect(siteAlpha.location.type).toBe('Point')
    expect(siteAlpha.location.coordinates).toEqual([
      SITE_ALPHA_LAT,
      SITE_ALPHA_LON
    ])
  })

  test('splits sites into chunks and calls pollutantUpdater for each chunk', async () => {
    // split: 2 and 2 items → each item goes to a separate chunk → 2 updater calls
    const twoChunkRegion = { id: 7, name: 'Eastern', split: 2 }

    await getAPIPollutants(twoChunkRegion, CURRENT_TIME)

    expect(mockPollutantUpdater).toHaveBeenCalledTimes(2)
  })

  test('returns results from pollutantUpdater', async () => {
    const updatedSites = [{ name: 'Updated Site' }]
    mockPollutantUpdater.mockResolvedValue(updatedSites)

    const result = await getAPIPollutants(region, CURRENT_TIME)

    expect(result).toContain(updatedSites)
  })
})
