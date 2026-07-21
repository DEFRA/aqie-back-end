import { config } from '../../config/index.js'
import { createLogger } from '../../helpers/logging/logger.js'
import { HTTP_OK } from '../pollutants/helpers/common/constants.js'

const logger = createLogger()

const aurnDataController = {
  handler: async (request, h) => {
    const measurements = await request.db
      .collection('aurnMeasurements')
      .find({}, { projection: { _id: 0 } })
      .toArray()

    const message =
      measurements.length === 0
        ? 'No AURN measurements currently available in cache.'
        : `AURN measurements (${measurements.length} stations)`

    logger.info(message)

    const allowOriginUrl = config.get('allowOriginUrl')
    return h
      .response({ message, measurements })
      .code(HTTP_OK)
      .header('Access-Control-Allow-Origin', allowOriginUrl)
  }
}

export { aurnDataController }
