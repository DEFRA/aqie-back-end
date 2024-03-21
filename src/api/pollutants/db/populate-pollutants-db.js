/* eslint-disable prettier/prettier */
import { createLogger } from '~/src/helpers/logging/logger'
import { populatePollutantsApi } from '~/src/api/pollutants/db/populate-pollutants-api'

const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const populatePollutantsDb = {
  plugin: {
    name: 'Populate Pollutants Db',
    register: async (server) => {
      try {
        await populatePollutantsApi(server.mongoClient, server.db)
      } catch (error) {
        logger.error(error)
      }
    }
  }
}

export { populatePollutantsDb }
