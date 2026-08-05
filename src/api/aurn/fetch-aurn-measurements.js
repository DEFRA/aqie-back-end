import { config } from '../../config/index.js'
import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from '../locationsite/helpers/catch-proxy-fetch-error.js'
import { fetchOAuthToken } from '../locationsite/helpers/oauth-helpers.js'
import { calculateDaqiIndex } from './helpers/daqi-calculator.js'

const logger = createLogger()

/** Maximum pages to fetch per station to guard against runaway pagination. */
const MAX_PAGES_PER_STATION = 10

/** Hours of data used for the O3 8-hour running mean. */
const O3_AVERAGING_HOURS = 8

/** Hours of data used for the PM10 and PM2.5 24-hour running mean. */
const PM_AVERAGING_HOURS = 24

/** Number of stations processed concurrently per scheduler batch. */
const STATION_BATCH_SIZE = 5

/** HTTP 200 OK status code. */
const HTTP_STATUS_OK = 200

/** Start of day time component used in Ricardo API date-time parameters. */
const DAY_START_TIME = '00:00:00'

/** End of day time component used in Ricardo API date-time parameters. */
const DAY_END_TIME = '23:59:00'

/**
 * Maps a pollutantName value from the Ricardo API response to a pollutant code.
 * Strips HTML subscript tags before matching (e.g. PM<sub>10</sub> → pm10).
 * Returns null for pollutants not relevant to DAQI (e.g. Nitric oxide, NOx).
 *
 * @param {string} name
 * @returns {string|null}
 */
function pollutantNameToCode(name) {
  const normalised = name
    .toLowerCase()
    .replaceAll('<sub>', '')
    .replaceAll('</sub>', '')
    .trim()
  if (normalised.includes('2.5')) {
    return 'PM25'
  }
  if (normalised.includes('pm10') || normalised.includes('pm 10')) {
    return 'PM10'
  }
  if (
    normalised.includes('nitrogen dioxide') &&
    !normalised.includes('nitrogen oxides')
  ) {
    return 'NO2'
  }
  if (normalised.includes('ozone')) {
    return 'O3'
  }
  if (
    normalised.includes('sulphur dioxide') ||
    normalised.includes('sulfur dioxide')
  ) {
    return 'SO2'
  }
  return null
}

// --- end of pollutant name mapping ---

/**
 * Builds a date range covering yesterday and today so the scheduler always
 * has at least 24 hours of hourly records, regardless of what time of day
 * it runs. This is required to compute the 24-hour PM mean and 8-hour O3 mean.
 *
 * @returns {{ startDateTime: string, endDateTime: string }}
 */
function dataFetchRange() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const prevYyyy = yesterday.getFullYear()
  const prevMm = String(yesterday.getMonth() + 1).padStart(2, '0')
  const prevDd = String(yesterday.getDate()).padStart(2, '0')
  return {
    startDateTime: `${prevYyyy}-${prevMm}-${prevDd} ${DAY_START_TIME}`,
    endDateTime: `${yyyy}-${mm}-${dd} ${DAY_END_TIME}`
  }
}

/**
 * Groups valid hourly records by pollutant code, sorted oldest-first.
 *
 * @param {Array<object>} records
 * @returns {{ [code: string]: Array<{ value: number, endDateTime: string }> }}
 */
function groupRecordsByPollutant(records) {
  const grouped = {}
  for (const record of records) {
    const code = pollutantNameToCode(record.pollutantName ?? '')
    const value = Number(record.value)
    if (!code || !Number.isFinite(value) || value < 0 || !record.endDateTime) {
      continue
    }
    if (!grouped[code]) {
      grouped[code] = []
    }
    grouped[code].push({ value, endDateTime: record.endDateTime })
  }
  for (const readings of Object.values(grouped)) {
    readings.sort((a, b) => new Date(a.endDateTime) - new Date(b.endDateTime))
  }
  return grouped
}

/**
 * Selects the readings to average for one pollutant according to its DAQI
 * averaging window. Falls back to the single most recent reading when fewer
 * readings exist than the target window.
 *
 * @param {string} code - Pollutant code (e.g. 'NO2', 'PM10', 'O3').
 * @param {Array<{ value: number, endDateTime: string }>} readings - Sorted oldest-first.
 * @param {Date} now
 * @returns {Array<{ value: number, endDateTime: string }>}
 */
