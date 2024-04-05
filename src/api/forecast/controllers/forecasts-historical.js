/* eslint-disable prettier/prettier */
import { getForecastsHistorical } from '~/src/api/forecast/helpers/get-forecasts-historical'

const historicalForecastsController = {
  handler: async (request, h) => {
    const historicalForecasts = await getForecastsHistorical(request.db)

    return h.response({ message: 'success', historicalForecasts }).code(200)
  }
}

export { historicalForecastsController }
