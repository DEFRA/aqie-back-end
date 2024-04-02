/* eslint-disable prettier/prettier */
import { createLogger } from '~/src/helpers/logging/logger'
import { fetchPollutants } from '~/src/api/pollutants/fetch-pollutants'

const logger = createLogger()

async function populatePollutantsApi(mongo, db) {
  const pollutantsCollection = db.collection('measurements')

  try {
    const measurements = await fetchPollutants()

    const session = mongo.startSession()
    session.startTransaction()

    if (measurements.length) {
      await pollutantsCollection.deleteMany({})
      await pollutantsCollection.insertMany(measurements)
      logger.info(`Updated ${measurements.length} measurements`)
    }

    await session.commitTransaction()
    logger.info('Completed pollutants data population')
  } catch (error) {
    logger.error(error)
  }
}

export { populatePollutantsApi }
