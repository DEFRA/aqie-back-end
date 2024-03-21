/* eslint-disable prettier/prettier */
import { createLogger } from '~/src/helpers/logging/logger'
import { fetchPollutants } from '~/src/api/pollutants/fetch-pollutants'

const logger = createLogger()

async function populatePollutantsApi(mongo, db) {
  const pollutantsCollection = db.collection('measurements')

  try {
    const pollutants = await fetchPollutants()

    const session = mongo.startSession()
    session.startTransaction()

    if (pollutants.length) {
      await pollutantsCollection.deleteMany({})
      await pollutantsCollection.insertMany(pollutants)
      logger.info(`Updated ${pollutants.length} pollutants`)
    }

    await session.commitTransaction()
    logger.info('Completed data population')
  } catch (error) {
    logger.error(error)
  }
}

export { populatePollutantsApi }
