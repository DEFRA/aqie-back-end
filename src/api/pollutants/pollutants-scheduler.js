import { createLogger } from '~/src/helpers/logging/logger'
import { schedule } from 'node-cron'
import { config } from '~/src/config'
import {
  fetchPollutants,
  savePollutants
} from '~/src/api/pollutants/fetch-pollutants'
import { lock, unlock } from '~/src/helpers/db/lock'
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
        'pollutants Scheduler done! Running every hour between 6:00am to 23:00pm'
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
