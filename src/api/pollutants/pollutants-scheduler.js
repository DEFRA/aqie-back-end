import { createLogger } from '~/src/helpers/logging/logger'
import { schedule } from 'node-cron'
import { config } from '~/src/config'
import {
  fetchPollutants,
  savePollutants
} from '~/src/api/pollutants/fetch-pollutants'
const logger = createLogger()

// Populate the DB in this template on startup of the API.
// This is an example to show developers an API with a DB, with data in it and endpoints that query the db.
const pollutantsScheduler = {
  plugin: {
    name: 'Pollutants Scheduler',
    register: async (server) => {
      // Pre-populate the data so we dont have to wait an hour
      await fetchAndSavePollutants(server)

      // Start the scheduler
      logger.info('starting pollutants Scheduler')
      schedule(config.get('pollutantsSchedule'), async () => {
        await fetchAndSavePollutants(server)
      })
      logger.info('pollutants Scheduler done!')
    }
  }
}

async function fetchAndSavePollutants(server) {
  const measurements = await fetchPollutants()
  await savePollutants(server, measurements)
}

export { pollutantsScheduler }
