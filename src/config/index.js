import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

import { convictValidateMongoUri } from '../common/helpers/convict/validate-mongo-uri.js'

convict.addFormat(convictValidateMongoUri)
convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
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
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
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
  mongo: {
    mongoUrl: {
      doc: 'URI for mongodb',
      format: String,
      default: 'mongodb://127.0.0.1:27017/',
      env: 'MONGO_URI'
    },
    databaseName: {
      doc: 'database for mongodb',
      format: String,
      default: 'cdp-node-backend-template',
      env: 'MONGO_DATABASE'
    },
    mongoOptions: {
      retryWrites: {
        doc: 'enable mongo write retries',
        format: Boolean,
        default: false
      },
      readPreference: {
        doc: 'mongo read preference',
        format: [
          'primary',
          'primaryPreferred',
          'secondary',
          'secondaryPreferred',
          'nearest'
        ],
        default: 'secondary'
      }
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTPS_PROXY'
  },
  httpProxyNew: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
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
    default: '0 05-10 * * *',
    env: 'FORECAST_SCHEDULE'
  },
  pollutantstUrl: {
    doc: 'URL to the pollutants data service',
    format: String,
    default:
      'https://uk-air.defra.gov.uk/data/API/site-process-featureofinterest-by-region?group_id=4&closed=false&region_id=',
    env: 'POLLUTANTS_URL'
  },
  pollutantstUrlExtra: {
    doc: 'URL to the pollutants data service',
    format: String,
    default:
      'https://uk-air.defra.gov.uk/sos-ukair/service?service=AQD&version=1.0.0&request=GetObservation&temporalFilter=om:phenomenonTime,',
    env: 'POLLUTANTS_URL_EXTRA'
  },
  pollutantsSchedule: {
    doc: 'How often to poll the pollutants data (cron format)',
    format: String, // TODO: maybe custom validate this
    default: '0 */1 * * *',
    env: 'POLLUTANTS_SCHEDULE'
  },
  alertNotifucationUrl: {
    doc: 'URL to the Notify API service',
    format: String,
    default: 'https://api.notifications.service.gov.uk',
    env: 'NOTIFY_BASE_URL'
  },
  squidProxyUsername: {
    doc: 'Squid Proxy username',
    format: String,
    default: '',
    env: 'SQUID_USERNAME'
  },
  squidProxyPassword: {
    doc: 'Squid Proxy password',
    format: '*',
    default: '',
    sensitive: true,
    env: 'SQUID_PASSWORD'
  },
  allowOriginUrl: {
    doc: 'URL to Access-Control-Allow-Origin',
    format: String,
    default: '',
    env: 'ACCESS_CONTROL_ALLOW_ORIGIN_URL'
  },
  sftpPrivateKey: {
    doc: 'SSH Private Key - To Fetch Met Office Data From SFTP DEFRA Server',
    format: String, // TODO: maybe custom validate this
    default: '',
    env: 'SSH_PRIVATE_KEY'
  },
  ricardoApiLoginUrl: {
    doc: 'Ricardo API login url',
    format: String,
    default: 'https://uk-air-api.staging.rcdo.co.uk/api/login_check',
    env: 'RICARDO_API_LOGIN_URL'
  },
  ricardoApiAllDataUrl: {
    doc: 'Ricardo API all data url',
    format: String,
    default: 'https://uk-air-api.staging.rcdo.co.uk/api/site_meta_datas?',
    env: 'RICARDO_API_ALL_DATA_URL'
  },
  ricardoApiSiteIdUrl: {
    doc: 'Ricardo API site ID data url',
    format: String,
    default:
      'https://uk-air-api.staging.rcdo.co.uk/api/pollutant_measurement_datas?',
    env: 'RICARDO_API_SITE_ID_URL'
  },
  ricardoApiEmail: {
    doc: 'Ricardo API email',
    format: String,
    default: 'maruthi.chokkanathan@cognizant.com',
    env: 'RICARDO_API_EMAIL'
  },
  ricardoApiPassword: {
    doc: 'Ricardo API password',
    format: '*',
    sensitive: true,
    default: 'Mr5e7TFseqzD8Mt#',
    env: 'RICARDO_API_PASSWORD'
  }
})

config.validate({ allowed: 'strict' })

export { config }
