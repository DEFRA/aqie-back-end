import { config } from '../../../config/index.js'
import { createLogger } from '../../../helpers/logging/logger.js'

const logger = createLogger()

const POLLUTANT_METADATA_PAGE_SIZE = 30
const POLLUTANT_METADATA_FALLBACK_MAX_PAGES = 600
const POLLUTANT_METADATA_PAGE_COUNT_BUFFER = 1.2

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

/**
 * Derives the maximum number of pages to fetch from page 1 response data.
 * Adds a 20% buffer above the calculated page count to handle data growth.
 *
 * @param {object} firstPageData - Parsed JSON from the first page response.
 * @param {number} fallbackMaxPages - Cap to use when totalItems is missing.
 * @param {number} pageSize - Number of records per page.
 * @returns {number}
 */
function resolveMaxPages(firstPageData, fallbackMaxPages, pageSize) {
  const totalItems = firstPageData.totalItems
  if (typeof totalItems === 'number' && totalItems > 0) {
    const pages = Math.ceil(
      (totalItems / pageSize) * POLLUTANT_METADATA_PAGE_COUNT_BUFFER
    )
    logger.info(
      `Fetching pollutant metadata: ${totalItems} total items, max pages set to ${pages}`
    )
    return pages
  }
  logger.warn(
    `pollutant_metadatas totalItems missing or invalid — using fallback cap of ${fallbackMaxPages} pages`
  )
  return fallbackMaxPages
}

/**
 * Fetches a single page of pollutant metadata records.
 * Returns null and logs a warning if the response is not ok.
 *
 * @param {string} baseUrl
 * @param {Record<string, string>} headers
 * @param {number} page
 * @returns {Promise<object|null>}
 */
async function fetchPollutantMetadataPage(baseUrl, headers, page) {
  const response = await fetch(`${baseUrl}?page=${page}`, { headers })
  if (!response.ok) {
    logger.warn(
      `pollutant_metadatas page ${page} returned HTTP ${response.status} — stopping pagination`
    )
    return null
  }
  return response.json()
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
  let maxPages = POLLUTANT_METADATA_FALLBACK_MAX_PAGES
  let page = 1
  const records = []

  while (page <= maxPages) {
    const data = await fetchPollutantMetadataPage(baseUrl, headers, page)

    if (page === 1 && data) {
      maxPages = resolveMaxPages(
        data,
        POLLUTANT_METADATA_FALLBACK_MAX_PAGES,
        POLLUTANT_METADATA_PAGE_SIZE
      )
    }

    const pageRecords = data?.member ?? []
    records.push(...pageRecords)

    const isLastPage =
      !data ||
      pageRecords.length === 0 ||
      pageRecords.length < POLLUTANT_METADATA_PAGE_SIZE
    if (isLastPage) {
      break
    }

    page++
  }

  return records
}

/**
 * Updates the openDates map with the earliest startDate for a station.
 *
 * @param {Map<string, string>} openDates
 * @param {{ siteId: string, startDate?: string }} record
 */
function updateOpenDate(openDates, record) {
  if (!record.startDate) {
    return
  }
  const existing = openDates.get(record.siteId)
  const isEarlier =
    !existing ||
    new Date(record.startDate).getTime() < new Date(existing).getTime()
  if (isEarlier) {
    openDates.set(record.siteId, record.startDate)
  }
}

/**
 * Updates the closeDates map with the latest endDate for closed stations.
 *
 * @param {Map<string, string>} closeDates
 * @param {{ siteId: string, endDate?: string, measurementStatus?: string }} record
 */
function updateCloseDate(closeDates, record) {
  if (!record.endDate || record.measurementStatus !== 'closed') {
    return
  }
  const existing = closeDates.get(record.siteId)
  const isLater =
    !existing ||
    new Date(record.endDate).getTime() > new Date(existing).getTime()
  if (isLater) {
    closeDates.set(record.siteId, record.endDate)
  }
}

/**
 * Updates the currentPollutants map with DAQI codes for active instruments.
 *
 * @param {Map<string, Set<string>>} currentPollutants
 * @param {{ siteId: string, measurementStatus?: string, pollutantName?: string }} record
 */
function updateCurrentPollutants(currentPollutants, record) {
  if (record.measurementStatus !== 'current' || !record.pollutantName) {
    return
  }
  const code = pollutantNameToCode(record.pollutantName)
  if (!code) {
    return
  }
  if (!currentPollutants.has(record.siteId)) {
    currentPollutants.set(record.siteId, new Set())
  }
  currentPollutants.get(record.siteId).add(code)
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
    if (!record.siteId) {
      continue
    }
    updateOpenDate(openDates, record)
    updateCloseDate(closeDates, record)
    updateCurrentPollutants(currentPollutants, record)
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
