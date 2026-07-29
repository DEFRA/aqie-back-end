// Pollutant helpers for locationsite
import { randomInt } from 'node:crypto'
import { config } from '../../../config/index.js'
import { createLogger } from '../../../helpers/logging/logger.js'
import {
  POLLUTANT_MAP,
  HOURS_IN_DAY,
  INVALID_POLLUTANT_LARGE,
  INVALID_POLLUTANT_SMALL,
  MOCK_PROBABILITY
} from '../../pollutants/helpers/common/constants.js'
import { validateDataFreshness } from '../../pollutants/helpers/common/validate-data-freshness.js'

const logger = createLogger()

const pollutantNames = Object.values(POLLUTANT_MAP)

const POLLUTANT_DATA_TYPE = { PM10: 24, PM25: 24, O3: 23 }

const LONDON_TIME_ZONE = 'Europe/London'

// Helper to normalize pollutant names
function normalizePollutantName(name) {
  return name
    .replaceAll(/<sub>(.*?)<\/sub>/g, (_, sub) => sub)
    .replaceAll(/\s/g, '')
    .toLowerCase()
}

/**
 * Parses an ISO 8601 timestamp with an offset (e.g. "2026-07-28T01:00:00+01:00")
 * by taking the literal date/time digits shown and ADDING the offset on top,
 * rather than doing a standard UTC subtraction.
 *
 * Example: "2026-07-28T01:00:00+01:00" → literal 01:00, +01:00 added → 02:00:00
 *
 * Returns a JS Date object representing that shifted time (internally labelled
 * as UTC so that .toISOString() / Intl formatting downstream doesn't apply
 * any further shift).
 */
function parseWithOffsetAdded(dateStr) {
  if (!dateStr) {
    return undefined
  }

  const match = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([+-])(\d{2}):?(\d{2})$/
  )

  if (!match) {
    // No offset present (e.g. already has Z, or no timezone info) — fall back to normal parsing
    return new Date(dateStr)
  }

  const [, y, mo, d, h, mi, s, sign, offH, offM] = match

  // Build a Date using the literal digits, labelled as UTC (no shift yet)
  const literalAsUtc = new Date(
    Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s)
    )
  )

  // Add the offset on top, as requested (not subtract)
  const offsetMinutes =
    (sign === '-' ? -1 : 1) * (Number(offH) * 60 + Number(offM))

  literalAsUtc.setUTCMinutes(literalAsUtc.getUTCMinutes() + offsetMinutes)

  return literalAsUtc
}

// Helper to extract pollutants from site data
function extractPollutants(siteData, stationName = 'Unknown') {
  if (!Array.isArray(siteData?.member)) {
    return undefined
  }
  const pollutants = {}

  logger.info(
    `Extracting pollutants from siteData: ${JSON.stringify(siteData)}`
  )

  for (const [shortCode, fullName] of Object.entries(POLLUTANT_MAP)) {
    const found = findPollutant(siteData.member, fullName)
    logger.info(`Found pollutant ${shortCode}: ${JSON.stringify(found)}`)

    if (found) {
      const pollutantData = buildPollutantData(found, stationName)
      logger.info(
        `Built pollutant data for ${shortCode}: value=${pollutantData.value}`
      )

      if (
        pollutantData.value !== INVALID_POLLUTANT_LARGE &&
        pollutantData.value !== INVALID_POLLUTANT_SMALL &&
        pollutantData.value !== null &&
        pollutantData.value !== '0' &&
        pollutantData.value !== 0
      ) {
        pollutants[shortCode] = pollutantData
        logger.info(
          `✓ Added pollutant ${shortCode} with value: ${pollutantData.value}`
        )
      } else {
        logger.info(
          `✗ Filtered out pollutant ${shortCode} due to invalid value (${pollutantData.value}) after mocking`
        )
      }
    }
  }

  return Object.keys(pollutants).length > 0 ? pollutants : undefined
}

function findPollutant(members, fullName) {
  const normalizedFullName = normalizePollutantName(fullName)

  const matches = members.filter((m) => {
    if (!m.pollutantName) {
      return false
    }
    return normalizePollutantName(m.pollutantName).startsWith(
      normalizedFullName
    )
  })

  if (matches.length === 0) {
    return undefined
  }

  return matches.reduce((latest, current) => {
    if (!latest.endDateTime) {
      return current
    }
    if (!current.endDateTime) {
      return latest
    }

    const latestDate = parseWithOffsetAdded(latest.endDateTime)
    const currentDate = parseWithOffsetAdded(current.endDateTime)

    return currentDate > latestDate ? current : latest
  })
}

function applyMockMode(value, mockMode, originalValue) {
  if (!mockMode) {
    return value
  }
  const shouldMock = randomInt(0, 100) < MOCK_PROBABILITY * 100
  if (shouldMock) {
    const invalidValues = [
      INVALID_POLLUTANT_LARGE,
      INVALID_POLLUTANT_SMALL,
      null,
      '0',
      0
    ]
    const mockedValue = invalidValues[randomInt(0, invalidValues.length)]
    logger.info(`MOCKED: Value changed from ${originalValue} to ${mockedValue}`)
    return mockedValue
  }
  logger.info(`NOT MOCKED: Value kept original: ${value}`)
  return value
}

