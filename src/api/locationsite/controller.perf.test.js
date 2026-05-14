/**
 * Performance characterisation test for /monitoringStationInfo
 *
 * External HTTP calls and the MongoDB read are replaced with configurable
 * simulated delays. Adjust DELAYS to match real observed latencies —
 * catchProxyFetchError already logs each call's duration in production.
 *
 * Run:
 *   npx vitest run src/api/locationsite/controller.perf.test.js --reporter=verbose
 *
 * Three tests are included:
 *   1. Cached path (default)   — single DB read, no Ricardo calls
 *   2. Live path (stream=data) — OAuth + all-stations fetch, no per-site enrichment
 *   3. Cached vs live comparison table
 */

import { describe, it, vi, beforeEach, expect } from 'vitest'
import { siteController } from './controller.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { refreshOAuthToken } from './helpers/oauth-helpers.js'
import { getMonitoringStations } from './helpers/get-monitoring-stations.js'

// ─── Tune these to match observed production latencies (ms) ──────────────────
const DELAYS = {
  dbRead: 5, // MongoDB monitoringStations collection read (local/Atlas)
  oauthLogin: 350, // Ricardo OAuth login round-trip
  allDataFetch: 850 // GET ricardoApiAllDataUrl — full station list
}
// ─────────────────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildMockStations(count) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Mock Station ${i + 1}`,
    area: 'South East',
    localSiteID: `SITE${String(i + 1).padStart(3, '0')}`,
    areaType: 'Urban Background',
    location: { type: 'Point', coordinates: [51.5 + i * 0.01, -0.1] },
    distance: i * 0.5
  }))
}

function buildMockDataAll(count) {
  return {
    member: Array.from({ length: count }, (_, i) => ({
      siteName: `Mock Station ${i + 1}`,
      governmentRegion: 'South East',
      siteId: `SITE${String(i + 1).padStart(3, '0')}`,
      siteType: 'Urban',
      areaType: 'Background',
      latitude: 51.5 + i * 0.01,
      longitude: -0.1 + i * 0.01,
      distanceFromPoint: i * 0.5
    }))
  }
}

// ─── Module mocks ─────────────────────────────────────────────────────────────
vi.mock('./helpers/catch-proxy-fetch-error.js', () => ({
  catchProxyFetchError: vi.fn()
}))
vi.mock('./helpers/oauth-helpers.js', () => ({
  refreshOAuthToken: vi.fn(),
  fetchOAuthToken: vi.fn()
}))
vi.mock('./helpers/get-monitoring-stations.js', () => ({
  getMonitoringStations: vi.fn()
}))
vi.mock('../../helpers/logging/logger.js', () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })
}))
vi.mock('../../config/index.js', () => ({
  config: {
    get: vi.fn((key) => {
      const values = {
        ricardoApiAllDataUrl: 'https://mock-ricardo/all',
        ricardoApiLoginUrl: 'https://mock-ricardo/login',
        ricardoApiEmail: 'test@example.com',
        ricardoApiPassword: 'password',
        isTest: true,
        logLevel: 'silent',
        isDevelopment: false
      }
      return values[key] ?? null
    })
  }
}))
// ─────────────────────────────────────────────────────────────────────────────

