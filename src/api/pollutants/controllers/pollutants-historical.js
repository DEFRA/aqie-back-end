import { getPollutantsHistorical } from '../helpers/get-pollutants-historical.js'

const historicalPollutantsController = {
  handler: async (request, h) => {
    const historicalMeasurements = await getPollutantsHistorical(request.db)

    return h.response({ message: 'success', historicalMeasurements }).code(200)
  }
}

export { historicalPollutantsController }
