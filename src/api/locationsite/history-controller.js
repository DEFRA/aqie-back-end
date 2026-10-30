import { LRUCache } from 'lru-cache'
import { createLogger } from '../../helpers/logging/logger.js'
import { catchProxyFetchError } from './helpers/catch-proxy-fetch-error.js'
import { buildHistorySummary } from './helpers/build-history-summary.js'
import { refreshOAuthToken, fetchOAuthToken } from './helpers/oauth-helpers.js'
import {
  fetchPollutantHistory,
  PERIOD_DAYS
} from './helpers/fetch-pollutant-history.js'
import {
  HTTP_OK,
  HTTP_BAD_REQUEST,
  HTTP_BAD_GATEWAY,
  MS_PER_MINUTE
} from '../pollutants/helpers/common/constants.js'

const logger = createLogger()

const DEFAULT_PERIOD = '24h'
const RESOLUTION = 'hourly'

// Every `time` in the response is the end of its averaging period, so a
// reading for 09:00-10:00 is stamped 10:00.
const TIME_BASIS = 'end'

// Ricardo accepts only the siteId form (UKA00315); localSiteId (MY1) 422s.
const SITE_ID_PATTERN = /^[A-Za-z]{2,4}\d{3,8}$/

const CACHE_TTL_MINUTES = 15
const CACHE_TTL_MS = CACHE_TTL_MINUTES * MS_PER_MINUTE
const CACHE_MAX_ENTRIES = 500

// Readings for a completed hour never change, so responses are safe to cache.
const historyCache = new LRUCache({
  max: CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL_MS
})

const monitoringStationHistoryController = {
  handler: async (request, h) => {
    const siteId = request.query?.siteId
    const period = request.query?.period ?? DEFAULT_PERIOD

    if (typeof siteId !== 'string' || !SITE_ID_PATTERN.test(siteId)) {
      return h
        .response({
          error: 'Invalid siteId',
          message:
            'siteId is required and must be a Ricardo siteId, e.g. UKA00315'
        })
        .code(HTTP_BAD_REQUEST)
    }

    if (!Object.hasOwn(PERIOD_DAYS, period)) {
      return h
        .response({
          error: 'Invalid period',
          message: `period must be one of: ${Object.keys(PERIOD_DAYS).join(', ')}`
        })
        .code(HTTP_BAD_REQUEST)
    }

    const cacheKey = `${siteId}:${period}`
    const cached = historyCache.get(cacheKey)
    if (cached) {
      return h.response(cached).code(HTTP_OK)
    }

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
      logger.error('Pollutant history: failed to obtain Ricardo access token')
      return h
        .response({
          error: 'Bad Gateway',
          message: 'Unable to authenticate with the upstream measurement API'
        })
        .code(HTTP_BAD_GATEWAY)
    }

    const result = await fetchPollutantHistory({
      siteId,
      period,
      accessToken,
      catchProxyFetchError,
      logger
    })

    if (result.upstreamError) {
      return h
        .response({
          error: 'Bad Gateway',
          message: 'Unable to retrieve measurements from the upstream API'
        })
        .code(HTTP_BAD_GATEWAY)
    }

    const payload = {
      siteId,
      period,
      resolution: RESOLUTION,
      timeBasis: TIME_BASIS,
      from: result.from,
      to: result.to,
      truncated: result.truncated,
      pollutants: result.pollutants,
      fifteenMinute: result.fifteenMinute,
      summary: buildHistorySummary({ period, ...result })
    }

    historyCache.set(cacheKey, payload)
    return h.response(payload).code(HTTP_OK)
  }
}

export { monitoringStationHistoryController, historyCache }
