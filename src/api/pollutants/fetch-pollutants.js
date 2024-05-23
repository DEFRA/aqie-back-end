/* eslint-disable camelcase */
/* eslint-disable no-console */
/* eslint-disable prettier/prettier */
import { createLogger } from '~/src/helpers/logging/logger'
import { getAPIPollutants } from './helpers/get-api-pollutants'
import moment from 'moment-timezone'

process.setMaxListeners(500)

const logger = createLogger()
const momentDate = moment().tz('Europe/London')
const currentTime = new Date(momentDate)
const regions = [
  { name: 'North East Scotland', id: 3, split: 12 },
  { name: 'North Wales', id: 4, split: 2 },
  { name: 'Highland', id: 5, split: 4 },
  { name: 'Central Scotland', id: 6, split: 12 },
  { name: 'Eastern', id: 7, split: 12 },
  { name: 'South East', id: 8, split: 19 },
  { name: 'South Wales', id: 9, split: 9 },
  { name: 'NorthWest And Merseyside', id: 10, split: 19 },
  { name: 'South West', id: 11, split: 14 },
  { name: 'East Midlands', id: 12, split: 14 },
  { name: 'Scottish Borders', id: 13, split: 3 },
  { name: 'North East', id: 14, split: 9 },
  { name: 'Greater London', id: 15, split: 16 },
  { name: 'West Midlands', id: 16, split: 15 },
  { name: 'Yorkshire And Humberside', id: 17, split: 16 },
  { name: 'Isle of Man', id: 18, split: 7 }
]

const fetchPollutants = async () => {
  const measurements = []
  let measurementsFinal = []
  for (let i = 0; i < regions.length; i++) {
    const res = await getAPIPollutants(regions[i], currentTime)
    measurements.push(res)
  }
  measurementsFinal = measurements.flat().flat()
  return measurementsFinal
}

const savePollutants = async (server, pollutants) => {
  // await server.db.collection('measurements').deleteMany({})
  // await server.db.collection('historicalMeasurements').deleteMany({})
  logger.info(`updating ${pollutants.length} pollutants`)
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
