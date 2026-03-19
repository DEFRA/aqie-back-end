import hapiPulse from 'hapi-pulse'
import { createLogger } from './logging/logger.js'
import { TEN_SECONDS } from '../../api/pollutants/helpers/common/constants.js'

const pulse = {
  plugin: hapiPulse,
  options: {
    logger: createLogger(),
    timeout: TEN_SECONDS
  }
}

export { pulse }
