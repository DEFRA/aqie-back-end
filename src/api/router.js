import { forecasts, historicalForecasts } from '~/src/api/forecast'
import { measurements, historicalMeasurements } from '~/src/api/pollutants'
import { health } from '~/src/api/health'
import { config } from '~/src/config'
import {
  metOfficeForecastRead,
  metOfficeForecastList
} from '~/src/api/metOfficeForecast'

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
        metOfficeForecastList
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
