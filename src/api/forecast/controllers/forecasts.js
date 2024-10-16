/* eslint-disable prettier/prettier */
import { getForecasts } from '~/src/api/forecast/helpers/get-forecasts'

const forecastsController = {
  handler: async (request, h) => {
    const forecasts = await getForecasts(request.db)
    return h
      .response({ message: 'success', forecasts })
      .code(200)
      .header(
        'Access-Control-Allow-Origin',
        'https://check-air-quality.service.gov.uk'
      )
  }
}

export { forecastsController }
