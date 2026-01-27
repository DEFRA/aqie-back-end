import {
  getUsers,
  getForecasts,
  getPreviousForecast,
  storeForecast
} from './db.js'
// import { sendEmailAlert } from './notifyService'
import { findNearestLocation } from './get-nearest-location.js'

const AQI_THRESHOLD = 6

const processAlerts = async () => {
  try {
    console.log('Starting alert processing...')

    const users = await getUsers()
    if (!users.length) {
      console.log('No users found for alerts.')
      return
    }

    const forecasts = await getForecasts()
    if (!forecasts || forecasts.length === 0) {
      console.log('No forecast data available.')
      return
    }

    for (const user of users) {
      const allUserAlerts = [] // collect all alerts to send a single notification per user

      for (const loc of user.location) {
        const userLocName = loc.location_name
        const userCoordinates = loc.coordinates

        if (!Array.isArray(userCoordinates) || userCoordinates.length !== 2) {
          console.warn(
            `Invalid coordinates for user: ${user.email}, location: ${userLocName}`
          )
          continue
        }

        const nearestForecast = await findNearestLocation(
          userCoordinates,
          forecasts
        )
        if (!nearestForecast) {
          console.warn(
            `No nearest forecast found for ${user.email} at ${userLocName}`
          )
          continue
        }

        const todayForecast = nearestForecast.forecast
        const nearestLocName = nearestForecast.name
        const nearestCoordinates = nearestForecast.location.coordinates

        const previousForecast = await getPreviousForecast(nearestLocName)
        const alertsToSend = []

        const isRecentlyAdded =
          Date.now() - new Date(loc.time_stamp).getTime() < 24 * 60 * 60 * 1000

        todayForecast.forEach(async (dayForecast) => {
          const prevDay = previousForecast?.forecast_data?.find(
            (d) => d.day === dayForecast.day
          )
          const alreadyNotified = prevDay?.alerted

          const isOverThreshold = dayForecast.value > AQI_THRESHOLD
          const isChanged = prevDay && prevDay.value !== dayForecast.value

          // For newly added locations, only alert on over-threshold values
          const shouldAlert = isRecentlyAdded
            ? isOverThreshold
            : (isOverThreshold && !alreadyNotified) ||
              (isChanged && alreadyNotified)

          if (shouldAlert) {
            alertsToSend.push({
              day: dayForecast.day,
              value: dayForecast.value,
              user_location_name: userLocName,
              nearest_location_name: nearestLocName
            })
            // Store updated forecast data with alert tracking
            const updatedForecastData = todayForecast.map((d) => ({
              ...d,
              alerted: d.value > AQI_THRESHOLD,
              last_alerted_value: d.value > AQI_THRESHOLD ? d.value : null
            }))

            await storeForecast(
              userLocName,
              userCoordinates,
              nearestLocName,
              nearestCoordinates,
              updatedForecastData
            )
          }
        })
        if (alertsToSend.length > 0) {
          allUserAlerts.push(...alertsToSend)
        }
      }

      if (allUserAlerts.length > 0) {
        // await sendEmailAlert(user, allUserAlerts)
        console.log(`Alerts for ${user.email}:`, allUserAlerts)
      }
    }
    console.log('Alert processing completed.')
  } catch (error) {
    console.error('Error in alert processing:', error)
  }
}

processAlerts()
