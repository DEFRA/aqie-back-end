import { createLogger } from '../../../../helpers/logging/logger.js'
import { STALE_DATA_THRESHOLD_MINUTES } from './constants.js'

const logger = createLogger()

function validateDataFreshness(
  endDateTime,
  pollutantName = 'Unknown',
  stationName = 'Unknown'
) {
  if (!endDateTime) {
    logger.warn(
      `No endDateTime found for pollutant: ${pollutantName} at station: ${stationName}`
    )
    return false
  }

  const now = new Date()
  const dataTime = new Date(endDateTime)
  const diffMinutes = (now - dataTime) / (1000 * 60)

  if (diffMinutes > STALE_DATA_THRESHOLD_MINUTES) {
    logger.error(
      `STALE DATA DETECTED: Station '${stationName}' | Pollutant '${pollutantName}' data is ${Math.round(diffMinutes)} minutes old (endDate: ${endDateTime}). Expected data within ${STALE_DATA_THRESHOLD_MINUTES} minutes.`
    )
    return false
  }

  return true
}

export { validateDataFreshness }
