// Pollutant helpers for locationsite

// Map of short code to full pollutant name
const pollutantMap = {
  NO2: 'Nitrogen dioxide',
  MP10: 'PM10',
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

  for (const [shortCode, fullName] of Object.entries(pollutantMap)) {
    const found = findPollutant(siteData.member, fullName)
    if (found) {
      pollutants[shortCode] = buildPollutantData(found)
    }
  }

  return Object.keys(pollutants).length > 0 ? pollutants : undefined
}

function findPollutant(members, fullName) {
  const normalizedFullName = normalizePollutantName(fullName)
  return members.find((m) => {
    if (!m.pollutantName) return false
    return normalizePollutantName(m.pollutantName).startsWith(
      normalizedFullName
    )
  })
}

function buildPollutantData(found) {
  const isoEndDate = found.endDateTime
    ? new Date(found.endDateTime).toISOString()
    : undefined
  const ymdStartDate = found.startDateTime
    ? new Date(found.startDateTime).toISOString().slice(0, 10)
    : undefined
  const unit = getPollutantUnit(found.unit)
  return {
    value: found.value,
    unit,
    startDate: ymdStartDate,
    endDate: isoEndDate,
    time: {
      date: isoEndDate
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
    enrichedTempData.push({
      ...site,
      pollutants: extractPollutants(siteData)
    })
  }
  return enrichedTempData
}

export {
  pollutantNames,
  normalizePollutantName,
  extractPollutants,
  enrichSitesWithPollutants
}