describe('/monitoringStationInfo — pipeline performance characterisation', () => {
  let mockRequest
  let mockH

  beforeEach(() => {
    vi.clearAllMocks()
    mockRequest = {
      yar: {
        get: vi.fn().mockReturnValue(null),
        set: vi.fn(),
        clear: vi.fn()
      },
      query: {},
      db: {}
    }
    mockH = {
      response: vi.fn().mockImplementation(() => ({
        code: vi.fn().mockReturnThis()
      }))
    }
  })

  // ─── Test 1: Cached path ──────────────────────────────────────────────────
  it('cached path (default): serves from MongoDB — no Ricardo calls', async () => {
    const stationCount = 10
    const timings = []

    getMonitoringStations.mockImplementation(async () => {
      const t0 = performance.now()
      await sleep(DELAYS.dbRead)
      timings.push({
        phase: 'MongoDB read (monitoringStations)',
        elapsed: performance.now() - t0
      })
      return buildMockStations(stationCount)
    })

    const requestStart = performance.now()
    await siteController.handler(mockRequest, mockH)
    const totalElapsed = performance.now() - requestStart

    const rows = timings.map(({ phase, elapsed }) => ({
      Phase: phase,
      'Duration (ms)': elapsed.toFixed(0),
      '% of total': ((elapsed / totalElapsed) * 100).toFixed(1) + '%'
    }))
    rows.push({
      Phase: '── TOTAL',
      'Duration (ms)': totalElapsed.toFixed(0),
      '% of total': '100.0%'
    })

    console.log(`\n╔══ Cached path — ${stationCount} stations from MongoDB ══╗`)
    console.table(rows)
    console.log('Ricardo API calls: 0 — stations served from MongoDB cache\n')

    expect(timings).toHaveLength(1)
    expect(totalElapsed).toBeGreaterThanOrEqual(DELAYS.dbRead - 5)
    expect(mockH.response).toHaveBeenCalledOnce()
    // Confirm no Ricardo calls were made
    expect(catchProxyFetchError).not.toHaveBeenCalled()
    expect(refreshOAuthToken).not.toHaveBeenCalled()
  }, 10_000)

  // ─── Test 2: Live path (stream=data) ─────────────────────────────────────
  it('live path (stream=data): OAuth + all-stations fetch only — no per-site enrichment', async () => {
    const stationCount = 10
    const timings = []
    mockRequest.query = { stream: 'data' }

    refreshOAuthToken.mockImplementation(async (request) => {
      const t0 = performance.now()
      await sleep(DELAYS.oauthLogin)
      timings.push({
        phase: 'OAuth login (Ricardo)',
        elapsed: performance.now() - t0
      })
      request.yar.set('savedAccessToken', 'mock-token')
      return 'mock-token'
    })

    catchProxyFetchError.mockImplementation(async () => {
      const t0 = performance.now()
      await sleep(DELAYS.allDataFetch)
      timings.push({
        phase: 'All-stations fetch (Ricardo)',
        elapsed: performance.now() - t0
      })
      return [200, buildMockDataAll(stationCount)]
    })

    const requestStart = performance.now()
    await siteController.handler(mockRequest, mockH)
    const totalElapsed = performance.now() - requestStart

    const rows = timings.map(({ phase, elapsed }) => ({
      Phase: phase,
      'Duration (ms)': elapsed.toFixed(0),
      '% of total': ((elapsed / totalElapsed) * 100).toFixed(1) + '%'
    }))
    rows.push({
      Phase: '── TOTAL',
      'Duration (ms)': totalElapsed.toFixed(0),
      '% of total': '100.0%'
    })

    console.log(
      `\n╔══ Live path (stream=data) — ${stationCount} stations, no per-site enrichment ══╗`
    )
    console.table(rows)
    console.log(
      `Configured delays  │ OAuth: ${DELAYS.oauthLogin}ms │ All-data: ${DELAYS.allDataFetch}ms\n`
    )

    // oauth (1) + all-data (1)
    expect(timings).toHaveLength(2)
    expect(totalElapsed).toBeGreaterThanOrEqual(
      DELAYS.oauthLogin + DELAYS.allDataFetch - 100
    )
    expect(mockH.response).toHaveBeenCalledOnce()
  }, 15_000)

  // ─── Test 3: Cached vs live comparison ───────────────────────────────────
  it('comparison: cached path is dramatically faster than the live path', async () => {
    const stationCount = 10

    // — Measure cached path —
    getMonitoringStations.mockImplementation(async () => {
      await sleep(DELAYS.dbRead)
      return buildMockStations(stationCount)
    })
    const cachedStart = performance.now()
    await siteController.handler(mockRequest, mockH)
    const cachedTotal = performance.now() - cachedStart

    vi.clearAllMocks()
    mockH.response.mockImplementation(() => ({
      code: vi.fn().mockReturnThis()
    }))

    // — Measure live path (stream=data) —
    mockRequest.query = { stream: 'data' }
    mockRequest.yar.get.mockReturnValue(null)
    refreshOAuthToken.mockImplementation(async (request) => {
      await sleep(DELAYS.oauthLogin)
      request.yar.set('savedAccessToken', 'mock-token')
      return 'mock-token'
    })
    catchProxyFetchError.mockImplementation(async () => {
      await sleep(DELAYS.allDataFetch)
      return [200, buildMockDataAll(stationCount)]
    })

    const liveStart = performance.now()
    await siteController.handler(mockRequest, mockH)
    const liveTotal = performance.now() - liveStart

    const estimatedPreCachingMs =
      DELAYS.oauthLogin + DELAYS.allDataFetch + 300 * stationCount

    console.log('\n╔══ Latency comparison ══╗')
    console.table([
      {
        Path: 'Cached (default, DB read)',
        'Total (ms)': cachedTotal.toFixed(0),
        'Ricardo calls': 0
      },
      {
        Path: 'Live (stream=data, no enrichment)',
        'Total (ms)': liveTotal.toFixed(0),
        'Ricardo calls': 2
      },
      {
        Path: 'Pre-caching estimate (OAuth+allData+enrichment×n)',
        'Total (ms)': estimatedPreCachingMs.toFixed(0),
        'Ricardo calls': 2 + stationCount
      }
    ])
    console.log(
      `Speedup (cached vs live): ${(liveTotal / cachedTotal).toFixed(1)}×\n` +
        `Speedup (cached vs pre-caching estimate): ${(estimatedPreCachingMs / cachedTotal).toFixed(0)}×\n`
    )

    // Cached path must be substantially faster than the live path
    expect(cachedTotal).toBeLessThan(liveTotal)
  }, 30_000)
})
