import { createLogger } from '../../helpers/logging/logger.js'
import { schedule } from 'node-cron'
import { config } from '../../config/index.js'
import { populateAurnMeasurementsApi } from './db/populate-api.js'
import { lock, unlock } from '../../helpers/db/lock.js'

const logger = createLogger()

const aurnScheduler = {
  plugin: {
    name: 'AURN Measurements Scheduler',
    register: async (server) => {
      logger.info('Starting AURN Measurements Scheduler')
      schedule(config.get('aurnSchedule'), async () => {
        await fetchAndSaveAurnMeasurements(server)
      })
      logger.info(
        `AURN Measurements Scheduler registered (${config.get('aurnSchedule')})`
      )
    }
  }
}

async function fetchAndSaveAurnMeasurements(server) {
  if (await lock(server.db, 'aurnMeasurements')) {
    try {
      await populateAurnMeasurementsApi(server)
    } catch (err) {
      logger.error('Error fetching and saving AURN measurements', err)
    } finally {
      await unlock(server.db, 'aurnMeasurements')
    }
  } else {
    logger.info('AURN measurements update bypassed — lock already held')
  }
}

export { aurnScheduler }
