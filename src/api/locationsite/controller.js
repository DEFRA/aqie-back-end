import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { config } from '../../config/index.js'
import { fetchRicardoDataAll } from './helpers/fetch-ricardo-data-all.js'
import { refreshOAuthToken, fetchOAuthToken } from './helpers/oauth-helpers.js'
import { getMonitoringStations } from './helpers/get-monitoring-stations.js'
import {
  HTTP_OK,
  HTTP_INTERNAL_SERVER_ERROR
} from '../pollutants/helpers/common/constants.js'

const logger = createLogger()

const siteController = {
  handler: async (request, h) => {
    // Default path: serve basic station metadata from the MongoDB cache.
    // The cache is populated and periodically refreshed by monitoringStationsScheduler.
    if (!request.query?.stream || request.query.stream !== 'data') {
      const stations = await getMonitoringStations(request.db)
      const message =
        stations.length === 0
          ? 'No monitoring stations currently available in cache.'
          : `Monitoring Stations Info (${stations.length} stations)`
      return h.response({ message, stations }).code(HTTP_OK)
    }

    // stream=data path: live pass-through to Ricardo API, bypassing the cache.
    const ricardoApiAllDataUrl = config.get('ricardoApiAllDataUrl')

    const savedAccessToken = request.yar.get('savedAccessToken')
    const accessToken =
      savedAccessToken ||
      (await refreshOAuthToken(
        request,
        fetchOAuthToken,
        catchProxyFetchError,
        logger
      ))
    if (!accessToken) {
      return h
        .response({ error: 'Failed to fetch access token' })
        .code(HTTP_INTERNAL_SERVER_ERROR)
    }
    logger.info('Access token fetched successfully')

    const optionsOAuthRicardo = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }

    const dataAll = await fetchRicardoDataAll({
      ricardoApiAllDataUrl,
      optionsOAuthRicardo,
      requestQuery: request.query,
      catchProxyFetchError
    })

    return h.response({ measurements: dataAll }).code(HTTP_OK)
  }
}

export { siteController }
