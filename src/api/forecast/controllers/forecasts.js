import { getForecasts } from '../helpers/get-forecasts.js'
import { config } from '../../../config/index.js'
import { HTTP_OK } from '../../pollutants/helpers/common/constants.js'

const forecastsController = {
  handler: async (request, h) => {
    const forecasts = await getForecasts(request.db)
    const allowOriginUrl = config.get('allowOriginUrl')
    return h
      .response({ message: 'success', forecasts })
      .code(HTTP_OK)
      .header('Access-Control-Allow-Origin', allowOriginUrl)
  }
}

export { forecastsController }
