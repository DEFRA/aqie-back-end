import convict from 'convict'
import path from 'path'

const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'aqie-back-end'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.normalize(path.join(__dirname, '..', '..'))
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'production'
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: process.env.NODE_ENV !== 'production'
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: process.env.NODE_ENV === 'test'
  },
  logLevel: {
    doc: 'Logging level',
    format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
    default: 'info',
    env: 'LOG_LEVEL'
  },
  mongoUri: {
    doc: 'URI for mongodb',
    format: '*',
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'aqie-back-end',
    env: 'MONGO_DATABASE'
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  },
  forecastUrl: {
    doc: 'URL to the forecast data service',
    format: String,
    default: 'https://uk-air.defra.gov.uk/assets/rss/forecast.xml',
    env: 'FORECAST_URL'
  },
  forecastSchedule: {
    doc: 'How often to poll the forecast data (cron format)',
    format: String, // TODO: maybe custom validate this
    default: '5 * * * * *',
    env: 'FORECAST_SCHEDULE'
  },
  pollutantstUrl: {
    doc: 'URL to the forecast data service',
    format: String,
    default: 'https://uk-air.defra.gov.uk/assets/rss/forecast.xml',
    env: 'FORECAST_URL'
  },
  pollutantsSchedule: {
    doc: 'How often to poll the forecast data (cron format)',
    format: String, // TODO: maybe custom validate this
    default: '5 * * * * *',
    env: 'FORECAST_SCHEDULE'
  }
})

config.validate({ allowed: 'strict' })

export { config }
