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
  let measurementsFinal = []
  for (let i = 0; i < POLLUTANT_REGIONS.length; i++) {
    const res = await getAPIPollutants(POLLUTANT_REGIONS[i], currentTime)
    measurements.push(res)
  }
  measurementsFinal = measurements.flat().flat()
  return measurementsFinal
}

const savePollutants = async (server, pollutants) => {
  // await server.db.collection('measurements').deleteMany({})
  // await server.db.collection('historicalMeasurements').deleteMany({})
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
