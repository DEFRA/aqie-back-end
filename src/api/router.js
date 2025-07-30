import { forecasts, historicalForecasts } from './forecast/index.js'
import { measurements, historicalMeasurements } from './pollutants/index.js'
import { health } from './health/index.js'
import { config } from '../config/index.js'
import {
  metOfficeForecastRead,
  metOfficeForecastList
} from './metOfficeForecast/index.js'
import { monitoringStationInfo } from './locationsite/index.js'

const allowOriginUrl = config.get('allowOriginUrl')
const router = {
  plugin: {
    name: 'Router',
    register: async (server) => {
      await server.register([
        forecasts,
        historicalForecasts,
        measurements,
        historicalMeasurements,
        health,
        metOfficeForecastRead,
        metOfficeForecastList,
        monitoringStationInfo
      ])
    }
  },
  cors: {
    origin: [allowOriginUrl], // Allow only this domain
    headers:
      'Access-Control-Allow-Headers: Origin, Content-Type, Accept, X-Requested-With', // all default apart from Accept-language
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // all default apart from PATCH
    credentials: true,
    additionalHeaders: ['cache-control', 'x-requested-with'],
    preflightContinue: false
  }
}

export { router }
