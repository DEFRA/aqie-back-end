import { createLogger } from '../../helpers/logging/logger.js'
import { schedule } from 'node-cron'
import { config } from '../../config/index.js'
import { fetchPollutants, savePollutants } from './fetch-pollutants.js'
import { lock, unlock } from '../../helpers/db/lock.js'
const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const pollutantsScheduler = {
  plugin: {
    name: 'Pollutants Scheduler',
    register: async (server) => {
      // Start the scheduler
      // await fetchAndSavePollutants(server)
      logger.info('starting pollutants Scheduler')
      schedule(config.get('pollutantsSchedule'), async () => {
        await fetchAndSavePollutants(server)
      })
      logger.info(
        'pollutants Scheduler done! Running every hour between 4:00 to 24:00'
      )
    }
  }
}

async function fetchAndSavePollutants(server) {
  if (await lock(server.db, 'pollutants')) {
    try {
      const measurements = await fetchPollutants()
      logger.info(`updating ${measurements.length} measurements`)
      const result = measurements.filter(function ({ name }) {
        return !this.has(name) && this.add(name)
      }, new Set())
      logger.info(`updating ${result.length} result`)
      await savePollutants(server, result)
    } finally {
      await unlock(server.db, 'pollutants')
    }
  }
}

export { pollutantsScheduler }
