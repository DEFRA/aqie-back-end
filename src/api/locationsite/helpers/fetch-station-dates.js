import { config } from '../../../config/index.js'
import { createLogger } from '../../../helpers/logging/logger.js'

const logger = createLogger()

/**
 * Maps a Ricardo pollutant name to a short DAQI code.
 * Returns null for pollutants not relevant to DAQI filtering.
 *
 * Ricardo names contain HTML (e.g. PM<sub>10</sub>) which is stripped before matching.
 *
 * @param {string} name - A pollutantName value from the Ricardo API.
 * @returns {string|null} Short code (e.g. 'PM10', 'NO2') or null if not a DAQI pollutant.
 */
function pollutantNameToCode(name) {
  const n = name
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .trim()
  if (n.includes('2.5')) return 'PM25'
  if (n.includes('pm10') || n.includes('pm 10')) return 'PM10'
  if (n.includes('nitrogen dioxide') && !n.includes('nitrogen oxides')) {
    return 'NO2'
  }
  if (n.includes('ozone')) return 'O3'
  if (n.includes('sulphur dioxide') || n.includes('sulfur dioxide')) {
    return 'SO2'
  }
  return null
}

/**
 * Fetches all pages of /api/pollutant_metadatas from the Ricardo API and
 * returns the raw array of records.
 *
 * @param {string} baseUrl - The pollutant_metadatas endpoint URL.
 * @param {Record<string, string>} headers - Auth headers to include on each request.
 * @returns {Promise<Array<object>>} All pollutant metadata records across all pages.
 */
async function fetchAllPollutantMetadataRecords(baseUrl, headers) {
  const PAGE_SIZE = 30
  const FALLBACK_MAX_PAGES = 600
  let maxPages = FALLBACK_MAX_PAGES
  let page = 1
  const records = []

  while (page <= maxPages) {
    const response = await fetch(`${baseUrl}?page=${page}`, { headers })

    if (!response.ok) {
      logger.warn(
        `pollutant_metadatas page ${page} returned HTTP ${response.status} — stopping pagination`
      )
      break
    }

    const data = await response.json()

    if (page === 1) {
      const totalItems = data.totalItems
      if (typeof totalItems === 'number' && totalItems > 0) {
        maxPages = Math.ceil((totalItems / PAGE_SIZE) * 1.2)
        logger.info(
          `Fetching pollutant metadata: ${totalItems} total items, max pages set to ${maxPages}`
        )
      } else {
        logger.warn(
          `pollutant_metadatas totalItems missing or invalid — using fallback cap of ${FALLBACK_MAX_PAGES} pages`
        )
      }
    }

    const pageRecords = data.member ?? []
    if (pageRecords.length === 0) break

    records.push(...pageRecords)

    if (pageRecords.length < PAGE_SIZE) break

    page++
  }

  return records
}

/**
 * Reduces an array of pollutant metadata records into maps of open and close
 * dates keyed by siteId.
 *
 * - openDate:  earliest startDate across all pollutant records for the station
 *              (i.e. when the station first began collecting data).
 * - closeDate: latest endDate across all closed pollutant records for the station
 *              (i.e. when the last instrument was decommissioned).
 * - currentPollutants: set of DAQI short codes for currently active instruments
 *              (e.g. 'NO2', 'PM10', 'O3').
 *
 * @param {Array<object>} records - Raw pollutant metadata records.
 * @returns {{ openDates: Map<string, string>, closeDates: Map<string, string>, currentPollutants: Map<string, Set<string>> }}
 */
function buildStationDatesMap(records) {
  const openDates = new Map()
  const closeDates = new Map()
  const currentPollutants = new Map()

  for (const record of records) {
    if (!record.siteId) continue

    if (record.startDate) {
      const existing = openDates.get(record.siteId)
      if (!existing || record.startDate < existing) {
        openDates.set(record.siteId, record.startDate)
      }
    }

    if (record.endDate && record.measurementStatus === 'closed') {
      const existing = closeDates.get(record.siteId)
      if (!existing || record.endDate > existing) {
        closeDates.set(record.siteId, record.endDate)
      }
    }

    if (record.measurementStatus === 'current' && record.pollutantName) {
      const code = pollutantNameToCode(record.pollutantName)
      if (code) {
        if (!currentPollutants.has(record.siteId)) {
          currentPollutants.set(record.siteId, new Set())
        }
        currentPollutants.get(record.siteId).add(code)
      }
    }
  }

  return { openDates, closeDates, currentPollutants }
}

/**
 * Fetches all pages of /api/pollutant_metadatas from the Ricardo API and
 * returns open and close date maps for all stations.
 *
 * @param {string} accessToken - A valid Ricardo API Bearer token.
 * @returns {Promise<{ openDates: Map<string, string>, closeDates: Map<string, string>, currentPollutants: Map<string, Set<string>> }>}
 */
async function fetchStationDates(accessToken) {
  const baseUrl = config.get('ricardoApiPollutantMetadataUrl')
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }

  const records = await fetchAllPollutantMetadataRecords(baseUrl, headers)
  const { openDates, closeDates, currentPollutants } =
    buildStationDatesMap(records)

  logger.info(
    `pollutant_metadatas fetch complete: open dates for ${openDates.size} stations, close dates for ${closeDates.size} stations, current pollutants for ${currentPollutants.size} stations`
  )
  return { openDates, closeDates, currentPollutants }
}

export { fetchStationDates, buildStationDatesMap, pollutantNameToCode }
