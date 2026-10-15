import { config } from '../../../config/index.js'
import {
  HTTP_OK,
  MINUTES_PER_HOUR,
  MS_PER_MINUTE
} from '../../pollutants/helpers/common/constants.js'

// Ricardo rejects PM10 and PM2.5 under their display names.
const REQUEST_CODE = {
  PM25: 'PM25',
  PM10: 'GE10',
  NO2: 'NO2',
  O3: 'O3',
  SO2: 'SO2'
}

const PERIOD_DAYS = { '24h': 1, '7d': 7 }

/** Upstream silently caps a response at this many rows; it cannot be paginated past. */
const ROW_CAP = 10000

const MS_PER_HOUR = MINUTES_PER_HOUR * MS_PER_MINUTE

// HOURS_IN_DAY in the constants module is 12 (12-hour clock formatting).
const HOURS_PER_DAY = 24

const toYmd = (date) => date.toISOString().slice(0, 10)

// Some pollutants return 15-minute rows alongside hourly ones and data-type
// does not separate them, so the interval does.
function isHourlyRow(row) {
  const ms = Date.parse(row?.endDateTime) - Date.parse(row?.startDateTime)
  return ms / MS_PER_MINUTE === MINUTES_PER_HOUR
}

// -9999 and -99 mark hours with no reading; averaging them goes far negative.
function toReading(raw) {
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : null
}

// The configured URL ends in `?` because other callers concatenate onto it.
function buildHistoryUrl({ siteId, requestCode, from, to }) {
  const base = config.get('ricardoApiSiteIdUrl').replace(/\?$/, '')
  const url = new URL(base)
  url.searchParams.set('station-id', siteId)
  url.searchParams.set('pollutant-name', requestCode)
  url.searchParams.set('start-date', toYmd(from))
  url.searchParams.set('end-date', toYmd(to))
  return url.toString()
}

function rowsFrom(data) {
  if (Array.isArray(data?.member)) {
    return data.member
  }
  return Array.isArray(data) ? data : []
}

function toSeries(rows) {
  return rows
    .filter(isHourlyRow)
    .map((row) => ({
      time: new Date(row.endDateTime).toISOString(),
      value: toReading(row.value)
    }))
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
}

async function fetchOnePollutant({
  code,
  siteId,
  from,
  to,
  options,
  catchProxyFetchError,
  logger
}) {
  const url = buildHistoryUrl({
    siteId,
    requestCode: REQUEST_CODE[code],
    from,
    to
  })
  const [statusCode, data] = await catchProxyFetchError(url, options)

  if (statusCode !== HTTP_OK) {
    logger.error(
      `Pollutant history: upstream returned ${statusCode} for ${code} at ${siteId}`
    )
    return { code, failed: true, points: [], truncated: false }
  }

  const rows = rowsFrom(data)
  const truncated = rows.length >= ROW_CAP
  if (truncated) {
    logger.warn(
      `Pollutant history: ${code} at ${siteId} hit the ${ROW_CAP} row cap, series is truncated`
    )
  }

  return { code, failed: false, points: toSeries(rows), truncated }
}

function emptySeries() {
  return Object.fromEntries(Object.keys(REQUEST_CODE).map((code) => [code, []]))
}

/**
 * Fetches an hourly time series per pollutant for a single station.
 *
 * Returns `{ upstreamError: true }` when any pollutant call fails, so the
 * caller can distinguish a failed call from a station with no data.
 *
 * @returns {Promise<{ upstreamError: true } | { from: string|null, to: string|null, truncated: boolean, pollutants: Record<string, Array<{ time: string, value: number|null }>> }>}
 */
async function fetchPollutantHistory({
  siteId,
  period,
  accessToken,
  catchProxyFetchError,
  logger
}) {
  if (typeof catchProxyFetchError !== 'function') {
    throw new TypeError(
      'catchProxyFetchError must be provided as a function dependency'
    )
  }

  const days = PERIOD_DAYS[period]
  const requestedTo = new Date()
  const requestedFrom = new Date(
    requestedTo.getTime() - days * HOURS_PER_DAY * MS_PER_HOUR
  )
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }

  const results = await Promise.all(
    Object.keys(REQUEST_CODE).map((code) =>
      fetchOnePollutant({
        code,
        siteId,
        from: requestedFrom,
        to: requestedTo,
        options,
        catchProxyFetchError,
        logger
      })
    )
  )

  if (results.some((result) => result.failed)) {
    return { upstreamError: true }
  }

  const truncated = results.some((result) => result.truncated)

  // Anchor on the newest reading, not on now, so a station that has stopped
  // publishing shows a gap rather than a window of empty hours.
  let toMs = null
  for (const result of results) {
    for (const point of result.points) {
      const ms = Date.parse(point.time)
      if (toMs === null || ms > toMs) {
        toMs = ms
      }
    }
  }

  if (toMs === null) {
    return { from: null, to: null, truncated, pollutants: emptySeries() }
  }

  // `- 1` so a 24-hour window holds 24 hourly points inclusive, not 25.
  const fromMs = toMs - (days * HOURS_PER_DAY - 1) * MS_PER_HOUR

  const pollutants = {}
  for (const result of results) {
    pollutants[result.code] = result.points.filter(
      (point) => Date.parse(point.time) >= fromMs
    )
  }

  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    truncated,
    pollutants
  }
}

export { fetchPollutantHistory, REQUEST_CODE, PERIOD_DAYS, ROW_CAP }
