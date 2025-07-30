import { getForecasts } from '../helpers/get-forecasts.js'
import { config } from '../../../config/index.js'

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
