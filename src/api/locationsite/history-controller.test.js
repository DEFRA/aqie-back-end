import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  monitoringStationHistoryController,
  historyCache
} from './history-controller.js'
import { fetchPollutantHistory } from './helpers/fetch-pollutant-history.js'
import { refreshOAuthToken } from './helpers/oauth-helpers.js'

vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }))
}))

vi.mock('./helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: vi.fn()
}))

vi.mock('./helpers/oauth-helpers.js', () => ({
  refreshOAuthToken: vi.fn(),
  fetchOAuthToken: vi.fn()
}))

vi.mock('./helpers/fetch-pollutant-history.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchPollutantHistory: vi.fn()
  }
})

const HTTP_OK = 200
const HTTP_BAD_REQUEST = 400
const HTTP_BAD_GATEWAY = 502

function createToolkit() {
  const toolkit = {
    response: vi.fn((payload) => {
      toolkit.payload = payload
      return toolkit
    }),
    code: vi.fn((statusCode) => {
      toolkit.statusCode = statusCode
      return toolkit
    })
  }
  return toolkit
}

function createRequest(query, savedAccessToken = 'saved-token') {
  return {
    query,
    yar: {
      get: vi.fn(() => savedAccessToken),
      set: vi.fn(),
      clear: vi.fn()
    }
  }
}

const historyResult = {
  from: '2026-09-29T12:00:00.000Z',
  to: '2026-09-30T11:00:00.000Z',
  truncated: false,
  pollutants: {
    NO2: [{ time: '2026-09-30T11:00:00.000Z', value: 32.1 }],
    PM25: [{ time: '2026-09-30T11:00:00.000Z', value: null }],
    PM10: [],
    O3: [],
    SO2: []
  },
  leadIn: { NO2: [], PM25: [], PM10: [], O3: [], SO2: [] },
  fifteenMinute: { SO2: [] }
}

describe('#monitoringStationHistoryController', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    historyCache.clear()
  })

  it('returns the time series grouped by pollutant', async () => {
    fetchPollutantHistory.mockResolvedValue(historyResult)
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315', period: '7d' }),
      h
    )

    expect(h.statusCode).toBe(HTTP_OK)
    expect(h.payload).toEqual({
      siteId: 'UKA00315',
      period: '7d',
      resolution: 'hourly',
      timeBasis: 'end',
      from: historyResult.from,
      to: historyResult.to,
      truncated: false,
      pollutants: historyResult.pollutants,
      leadIn: historyResult.leadIn,
      fifteenMinute: historyResult.fifteenMinute,
      summary: expect.objectContaining({
        daqiIndex: expect.anything(),
        pollutants: expect.objectContaining({
          NO2: expect.objectContaining({
            dataCapture: expect.objectContaining({ expectedHours: 168 })
          })
        })
      })
    })
  })

  it('defaults period to 24h', async () => {
    fetchPollutantHistory.mockResolvedValue(historyResult)
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      h
    )

    expect(h.payload.period).toBe('24h')
    expect(fetchPollutantHistory).toHaveBeenCalledWith(
      expect.objectContaining({ siteId: 'UKA00315', period: '24h' })
    )
  })

  it('surfaces the truncated flag', async () => {
    fetchPollutantHistory.mockResolvedValue({
      ...historyResult,
      truncated: true
    })
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      h
    )

    expect(h.payload.truncated).toBe(true)
  })

  it.each([
    ['missing siteId', {}],
    ['empty siteId', { siteId: '' }],
    ['non-string siteId', { siteId: ['UKA00315'] }],
    ['localSiteId form', { siteId: 'MY1' }],
    ['injection attempt', { siteId: 'UKA00315&page=2' }]
  ])('returns 400 for %s', async (_name, query) => {
    const h = createToolkit()

    await monitoringStationHistoryController.handler(createRequest(query), h)

    expect(h.statusCode).toBe(HTTP_BAD_REQUEST)
    expect(fetchPollutantHistory).not.toHaveBeenCalled()
  })

  it('returns 400 for an unknown period', async () => {
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315', period: '30d' }),
      h
    )

    expect(h.statusCode).toBe(HTTP_BAD_REQUEST)
    expect(fetchPollutantHistory).not.toHaveBeenCalled()
  })

  it('returns 502 on upstream failure rather than 200 with empty series', async () => {
    fetchPollutantHistory.mockResolvedValue({ upstreamError: true })
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      h
    )

    expect(h.statusCode).toBe(HTTP_BAD_GATEWAY)
    expect(h.payload.pollutants).toBeUndefined()
  })

  it('returns 502 when no access token can be obtained', async () => {
    refreshOAuthToken.mockResolvedValue(null)
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }, null),
      h
    )

    expect(h.statusCode).toBe(HTTP_BAD_GATEWAY)
    expect(fetchPollutantHistory).not.toHaveBeenCalled()
  })

  it('refreshes the token when the session has none', async () => {
    refreshOAuthToken.mockResolvedValue('fresh-token')
    fetchPollutantHistory.mockResolvedValue(historyResult)
    const h = createToolkit()

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }, null),
      h
    )

    expect(refreshOAuthToken).toHaveBeenCalled()
    expect(fetchPollutantHistory).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'fresh-token' })
    )
  })

  it('serves a repeated request from the cache', async () => {
    fetchPollutantHistory.mockResolvedValue(historyResult)

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      createToolkit()
    )
    const second = createToolkit()
    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      second
    )

    expect(fetchPollutantHistory).toHaveBeenCalledTimes(1)
    expect(second.statusCode).toBe(HTTP_OK)
    expect(second.payload.siteId).toBe('UKA00315')
  })

  it('does not cache an upstream failure', async () => {
    fetchPollutantHistory.mockResolvedValue({ upstreamError: true })

    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      createToolkit()
    )
    await monitoringStationHistoryController.handler(
      createRequest({ siteId: 'UKA00315' }),
      createToolkit()
    )

    expect(fetchPollutantHistory).toHaveBeenCalledTimes(2)
  })
})
