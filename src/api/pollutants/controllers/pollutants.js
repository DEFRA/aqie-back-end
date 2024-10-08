/* eslint-disable prettier/prettier */
import { getPollutants } from '~/src/api/pollutants/helpers/get-pollutants'

const pollutantsController = {
  handler: async (request, h) => {
    const measurements = await getPollutants(request.db)

    return h.response({ message: 'success', measurements }).code(200)
  }
}

export { pollutantsController }
