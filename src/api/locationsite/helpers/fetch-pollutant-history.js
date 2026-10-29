import { config } from '../../../config/index.js'
import {
  HTTP_OK,
  MINUTES_PER_HOUR,
  MS_PER_MINUTE
} from '../../pollutants/helpers/common/constants.js'
import {
  QUARTER_HOURS_MS,
  deriveHourlyFromQuarters,
  intervalMinutes
} from '../../../common/helpers/averaging.js'

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
const DAY_MS = HOURS_PER_DAY * MS_PER_HOUR

/**
 * Periods that cover whole UTC days. Their window ends at the most recent
 * midnight, so every daily mean is a real calendar day made of hours inside
 * the window and nothing before it is needed. The other periods end at the
 * newest reading.
 */
const COMPLETE_DAY_PERIODS = new Set(['7d'])

// The request reaches back further than the window needs. start-date has day
// granularity, and a complete-day window can start up to a day before the
// newest reading's 7 days, which itself can be older than now.
const REQUEST_PADDING_DAYS = 2

/** Only SO2 is averaged over 15 minutes (DAQI). */
const QUARTER_HOUR_CODE = 'SO2'

// A reading for the hour ending at `from` needs the quarters ending 45, 30 and
// 15 minutes earlier, so the 15-minute series starts this far before `from`.
const FIFTEEN_MINUTE_LEAD_MS = 3 * QUARTER_HOURS_MS

const toYmd = (date) => date.toISOString().slice(0, 10)

// Some pollutants return 15-minute rows alongside hourly ones and data-type
// does not separate them, so the interval does.
function isHourlyRow(row) {
  return intervalMinutes(row) === MINUTES_PER_HOUR
}

function isQuarterHourRow(row) {
  return intervalMinutes(row) === MINUTES_PER_HOUR / 4
}

const MAX_LOGGED_ROWS = 3

function describeRow(row) {
  return `${row.startDateTime} to ${row.endDateTime} (${intervalMinutes(row)} min, value ${row.value})`
}

// Ricardo labels rows in local time. At the autumn clock change a row can
// start at +01:00 and end at +00:00, giving a 2-hour "hourly" row. Rows whose
// length is neither 60 nor 15 minutes cannot be used, so they are treated as
// missing data and lower capture.
function warnAboutUnusableRows({ rows, code, siteId, logger }) {
  const unusable = rows.filter(
    (row) => !isHourlyRow(row) && !isQuarterHourRow(row)
  )
  if (unusable.length === 0) {
    return
  }
  const examples = unusable.slice(0, MAX_LOGGED_ROWS).map(describeRow)
  logger.warn(
    `Pollutant history: ${code} at ${siteId} has ${unusable.length} row(s) that are not 60 or 15 minutes long, ` +
      `so they are treated as missing data and count against data capture. ` +
      `This usually happens at a BST/GMT clock change, where upstream rows mix UTC offsets. ` +
      `Examples: ${examples.join('; ')}`
  )
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

function toPoints(rows) {
  return rows
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
    return { code, failed: true, hourly: [], quarters: [], truncated: false }
  }

  const rows = rowsFrom(data)
  warnAboutUnusableRows({ rows, code, siteId, logger })
  const truncated = rows.length >= ROW_CAP
  if (truncated) {
    logger.warn(
      `Pollutant history: ${code} at ${siteId} hit the ${ROW_CAP} row cap, series is truncated`
    )
  }

  return {
    code,
    failed: false,
    hourly: toPoints(rows.filter(isHourlyRow)),
    quarters:
      code === QUARTER_HOUR_CODE ? toPoints(rows.filter(isQuarterHourRow)) : [],
    truncated
  }
}

function emptySeries() {
  return Object.fromEntries(Object.keys(REQUEST_CODE).map((code) => [code, []]))
}

/**
 * The hourly series for a pollutant. SO2 hourly means are derived from its
 * 15-minute means (at least 3 valid of 4) when the feed supplies them; the
 * feed's own hourly SO2 rows are used only when there are no 15-minute rows.
 */
function hourlySeriesFor(result) {
  return result.quarters.length > 0
    ? deriveHourlyFromQuarters(result.quarters)
    : result.hourly
}

/**
 * Fetches an hourly time series per pollutant for a single station, plus SO2's
 * 15-minute series (`fifteenMinute`).
 *
 * The window is the last 24 hours ending at the newest reading (`24h`) or the
 * 7 complete UTC days ending at the most recent midnight (`7d`). All times are
 * the end of the averaging period, so a complete-day window runs from 01:00 on
 * its first day to 00:00 after its last. Invalid readings stay in the series as
 * `null` values so data capture can be counted against them.
 *
 * Returns `{ upstreamError: true }` when any pollutant call fails, so the
 * caller can distinguish a failed call from a station with no data.
 *
 * @returns {Promise<{ upstreamError: true } | { from: string|null, to: string|null, truncated: boolean, pollutants: Record<string, Array<{ time: string, value: number|null }>>, fifteenMinute: Record<string, Array<{ time: string, value: number|null }>> }>}
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
    requestedTo.getTime() -
      (days + REQUEST_PADDING_DAYS) * HOURS_PER_DAY * MS_PER_HOUR
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
  const hourlyByCode = Object.fromEntries(
    results.map((result) => [result.code, hourlySeriesFor(result)])
  )

  // Anchor on the newest reading, not on now, so a station that has stopped
  // publishing shows a gap rather than a window of empty hours.
  let newestMs = null
  for (const points of Object.values(hourlyByCode)) {
    for (const point of points) {
      const ms = Date.parse(point.time)
      if (newestMs === null || ms > newestMs) {
        newestMs = ms
      }
    }
  }

  if (newestMs === null) {
    return {
      from: null,
      to: null,
      truncated,
      pollutants: emptySeries(),
      fifteenMinute: { [QUARTER_HOUR_CODE]: [] }
    }
  }

  // A reading stamped exactly at midnight closes the previous day, so rounding
  // down to midnight keeps that day and drops the unfinished one.
  const completeDays = COMPLETE_DAY_PERIODS.has(period)
  const toMs = completeDays ? Math.floor(newestMs / DAY_MS) * DAY_MS : newestMs
  // `- 1` so a 24-hour window holds 24 hourly points inclusive, not 25.
  const fromMs = toMs - (days * HOURS_PER_DAY - 1) * MS_PER_HOUR

  const pollutants = {}
  for (const [code, points] of Object.entries(hourlyByCode)) {
    pollutants[code] = points.filter((point) => {
      const ms = Date.parse(point.time)
      return ms >= fromMs && ms <= toMs
    })
  }

  const quarters =
    results.find((result) => result.code === QUARTER_HOUR_CODE)?.quarters ?? []
  const fifteenMinute = {
    [QUARTER_HOUR_CODE]: quarters.filter((point) => {
      const ms = Date.parse(point.time)
      return (
        ms >= fromMs - FIFTEEN_MINUTE_LEAD_MS && (!completeDays || ms <= toMs)
      )
    })
  }

  return {
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    truncated,
    pollutants,
    fifteenMinute
  }
}

export { fetchPollutantHistory, REQUEST_CODE, PERIOD_DAYS, ROW_CAP }