function roundValue(value) {
  if (typeof value === 'number' && !Number.isInteger(value)) {
    const rounded = Number.parseFloat(value.toFixed(2))
    if (rounded !== value) {
      logger.info(`Rounded value from ${value} to ${rounded}`)
      return rounded
    }
  }
  return value
}

// Timezone-aware time extraction.
// dateStr is expected to already be a UTC-labelled ISO string (post parseWithOffsetAdded),
// this formats it into London calendar/hour parts for display.
function getTimeComponents(dateStr) {
  if (!dateStr) {
    return {}
  }
  const dateObj = new Date(dateStr)

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: LONDON_TIME_ZONE,
    hour: 'numeric',
    hour12: false,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).formatToParts(dateObj)

  const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]))

  let hours = Number.parseInt(partMap.hour, 10) % 24
  const ampm = hours >= HOURS_IN_DAY ? 'pm' : 'am'
  hours = hours % HOURS_IN_DAY
  hours = hours === 0 ? HOURS_IN_DAY : hours

  return {
    hour: `${hours}${ampm}`,
    day: `${partMap.day}`,
    month: partMap.month,
    year: `${partMap.year}`
  }
}

function buildPollutantData(found, stationName = 'Unknown') {
  // Validate data freshness
  if (found.endDateTime) {
    validateDataFreshness(found.endDateTime, found.pollutantName, stationName)
  }

  const parsedEndDate = found.endDateTime
    ? parseWithOffsetAdded(found.endDateTime)
    : undefined
  const isoEndDate = parsedEndDate ? parsedEndDate.toISOString() : undefined

  const parsedStartDate = found.startDateTime
    ? parseWithOffsetAdded(found.startDateTime)
    : undefined
  const ymdStartDate = parsedStartDate
    ? parsedStartDate.toISOString().slice(0, 10)
    : undefined

  const unit = getPollutantUnit(found.unit)
  const mockMode = config.get('mockInvalidPollutants')
  logger.info(`Mock mode: ${mockMode}, Original value: ${found.value}`)
  const mockedValue = applyMockMode(found.value, mockMode, found.value)
  const value = roundValue(mockedValue)
  const { hour, day, month, year } = getTimeComponents(isoEndDate)
  return {
    value,
    unit,
    startDate: ymdStartDate,
    endDate: isoEndDate,
    time: { date: isoEndDate, hour, day, month, year }
  }
}

function getPollutantUnit(unit) {
  if (
    typeof unit === 'string' &&
    unit.startsWith('microgrammes per cubic metre')
  ) {
    return 'μg/m3'
  }
  return 'NA'
}

// Helper to enrich site data with pollutant
async function enrichSitesWithPollutants(
  tempData,
  ricardoApiSiteIdUrl,
  optionsSiteId,
  startDateTime,
  endDateTime,
  log,
  catchProxyFetchError
) {
  const enrichedTempData = []
  for (const site of tempData) {
    if (!site.localSiteID) {
      log.info(`Skipping site ${site.name} - no localSiteID`)
      continue
    }

    const pollutantResults = await Promise.all(
      Object.keys(POLLUTANT_MAP).map(async (shortCode) => {
        const dataType = POLLUTANT_DATA_TYPE[shortCode]
        const ricardoPollutantName = shortCode === 'PM10' ? 'GE10' : shortCode
        let url = `${ricardoApiSiteIdUrl}station-id=${site.localSiteID}&start-date-time=${startDateTime}&end-date-time=${endDateTime}&pollutant-name=${ricardoPollutantName}`
        if (dataType !== undefined) {
          url += `&data-type=${dataType}`
        }
        let siteData = null
        try {
          ;[, siteData] = await catchProxyFetchError(url, optionsSiteId)
        } catch (err) {
          log.info(`Error fetching ${shortCode} for site ${site.name}: ${err}`)
        }
        log.info(
          `Site ${site.name} ${shortCode} data: ${JSON.stringify(siteData)}`
        )
        return extractPollutants(siteData, site.name)
      })
    )

    const pollutants = Object.assign({}, ...pollutantResults.filter(Boolean))
    log.info(`Site ${site.name}: pollutants = ${JSON.stringify(pollutants)}`)

    if (Object.keys(pollutants).length > 0) {
      enrichedTempData.push({ ...site, pollutants })
      log.info(
        `✓ Including site ${site.name} with ${Object.keys(pollutants).length} pollutants`
      )
    } else {
      log.info(
        `✗ Excluding site ${site.name} - no valid pollutants after filtering`
      )
    }
  }
  return enrichedTempData
}

export {
  pollutantNames,
  normalizePollutantName,
  extractPollutants,
  enrichSitesWithPollutants
}
