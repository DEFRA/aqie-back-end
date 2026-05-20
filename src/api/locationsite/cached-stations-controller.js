import { getMonitoringStations } from './helpers/get-monitoring-stations.js'
import { HTTP_OK } from '../pollutants/helpers/common/constants.js'

const cachedStationsController = {
  handler: async (request, h) => {
    const stations = await getMonitoringStations(request.db)
    const message =
      stations.length === 0
        ? 'No monitoring stations currently available in cache.'
        : `Monitoring Stations Info (${stations.length} stations)`
    return h.response({ message, stations }).code(HTTP_OK)
  }
}

export { cachedStationsController }
