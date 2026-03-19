import { getPollutants } from '../helpers/get-pollutants.js'
import { config } from '../../../config/index.js'
import { HTTP_OK } from '../helpers/common/constants.js'

const pollutantsController = {
  handler: async (request, h) => {
    const measurements = await getPollutants(request.db)
    const allowOriginUrl = config.get('allowOriginUrl')
    return h
      .response({ message: 'success', measurements })
      .code(HTTP_OK)
      .header('Access-Control-Allow-Origin', allowOriginUrl)
  }
}

export { pollutantsController }
