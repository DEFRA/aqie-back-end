import { createLogger } from '../../../helpers/logging/logger.js'
import {
  fetchMonitoringStations,
  saveMonitoringStations
} from '../fetch-monitoring-stations.js'

const logger = createLogger()

async function populateMonitoringStationsApi(server) {
  try {
    const stations = await fetchMonitoringStations()

    if (stations.length) {
      await server.db.collection('monitoringStations').deleteMany({})
      await saveMonitoringStations(server, stations)
      logger.info(`Updated ${stations.length} monitoring stations`)
    } else {
      logger.info(
        'No monitoring stations returned from Ricardo — skipping update'
      )
    }
  } catch (error) {
    logger.error(error)
  }
}

export { populateMonitoringStationsApi }
