import Hapi from '@hapi/hapi'

import { config } from '../config/index.js'
import { router } from './router.js'
import { requestLogger } from '../helpers/logging/request-logger.js'
import { mongoPlugin } from '../helpers/mongodb.js'
import { failAction } from '../helpers/fail-action.js'
import { forecastScheduler } from './forecast/forecast-scheduler.js'
import { pollutantsScheduler } from './pollutants/pollutants-scheduler.js'
import { secureContext } from '../helpers/secure-context/index.js'
import { setupProxy } from '../common/helpers/proxy/setup-proxy.js'
import { createLogger } from '../helpers/logging/logger.js'

import yar from '@hapi/yar'
import crypto from 'crypto'

const logger = createLogger()

const isProduction = config.get('isProduction')

async function createServer() {
  setupProxy()
  logger.info('Proxy setup completed')
  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  // Register yar session plugin
  await server.register({
    plugin: yar,
    options: {
      storeBlank: false,
      cookieOptions: {
        password:
          process.env.YAR_COOKIE_PASSWORD ||
          crypto.randomBytes(32).toString('hex'),
        isSecure: process.env.NODE_ENV === 'production'
      }
    }
  })
  await server.register(requestLogger)

  if (isProduction) {
    await server.register(secureContext)
  }

  await server.register({ plugin: mongoPlugin, options: {} })

  await server.register(router)

  await server.register(forecastScheduler)

  await server.register(pollutantsScheduler)

  return server
}

export { createServer }
