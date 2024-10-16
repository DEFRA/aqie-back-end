/* eslint-disable prettier/prettier */
import { getForecasts } from '~/src/api/forecast/helpers/get-forecasts'
import { config } from '~/src/config'

const forecastsController = {
  handler: async (request, h) => {
    const forecasts = await getForecasts(request.db)
    const allowOriginUrl = config.get('allowOriginUrl')
    return h
      .response({ message: 'success', forecasts })
      .code(200)
      .header('Access-Control-Allow-Origin', allowOriginUrl)
  }
}

export { forecastsController }
