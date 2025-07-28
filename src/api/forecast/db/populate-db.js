import { createLogger } from '../../../helpers/logging/logger.js'
import { populateApi } from './populate-api.js'

const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const populateDb = {
  plugin: {
    name: 'Populate Pollutants Db',
    register: async (server) => {
      try {
        await populateApi(server.mongoClient, server.db)
      } catch (error) {
        logger.error(error)
      }
    }
  }
}

export { populateDb }
