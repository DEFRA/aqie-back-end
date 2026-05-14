import { createLogger } from '../../helpers/logging/logger.js'
import { schedule } from 'node-cron'
import { config } from '../../config/index.js'
import {
  fetchMonitoringStations,
  saveMonitoringStations
} from './fetch-monitoring-stations.js'
import { lock, unlock } from '../../helpers/db/lock.js'

const logger = createLogger()

const monitoringStationsScheduler = {
  plugin: {
    name: 'Monitoring Stations Scheduler',
    register: async (server) => {
      logger.info('starting Monitoring Stations Scheduler')
      schedule(config.get('monitoringStationsSchedule'), async () => {
        await fetchAndSaveMonitoringStations(server)
      })
      logger.info(
        'Monitoring Stations Scheduler done! Running every 6 hours'
      )
    }
  }
}

async function fetchAndSaveMonitoringStations(server) {
  if (await lock(server.db, 'monitoringStations')) {
    try {
      const stations = await fetchMonitoringStations()
      logger.info(`Fetched ${stations.length} monitoring stations`)
      await saveMonitoringStations(server, stations)
      logger.info('saveMonitoringStations done!')
    } catch (err) {
      logger.error('Error fetching and saving monitoring stations', err)
    } finally {
      await unlock(server.db, 'monitoringStations')
    }
  }
  logger.info('monitoring stations save bypassed!')
}

export { monitoringStationsScheduler }
