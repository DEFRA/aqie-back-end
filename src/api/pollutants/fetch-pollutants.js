import { createLogger } from '../../helpers/logging/logger.js'
import { getAPIPollutants } from './helpers/get-api-pollutants.js'
import moment from 'moment-timezone'
import { MAX_LISTENERS, POLLUTANT_REGIONS } from './helpers/common/constants.js'

process.setMaxListeners(MAX_LISTENERS)

const logger = createLogger()
const momentDate = moment().tz('Europe/London')
const currentTime = new Date(momentDate)

const fetchPollutants = async () => {
  const measurements = []
  for (const region of POLLUTANT_REGIONS) {
    const res = await getAPIPollutants(region, currentTime)
    measurements.push(res)
  }
  return measurements.flat().flat()
}

const savePollutants = async (server, pollutants) => {
  logger.info(`updating ${pollutants.length} pollutants`)
  logger.info(`pollutantsss ${JSON.stringify(pollutants)}`)
  try {
    await server.db
      .collection('measurements')
      .bulkWrite(pollutants.map(toBulkReplace))
  } catch (error) {
    logger.info('pollutants measurements error: ', error)
  }
  await server.db.collection('historicalMeasurements').insertMany(pollutants)
  logger.info('pollutants historical measurements update done')
}

/**
 * Wrap the item we want to update in a MongoDB replace command
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

export { fetchPollutants, savePollutants }
