import pino from 'pino'

import { loggerOptions } from '../logging/logger-options.js'

function createLogger() {
  return pino(loggerOptions)
}

export { createLogger }
