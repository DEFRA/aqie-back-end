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

// Helper to normalize pollutant names
function normalizePollutantName(name) {
  return name
    .replaceAll(/<sub>(.*?)<\/sub>/g, (_, sub) => sub)
    .replaceAll(/\s/g, '')
    .toLowerCase()
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

    const latestDate = new Date(latest.endDateTime)
    const currentDate = new Date(current.endDateTime)

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

function getTimeComponents(dateStr) {
  if (!dateStr) {
    return {}
  }
  const dateObj = new Date(dateStr)
  let hours = dateObj.getHours()
  const ampm = hours >= HOURS_IN_DAY ? 'pm' : 'am'
  hours = hours % HOURS_IN_DAY
  hours = hours === 0 ? HOURS_IN_DAY : hours
  return {
    hour: `${hours}${ampm}`,
    day: `${dateObj.getDate()}`,
    month: dateObj.toLocaleString('en-GB', { month: 'long' }),
    year: `${dateObj.getFullYear()}`
  }
}

function buildPollutantData(found, stationName = 'Unknown') {
  // Validate data freshness
  if (found.endDateTime) {
    validateDataFreshness(found.endDateTime, found.pollutantName, stationName)
  }

  const isoEndDate = found.endDateTime
    ? new Date(found.endDateTime).toISOString()
    : undefined
  const ymdStartDate = found.startDateTime
    ? new Date(found.startDateTime).toISOString().slice(0, 10)
    : undefined
  const unit = getPollutantUnit(found.unit)
  const mockMode = config.get('mockInvalidPollutants')
  logger.info(`Mock mode: ${mockMode}, Original value: ${found.value}`)
  const mockedValue = applyMockMode(found.value, mockMode, found.value)
  const value = roundValue(mockedValue)
  const { hour, day, month, year } = getTimeComponents(found.endDateTime)
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

// Helper to enrich site data with pollutants
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
