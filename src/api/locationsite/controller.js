import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { config } from '../../config/index.js'
import { buildEnrichedTempData } from './helpers/build-enriched-temp-data.js'
import { fetchRicardoDataAll } from './helpers/fetch-ricardo-data-all.js'
import { refreshOAuthToken, fetchOAuthToken } from './helpers/oauth-helpers.js'

const logger = createLogger()

const siteController = {
  handler: async (request, h) => {
    const ricardoApiAllDataUrl = config.get('ricardoApiAllDataUrl')
    const ricardoApiSiteIdUrl = config.get('ricardoApiSiteIdUrl')

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
      return h.response({ error: 'Failed to fetch access token' }).code(500)
    }
    logger.info('Access token fetched successfully')
    const optionsOAuthRicardo = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }

    // Use the new helper to fetch dataAll, passing catchProxyFetchError explicitly
    const dataAll = await fetchRicardoDataAll({
      ricardoApiAllDataUrl,
      optionsOAuthRicardo,
      requestQuery: request.query,
      catchProxyFetchError
    })

    // Set requestQuery globally for the helper
    global.requestQuery = request.query
    const enrichedTempData = await buildEnrichedTempData({
      dataAll,
      ricardoApiSiteIdUrl,
      accessToken,
      logger,
      catchProxyFetchError
    })

    return h
      .response({
        message: `Monitoring Stations Info for ${enrichedTempData[0]?.name} - ${enrichedTempData[1]?.name} - ${enrichedTempData[2]?.name}`,
        measurements: enrichedTempData
      })
      .code(200)
  }
}

export { siteController }
