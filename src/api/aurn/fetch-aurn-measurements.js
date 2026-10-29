import { config } from '../../config/index.js'
import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from '../locationsite/helpers/catch-proxy-fetch-error.js'
import { fetchOAuthToken } from '../locationsite/helpers/oauth-helpers.js'
import { calculateDaqiIndex } from './helpers/daqi-calculator.js'
import {
  DAQI_AVERAGING,
  HOUR_MS,
  QUARTER_HOURS_MS,
  daqiConcentration,
  intervalMinutes,
  toSeriesIndex
} from '../../common/helpers/averaging.js'

const logger = createLogger()

/** Maximum pages to fetch per station to guard against runaway pagination. */
const MAX_PAGES_PER_STATION = 10

const MS_PER_MINUTE = 60 * 1000
const HOUR_MINUTES = HOUR_MS / MS_PER_MINUTE
const QUARTER_HOUR_MINUTES = QUARTER_HOURS_MS / MS_PER_MINUTE

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

/** Which series a record belongs to, by its length in minutes. */
const SERIES_BY_INTERVAL = {
  [HOUR_MINUTES]: 'hourly',
  [QUARTER_HOUR_MINUTES]: 'quarters'
}

/**
 * The pollutant, series and reading a record contributes, or null when it is
 * not a DAQI-relevant pollutant or is not 60 or 15 minutes long.
 */
function classifyRecord(record) {
  const code = pollutantNameToCode(record.pollutantName ?? '')
  const series = SERIES_BY_INTERVAL[intervalMinutes(record)]
  if (!code || !series || !record.endDateTime) {
    return null
  }
  return {
    code,
    series,
    point: { time: record.endDateTime, value: Number(record.value) }
  }
}

/**
 * Groups records by pollutant code and interval. Only 60-minute rows feed the
 * hourly series and only 15-minute rows feed the 15-minute series; a row of
 * any other (or unknown) length is ignored. Invalid readings (the -9999 and
 * -99 sentinels) are kept as gaps so they count against data capture.
 *
 * @param {Array<object>} records
 * @returns {{ [code: string]: { hourly: Array<{ time: string, value: number|null }>, quarters: Array<{ time: string, value: number|null }> } }}
 */
function groupRecordsByPollutant(records) {
  const grouped = {}
  for (const { code, series, point } of records
    .map(classifyRecord)
    .filter(Boolean)) {
    grouped[code] ??= { hourly: [], quarters: [] }
    grouped[code][series].push(point)
  }
  return grouped
}

/**
 * Computes the unrounded concentration each pollutant contributes to the DAQI,
 * using the shared averaging rules (75% data capture, no fallback to partial
 * windows):
 *
 *   NO2  — latest hourly mean
 *   SO2  — latest 15-minute mean (omitted when no 15-minute data is available)
 *   O3   — 8-hour running mean, at least 6 valid hours of 8
 *   PM10 — 24-hour running mean, at least 18 valid hours of 24
 *   PM25 — 24-hour running mean, at least 18 valid hours of 24
 *
 * A pollutant that fails its capture rule is omitted, not estimated. Each
 * pollutant is evaluated at its own newest valid reading.
 *
 * @param {Array<object>} records - Raw measurement records from the API.
 * @returns {{ [code: string]: { value: number, measuredAt: string } }}
 */
function computeDaqiConcentrations(records) {
  const result = {}
  const daqiSeries = Object.entries(groupRecordsByPollutant(records)).filter(
    ([code]) => DAQI_AVERAGING[code]
  )
  for (const [code, series] of daqiSeries) {
    const concentration = daqiConcentration(code, {
      hourIndex: toSeriesIndex(series.hourly),
      quarterIndex: toSeriesIndex(series.quarters)
    })
    if (concentration) {
      result[code] = concentration
    }
  }
  return result
}

/**
 * Fetches all pollutant measurements for a single station over the data fetch
 * window, computes the DAQI concentrations (applying the 75% data-capture
 * rule), and returns a
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

  const averagedPollutants = computeDaqiConcentrations(records)

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
    // Pages are fetched one at a time: each response says whether another exists.
    const [statusCode, data] = await catchProxyFetchError(url, {
      method: 'GET',
      headers
    })
    // A failed or malformed page stops the paging via the loop condition.
    const pageOk = statusCode === HTTP_STATUS_OK && Array.isArray(data?.member)
    if (pageOk) {
      records.push(...data.member)
    }
    hasMore = pageOk && Boolean(data.view?.next) && data.member.length > 0
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
    // Batches run one after another so Ricardo never sees more than
    // STATION_BATCH_SIZE requests at once; stations within a batch run in parallel.
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
