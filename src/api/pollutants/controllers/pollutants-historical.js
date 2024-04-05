/* eslint-disable prettier/prettier */
import { getPollutantsHistorical } from '~/src/api/pollutants/helpers/get-pollutants-historical'

const historicalPollutantsController = {
  handler: async (request, h) => {
    const historicalMeasurements = await getPollutantsHistorical(request.db)

    return h.response({ message: 'success', historicalMeasurements }).code(200)
  }
}

export { historicalPollutantsController }