function selectAveragingWindow(code, readings, now) {
  if (code === 'O3') {
    return readings.slice(-O3_AVERAGING_HOURS)
  }
  if (code === 'PM10' || code === 'PM25') {
    const cutoff = new Date(now.getTime() - PM_AVERAGING_HOURS * 60 * 60 * 1000)
    const withinWindow = readings.filter(
      (r) => new Date(r.endDateTime) >= cutoff
    )
    return withinWindow.length ? withinWindow : readings.slice(-1)
  }
  return readings.slice(-1)
}

/**
 * Computes rolling-average pollutant values from a flat array of hourly
 * measurement records, applying the averaging period required by the official
 * DAQI methodology for each pollutant:
 *
 *   NO2  — most recent hourly reading (hourly mean is correct for DAQI)
 *   SO2  — most recent hourly reading (15-min mean unavailable from Ricardo)
 *   O3   — mean of the most recent 8 hourly readings (8-hour running mean)
 *   PM10 — mean of all readings within the last 24 hours (24-hour running mean)
 *   PM25 — mean of all readings within the last 24 hours (24-hour running mean)
 *
 * If fewer readings exist than the target window the mean of all available
 * readings is used.
 *
 * @param {Array<object>} records - Raw hourly measurement records from the API.
 * @returns {{ [code: string]: { value: number, measuredAt: string } }}
 */
function computeRollingAverages(records) {
  const now = new Date()
  const grouped = groupRecordsByPollutant(records)
  const result = {}

  for (const [code, readings] of Object.entries(grouped)) {
    const usedReadings = selectAveragingWindow(code, readings, now)
    if (!usedReadings.length) {
      continue
    }
    const mean =
      usedReadings.reduce((sum, r) => sum + r.value, 0) / usedReadings.length
    const mostRecent = usedReadings[usedReadings.length - 1]
    result[code] = { value: mean, measuredAt: mostRecent.endDateTime }
  }

  return result
}

/**
 * Fetches all pollutant measurements for a single station over the data fetch
 * window, computes rolling averages per DAQI methodology, and returns a
 * station DAQI result. Returns null if no index can be calculated.
 *
 * @param {string} siteId
 * @param {string} baseUrl
 * @param {Record<string, string>} headers
 * @param {{ startDateTime: string, endDateTime: string }} dateRange
 * @returns {Promise<{ localSiteID: string, daqiIndex: number, measuredAt: string|null, updatedAt: Date, pollutants: { [code: string]: { value: number, measuredAt: string } } }|null>}
 */
async function fetchStationDaqi(siteId, baseUrl, headers, dateRange) {
  const records = await fetchAllRecordsForStation(
    baseUrl,
    headers,
    siteId,
    dateRange.startDateTime,
    dateRange.endDateTime
  )
  if (!records.length) {
    return null
  }

  const averagedPollutants = computeRollingAverages(records)

  const pollutantValues = {}
  let latestMeasuredAt = null

  for (const [code, { value, measuredAt }] of Object.entries(
    averagedPollutants
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
    updatedAt: new Date(),
    pollutants: averagedPollutants
  }
}

/**
 * Fetches all pages of measurements for a single station from Ricardo
 * (no pollutant-name filter — one call per page returns all pollutants).
 *
 * @param {string} baseUrl - Ricardo pollutant_measurement_datas endpoint URL.
 * @param {Record<string, string>} headers - Auth headers.
 * @param {string} siteId - Ricardo station ID (e.g. 'UKA00651').
 * @param {string} startDateTime - Range start in 'YYYY-MM-DD HH:mm:ss' format.
 * @param {string} endDateTime - Range end in 'YYYY-MM-DD HH:mm:ss' format.
 * @returns {Promise<Array<object>>} All measurement records for the station.
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
 * Fetches the latest AURN measurements for all provided station IDs and
 * returns an array of per-station DAQI objects ready for upsert.
 *
 * One API call per station page (all pollutants in one response) rather than
 * one call per pollutant per station.
 *
 * @param {string[]} stationIds
 * @returns {Promise<Array<{ localSiteID: string, daqiIndex: number, measuredAt: string|null, updatedAt: Date, pollutants: { [code: string]: { value: number, measuredAt: string } } }>>}
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
  const dateRange = dataFetchRange()

  logger.info(
    `AURN: fetching measurements for ${stationIds.length} stations (batch size ${STATION_BATCH_SIZE})`
  )

  const results = []
  for (let i = 0; i < stationIds.length; i += STATION_BATCH_SIZE) {
    const batch = stationIds.slice(i, i + STATION_BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((siteId) =>
        fetchStationDaqi(siteId, baseUrl, headers, dateRange)
      )
    )
    results.push(...batchResults.filter(Boolean))
  }

  logger.info(`AURN: ${results.length} stations have a calculable DAQI index`)
  return results
}

export { fetchAurnMeasurements }
