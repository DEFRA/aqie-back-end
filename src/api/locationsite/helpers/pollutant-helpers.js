// Pollutant helpers for locationsite
import { config } from '../../../config/index.js'

// Map of short code to full pollutant name
const pollutantMap = {
  NO2: 'Nitrogen dioxide',
  PM10: 'PM10',
  PM25: 'PM2.5',
  O3: 'Ozone',
  SO2: 'Sulphur dioxide'
}
const pollutantNames = Object.values(pollutantMap)

// Helper to normalize pollutant names
function normalizePollutantName(name) {
  return name
    .replace(/<sub>(.*?)<\/sub>/g, (_, sub) => sub)
    .replace(/\s/g, '')
    .toLowerCase()
}

// Helper to extract pollutants from site data
function extractPollutants(siteData) {
  if (!Array.isArray(siteData?.member)) return undefined
  const pollutants = {}

  console.log(
    `Extracting pollutants from siteData: ${JSON.stringify(siteData)}`
  )

  for (const [shortCode, fullName] of Object.entries(pollutantMap)) {
    const found = findPollutant(siteData.member, fullName)
    console.log(`Found pollutant ${shortCode}: ${JSON.stringify(found)}`)

    if (found) {
      // Build pollutant data first (which includes mocking)
      const pollutantData = buildPollutantData(found)
      console.log(
        `Built pollutant data for ${shortCode}: value=${pollutantData.value}`
      )

      // Now filter based on the final value (after any mocking)
      // Exclude -9999, -99, null, and '0' values
      if (
        pollutantData.value !== -9999 &&
        pollutantData.value !== -99 &&
        pollutantData.value !== null &&
        pollutantData.value !== '0' &&
        pollutantData.value !== 0
      ) {
        pollutants[shortCode] = pollutantData
        console.log(
          `✓ Added pollutant ${shortCode} with value: ${pollutantData.value}`
        )
      } else {
        console.log(
          `✗ Filtered out pollutant ${shortCode} due to invalid value (${pollutantData.value}) after mocking`
        )
      }
    }
  }

  return Object.keys(pollutants).length > 0 ? pollutants : undefined
}

function findPollutant(members, fullName) {
  const normalizedFullName = normalizePollutantName(fullName)

  // Find all matching pollutants
  const matches = members.filter((m) => {
    if (!m.pollutantName) return false
    return normalizePollutantName(m.pollutantName).startsWith(
      normalizedFullName
    )
  })

  if (matches.length === 0) return undefined

  // Return the one with the most recent endDateTime
  return matches.reduce((latest, current) => {
    if (!latest.endDateTime) return current
    if (!current.endDateTime) return latest

    const latestDate = new Date(latest.endDateTime)
    const currentDate = new Date(current.endDateTime)

    return currentDate > latestDate ? current : latest
  })
}

function buildPollutantData(found) {
  const isoEndDate = found.endDateTime
    ? new Date(found.endDateTime).toISOString()
    : undefined
  const unit = getPollutantUnit(found.unit)

  // Use config-based mock mode
  const mockMode = config.get('mockInvalidPollutants')
  let value = found.value

  console.log(`Mock mode: ${mockMode}, Original value: ${found.value}`)

  if (mockMode) {
    // 90% chance to mock a pollutant as -9999
    const shouldMock = Math.random() < 0.9
    if (shouldMock) {
      // Randomly choose between different invalid values to test filtering
      const invalidValues = [-9999, -99, null, '0', 0]
      value = invalidValues[Math.floor(Math.random() * invalidValues.length)]
      console.log(`MOCKED: Value changed from ${found.value} to ${value}`)
    } else {
      console.log(`NOT MOCKED: Value kept original: ${value}`)
    }
  }

  // Dynamically extract hour, day, month, year from endDateTime
  let hour, day, month, year
  if (found.endDateTime) {
    const dateObj = new Date(found.endDateTime)
    let hours = dateObj.getHours()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours === 0 ? 12 : hours
    hour = `${hours}${ampm}`
    day = `${dateObj.getDate()}`
    month = dateObj.toLocaleString('en-GB', { month: 'long' })
    year = `${dateObj.getFullYear()}`
  }
  return {
    value,
    unit,
    time: {
      date: isoEndDate,
      hour,
      day,
      month,
      year
    }
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
  logger,
  catchProxyFetchError
) {
  const enrichedTempData = []
  for (const site of tempData) {
    let siteData = null
    if (site.localSiteID) {
      ;[, siteData] = await catchProxyFetchError(
        `${ricardoApiSiteIdUrl}station-id=${site.localSiteID}&start-date-time=${startDateTime}&end-date-time=${endDateTime}`,
        optionsSiteId
      )
      logger.info(
        `Site ID ${site.localSiteID} data: ${JSON.stringify(siteData)}`
      )
    }

    const pollutants = extractPollutants(siteData)
    console.log(`Site ${site.name}: pollutants = ${JSON.stringify(pollutants)}`)

    // Only include sites that have valid pollutants after filtering
    if (pollutants) {
      enrichedTempData.push({
        ...site,
        pollutants
      })
      console.log(
        `✓ Including site ${site.name} with ${Object.keys(pollutants).length} pollutants`
      )
    } else {
      console.log(
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
