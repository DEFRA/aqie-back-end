/* eslint-disable prettier/prettier */
import { getPollutants } from '~/src/api/pollutants/helpers/get-pollutants'
import { config } from '~/src/config'

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
