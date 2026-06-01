import { createLogger } from '../../../helpers/logging/logger.js'
import { populateMonitoringStationsApi } from './populate-api.js'

const logger = createLogger()

const populateMonitoringStationsDb = {
  plugin: {
    name: 'Populate Monitoring Stations Db',
    register: async (server) => {
      try {
        await populateMonitoringStationsApi(server)
      } catch (error) {
        logger.error(error)
      }
    }
  }
}

export { populateMonitoringStationsDb }
