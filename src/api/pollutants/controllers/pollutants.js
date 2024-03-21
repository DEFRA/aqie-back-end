/* eslint-disable prettier/prettier */
import { getPollutants } from '~/src/api/pollutants/helpers/get-pollutants'

const pollutantsController = {
    handler: async (request, h) => {
        const pollutants = await getPollutants(request.db)

        return h.response({ message: 'success', pollutants }).code(200)
    }
}

export { pollutantsController }
