import { config } from '../../config/index.js'
import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from '../locationsite/helpers/catch-proxy-fetch-error.js'
import { fetchOAuthToken } from '../locationsite/helpers/oauth-helpers.js'
import { calculateDaqiIndex } from './helpers/daqi-calculator.js'

const logger = createLogger()

/** Maximum pages to fetch per station to guard against runaway pagination. */
const MAX_PAGES_PER_STATION = 10

const STATION_BATCH_SIZE = 5

/** HTTP 200 OK status code. */
const HTTP_STATUS_OK = 200

/** Start of day time component used in Ricardo API date-time parameters. */
const DAY_START_TIME = '00:00:00'

/** End of day time component used in Ricardo API date-time parameters. */
const DAY_END_TIME = '23:59:00'

/**
 * Maps a pollutantName value from the Ricardo API response to a DAQI short code.
 * Strips HTML subscript tags before matching (e.g. PM<sub>10</sub> → pm10).
 * Returns null for pollutants not relevant to DAQI (e.g. Nitric oxide, NOx).
 *
 * @param {string} name
 * @returns {string|null}
 */
function pollutantNameToCode(name) {
  const n = name
    .toLowerCase()
    .replaceAll('<sub>', '')
    .replaceAll('</sub>', '')
    .trim()
  if (n.includes('2.5')) {
    return 'PM25'
  }
  if (n.includes('pm10') || n.includes('pm 10')) {
    return 'PM10'
  }
  if (n.includes('nitrogen dioxide') && !n.includes('nitrogen oxides')) {
    return 'NO2'
  }
  if (n.includes('ozone')) {
    return 'O3'
  }
  if (n.includes('sulphur dioxide') || n.includes('sulfur dioxide')) {
    return 'SO2'
  }
  return null
}

// --- end of pollutant name mapping ---

/**
 * Builds today's date range strings in the format the Ricardo API expects.
 * @returns {{ startDateTime: string, endDateTime: string }}
 */
function todayDateRange() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return {
    startDateTime: `${yyyy}-${mm}-${dd} ${DAY_START_TIME}`,
    endDateTime: `${yyyy}-${mm}-${dd} ${DAY_END_TIME}`
  }
}

/**
 * From a flat array of measurement records, picks the most recent value for
 * each DAQI-relevant pollutant code.
 *
 * @param {Array<object>} members - Raw measurement records from the API.
 * @returns {{ [code: string]: { value: number, measuredAt: string|null } }}
 */
function extractLatestPerPollutant(members) {
  const best = {}
  for (const record of members) {
    const code = pollutantNameToCode(record.pollutantName ?? '')
    const value = Number(record.value)
    if (!code || !Number.isFinite(value) || value < 0) {
      continue
    }
    const existing = best[code]
    const isNewer =
      !existing ||
      (record.endDateTime &&
        new Date(record.endDateTime) > new Date(existing.measuredAt))
    if (isNewer) {
      best[code] = { value, measuredAt: record.endDateTime ?? null }
    }
  }
  return best
}

/**
 * Fetches all pages of today's measurements for a single station from Ricardo
 * (no pollutant-name filter — one call per page returns all pollutants).
 *
 * @returns {Promise<Array<object>>} All measurement records for the station today.
 */
async function fetchAllRecordsForStation(
  baseUrl,
  headers,
  siteId,
  startDateTime,
  endDateTime
) {
  const records = []
  let page = 1
  let hasMore = true

  while (hasMore && page <= MAX_PAGES_PER_STATION) {
    const url = `${baseUrl}station-id=${siteId}&start-date-time=${startDateTime}&end-date-time=${endDateTime}&page=${page}`
    const [statusCode, data] = await catchProxyFetchError(url, {
      method: 'GET',
      headers
    })
    if (statusCode !== HTTP_STATUS_OK || !Array.isArray(data?.member)) {
      break
    }
    records.push(...data.member)
    hasMore = Boolean(data.view?.next) && data.member.length > 0
    page++
  }

  return records
}

/**
 * Fetches all pollutant measurements for a single station, extracts the most
 * recent value per DAQI pollutant, and returns a station DAQI result.
 * Returns null if no DAQI index can be calculated.
 */
async function fetchStationDaqi(
  siteId,
  baseUrl,
  headers,
  startDateTime,
  endDateTime
) {
  const records = await fetchAllRecordsForStation(
    baseUrl,
    headers,
    siteId,
    startDateTime,
    endDateTime
  )
  if (!records.length) {
    return null
  }

  const pollutantValues = {}
  let latestMeasuredAt = null

  for (const [code, { value, measuredAt }] of Object.entries(
    extractLatestPerPollutant(records)
  )) {
    pollutantValues[code] = value
    if (
      measuredAt &&
      (!latestMeasuredAt || new Date(measuredAt) > new Date(latestMeasuredAt))
    ) {
      latestMeasuredAt = measuredAt
    }
  }

  const daqiIndex = calculateDaqiIndex(pollutantValues)
  if (daqiIndex === null) {
    return null
  }

  return {
    localSiteID: siteId,
    daqiIndex,
    measuredAt: latestMeasuredAt,
    updatedAt: new Date()
  }
}

/**
 * Fetches the latest AURN measurements for all provided station IDs and
 * returns an array of per-station DAQI objects ready for upsert.
 *
 * One API call per station page (all pollutants in one response) rather than
 * one call per pollutant per station.
 *
 * @param {string[]} stationIds
 * @returns {Promise<Array<{ localSiteID: string, daqiIndex: number, measuredAt: string|null, updatedAt: Date }>>}
 */
async function fetchAurnMeasurements(stationIds) {
  const accessToken = await fetchOAuthToken(catchProxyFetchError, logger)
  if (!accessToken) {
    throw new Error('Failed to fetch OAuth token for AURN measurements refresh')
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
  const baseUrl = config.get('ricardoApiSiteIdUrl')
  const { startDateTime, endDateTime } = todayDateRange()

  logger.info(
    `AURN: fetching measurements for ${stationIds.length} stations (batch size ${STATION_BATCH_SIZE})`
  )

  const results = []
  for (let i = 0; i < stationIds.length; i += STATION_BATCH_SIZE) {
    const batch = stationIds.slice(i, i + STATION_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((siteId) =>
        fetchStationDaqi(siteId, baseUrl, headers, startDateTime, endDateTime)
      )
    )
    results.push(...batchResults.filter(Boolean))
  }

  logger.info(`AURN: ${results.length} stations have a calculable DAQI index`)
  return results
}

export { fetchAurnMeasurements }
