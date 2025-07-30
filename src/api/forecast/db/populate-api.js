import { createLogger } from '../../../helpers/logging/logger.js'
import { fetchForecasts } from '../fetch-forecast.js'

const logger = createLogger()

async function populateApi(mongo, db) {
  const forecastsCollection = db.collection('forecasts')

  try {
    const forecasts = await fetchForecasts()

    const session = mongo.startSession()
    session.startTransaction()

    if (forecasts.length) {
      await forecastsCollection.deleteMany({})
      await forecastsCollection.insertMany(forecasts)
      logger.info(`Updated ${forecasts.length} forecasts`)
    }

    await session.commitTransaction()
    logger.info('Completed data population')
  } catch (error) {
    logger.error(error)
  }
}

export { populateApi }
