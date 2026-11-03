import { createLogger } from '../../../helpers/logging/logger.js'
import { populateMonitoringStationsApi } from './populate-api.js'

const logger = createLogger()

const populateMonitoringStationsDb = {
  plugin: {
    name: 'Populate Monitoring Stations Db',
    register: async (server) => {
      // Populate once the server is listening: awaiting the Ricardo/postcodes calls here
      // would delay server.start() and CDP's /health check would fail in the meantime.
      server.events.once('start', () => {
        populateMonitoringStationsApi(server).catch((error) => {
          logger.error(error)
        })
      })
    }
  }
}

export { populateMonitoringStationsDb }
