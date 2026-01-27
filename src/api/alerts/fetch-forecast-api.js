import {
  getUsers,
  getForecasts,
  getPreviousForecast,
  storeForecastBatch
} from './db.js'
// import { sendEmailAlert } from './notifyService'
import { findNearestLocation } from './get-nearest-location.js'

const AQI_THRESHOLD = 6
const processAlerts = async () => {
  try {
    console.log('Starting alert processing...')

    const users = await getUsers()
    if (!users.length) return console.log('No users found.')

    const forecasts = await getForecasts()
    if (!forecasts?.length) return console.log('No forecast data available.')

    const bulkForecastUpdates = [] //for Storing each users multiple locations alerted details into bulkForecastUpdates array
    const forecastKeySet = new Set() // Track location pairs to prevent duplicates

    for (const user of users) {
      const allUserAlerts = []

      for (const loc of user.location) {
        const userLocName = loc.location_name
        const userCoordinates = loc.coordinates

        if (!Array.isArray(userCoordinates) || userCoordinates.length !== 2) {
          console.warn(
            `Invalid coordinates for ${user.user_contact}, ${userLocName}`
          )
          continue
        }

        const nearestForecast = await findNearestLocation(
          userCoordinates,
          forecasts
        )
        if (!nearestForecast) {
          console.warn(
            `No nearest forecast for ${user.user_contact}, ${userLocName}`
          )
          continue
        }

        const todayForecast = nearestForecast.forecast
        const nearestLocName = nearestForecast.name
        const nearestCoordinates = nearestForecast.location.coordinates
        const previousForecast = await getPreviousForecast(
          userLocName,
          nearestLocName
        )

        const isRecentlyAdded =
          Date.now() - new Date(loc.time_stamp).getTime() < 24 * 60 * 60 * 1000

        const updatedForecastData = []
        const alertsToSend = []
        let shouldStoreForecast = false // flag to decide if forecast needs to be saved

        for (const dayForecast of todayForecast) {
          const prevDay = previousForecast?.forecast_data?.find(
            (d) => d.day === dayForecast.day
          )
          const alreadyNotified = prevDay?.alerted
          const isOverThreshold = dayForecast.value > AQI_THRESHOLD
          const isChanged = prevDay && prevDay.value !== dayForecast.value

          const shouldAlert = isRecentlyAdded
            ? isOverThreshold && !alreadyNotified
            : (isOverThreshold && !alreadyNotified) ||
              (isChanged && alreadyNotified)

          updatedForecastData.push({
            ...dayForecast,
            alerted: isOverThreshold,
            last_alerted_value: isOverThreshold ? dayForecast.value : null
          })

          if (shouldAlert) {
            shouldStoreForecast = true
            // move updatedForecastDate.push here - i think it would be available outside of the block for storing
            // this alertsToSend array holds each location with threshold breached values
            alertsToSend.push({
              day: dayForecast.day,
              value: dayForecast.value,
              user_location_name: userLocName,
              nearest_location_name: nearestLocName
            })
          }
        }

        if (alertsToSend.length > 0) {
          allUserAlerts.push(...alertsToSend) //here this allUserAlerts array holds each users multuple registered locations with its threshold breached values
        }

        const forecastKey = `${userLocName}::${nearestLocName}`
        if (shouldStoreForecast && !forecastKeySet.has(forecastKey)) {
          forecastKeySet.add(forecastKey)
          bulkForecastUpdates.push({
            updateOne: {
              filter: {
                user_subscribed_location: userLocName,
                nearest_location: nearestLocName
              },
              update: {
                $set: {
                  user_subscribed_coordinates: userCoordinates,
                  nearest_location_coordinates: nearestCoordinates,
                  date: new Date(),
                  forecast_data: updatedForecastData
                }
              },
              upsert: true
            }
          })
        }
      }

      // user-a has anything to be alerted
      if (allUserAlerts.length > 0) {
        // await sendEmailAlert(user, allUserAlerts)
        console.log(`Alerts for ${user.user_contact}:`, allUserAlerts)
      }
    }
    // should handle the error scenarios
    // 24hrs to show message to user in UI(should discuss when we start working on user stories)
    // can be maintain in single table (option to think)
    // other api for getting delivery status of notification, and then store in alerted Forecast table, also add flag in user tables (notifySent - Success/Failure)
    // place the logger statement to track the failure records for metrics (eg: bounced/429 status code error)

    if (bulkForecastUpdates.length > 0) {
      await storeForecastBatch(bulkForecastUpdates)
      console.log(
        `Stored ${bulkForecastUpdates.length} unique forecast updates.`
      )
    }

    console.log('Alert processing completed.')
  } catch (error) {
    console.error('Error in alert processing:', error)
  }
}

processAlerts()
