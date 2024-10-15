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
        'https://aqie-back-end.dev.cdp-int.defra.cloud'
      )
  }
}

export { forecastsController }
