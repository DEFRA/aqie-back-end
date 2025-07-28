import { getPollutants } from '../helpers/get-pollutants.js'
import { config } from '../../../config/index.js'

const pollutantsController = {
  handler: async (request, h) => {
    const measurements = await getPollutants(request.db)
    const allowOriginUrl = config.get('allowOriginUrl')
    return h
      .response({ message: 'success', measurements })
      .code(200)
      .header('Access-Control-Allow-Origin', allowOriginUrl)
  }
}

export { pollutantsController }
