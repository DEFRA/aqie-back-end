import { createLogger } from '../../helpers/logging/logger.js'
import { config } from '../../config/index.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { fetchOAuthToken } from './helpers/oauth-helpers.js'

const logger = createLogger()

const fetchMonitoringStations = async () => {
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

  const [statusCode, dataAll] = await catchProxyFetchError(
    ricardoApiAllDataUrl,
    options
  )

  if (!dataAll || !Array.isArray(dataAll.member)) {
    logger.warn(
      `Unexpected response from Ricardo all-data endpoint: status=${statusCode}`
    )
    return []
  }

  return dataAll.member.map((item) => ({
    name: item.siteName,
    area: item.governmentRegion,
    localSiteID: item.siteId,
    areaType: `${item.siteType} ${item.areaType}`,
    location: {
      type: 'Point',
      coordinates: [Number(item.latitude), Number(item.longitude)]
    },
    distance: item.distanceFromPoint,
    stationStatus: item.stationStatus ?? null
  }))
}

const saveMonitoringStations = async (server, stations) => {
  try {
    await server.db
      .collection('monitoringStations')
      .bulkWrite(stations.map(toBulkReplace))
    logger.info(`monitoringStations update done: ${stations.length} stations`)
  } catch (error) {
    logger.error(`monitoringStations update error: ${error}`)
  }
}

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
