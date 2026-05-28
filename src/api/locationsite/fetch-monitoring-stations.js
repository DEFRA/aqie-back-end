import { createLogger } from '../../helpers/logging/logger.js'
import { config } from '../../config/index.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { fetchOAuthToken } from './helpers/oauth-helpers.js'
import { getLocalAuthorityForCoords } from './helpers/get-local-authority.js'

const logger = createLogger()

/**
 * Fetches all monitoring stations from the Ricardo API, enriches each with a
 * local authority name via the OS Names API, and returns the shaped array.
 *
 * Each station's local authority lookup is performed concurrently. If the OS
 * Names API call fails for an individual station, that station's localAuthority
 * is set to null rather than failing the entire batch.
 *
 * @returns {Promise<Array<{
 *   name: string,
 *   area: string,
 *   localAuthority: string|null,
 *   localSiteID: string,
 *   areaType: string,
 *   location: { type: 'Point', coordinates: [number, number] },
 *   distance: number|null,
 *   stationStatus: string|null
 * }>>} Resolves to an array of enriched station objects, or an empty array if
 *   the Ricardo API response is missing or malformed.
 * @throws {Error} If the OAuth token fetch fails.
 */
async function fetchMonitoringStations() {
  const ricardoApiAllDataUrl = config.get('ricardoApiAllDataUrl')

  const accessToken = await fetchOAuthToken(catchProxyFetchError, logger)
  if (!accessToken) {
    throw new Error(
      'Failed to fetch OAuth token for monitoring stations refresh'
    )
  }

  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  }

  const url = new URL(ricardoApiAllDataUrl)
  url.searchParams.set('with-closed', 'true')

  const [statusCode, dataAll] = await catchProxyFetchError(
    url.toString(),
    options
  )

  if (!dataAll || !Array.isArray(dataAll.member)) {
    logger.warn(
      `Unexpected response from Ricardo all-data endpoint: status=${statusCode}`
    )
    return []
  }

  const { member: stations } = dataAll

  return Promise.all(
    stations.map(async (item) => {
      const lat = Number(item.latitude)
      const lng = Number(item.longitude)
      const localAuthority = await getLocalAuthorityForCoords(lat, lng).catch(
        () => null
      )
      return {
        name: item.siteName,
        area: item.governmentRegion,
        localAuthority,
        localSiteID: item.siteId,
        areaType: `${item.siteType} ${item.areaType}`,
        location: {
          type: 'Point',
          coordinates: [lat, lng]
        },
        distance: item.distanceFromPoint,
        stationStatus: item.stationStatus ?? null
      }
    })
  )
}

/**
 * Persists an array of monitoring stations to the monitoringStations collection
 * using a bulk upsert (replaceOne), matching on station name.
 *
 * @param {object} server - The Hapi server instance with a db property.
 * @param {Array<object>} stations - Array of shaped station objects to upsert.
 * @returns {Promise<void>}
 */
async function saveMonitoringStations(server, stations) {
  try {
    await server.db
      .collection('monitoringStations')
      .bulkWrite(stations.map(toBulkReplace))
    logger.info(`monitoringStations update done: ${stations.length} stations`)
  } catch (error) {
    logger.error(`monitoringStations update error: ${error}`)
  }
}

/**
 * Builds a MongoDB bulkWrite replaceOne operation for a single station.
 * Upserts by station name — inserts if not found, replaces entirely if found.
 *
 * @param {object} item - A shaped station object.
 * @returns {{ replaceOne: { filter: object, replacement: object, upsert: boolean } }}
 */
function toBulkReplace(item) {
  return {
    replaceOne: {
      filter: { name: item.name },
      replacement: item,
      upsert: true
    }
  }
}

export { fetchMonitoringStations, saveMonitoringStations }
