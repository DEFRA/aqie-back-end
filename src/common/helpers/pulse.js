import hapiPulse from 'hapi-pulse'
import { createLogger } from './logging/logger.js'
import { TEN_SECONDS } from '../../api/pollutants/helpers/common/constants.js'

const logger = createLogger()

const pulse = {
  plugin: hapiPulse,
  options: {
    logger,
    timeout: TEN_SECONDS,
    preServerStop: async () => {
      logger.info('Shutdown signal received, stopping server')
    },
    postServerStop: async () => {
      logger.info('Server stopped, exiting')
    }
  }
}

export { pulse }
