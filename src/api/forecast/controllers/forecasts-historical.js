import { getForecastsHistorical } from '../helpers/get-forecasts-historical.js'

const historicalForecastsController = {
  handler: async (request, h) => {
    const historicalForecasts = await getForecastsHistorical(request.db)

    return h.response({ message: 'success', historicalForecasts }).code(200)
  }
}

export { historicalForecastsController }
