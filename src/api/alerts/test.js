/**
 * user with multiple locations - user schemas
 * {
  "email": "user@example.com",
  "locations": [
    {
      "name": "Southampton",
      "coordinates": [50.9503, -1.3567]
    },
    ...
  ]
}
 */

import { getForecasts } from './fetch-forecast-api.js'
import { getRegisteredUsers } from './get-users.js'
import { getNearestForecast } from './getNearestLocation.js'
import { storeForecast, getPreviousForecast } from './db.js'
import { sendNotification } from './notify.js'

export async function processAlerts() {
  console.log('Running alert processing...')

  const users = await getRegisteredUsers()
  const forecasts = await getForecasts()

  for (const user of users) {
    const alerts = []

    for (const userLoc of user.locations) {
      const nearestForecast = getNearestForecast(userLoc.coordinates, forecasts)
      if (!nearestForecast) continue

      const todayForecast = nearestForecast.forecast
      const locationName = nearestForecast.name
      const coordinates = nearestForecast.location.coordinates

      const previous = await getPreviousForecast(locationName)
      const previousData = previous?.forecast_data || []

      const alertDays = []

      for (const today of todayForecast) {
        const prev = previousData.find((d) => d.day === today.day)

        const shouldAlert =
          today.value > 6 ||
          (prev && prev.alerted && today.value !== prev.last_alerted_value) ||
          (!prev && today.value > 6)

        if (shouldAlert) {
          alertDays.push({
            day: today.day,
            value: today.value
          })
        }
      }

      if (alertDays.length > 0) {
        alerts.push({
          location: locationName,
          coordinates,
          days: alertDays
        })
      }

      // Store latest forecast with alert metadata
      const forecastWithMeta = todayForecast.map((day) => {
        const existing = previousData.find((d) => d.day === day.day)
        const alertedDay = alertDays.find((d) => d.day === day.day)
        return {
          day: day.day,
          value: day.value,
          alerted: !!alertedDay,
          last_alerted_value: alertedDay
            ? day.value
            : existing?.last_alerted_value || null
        }
      })

      await storeForecast(locationName, coordinates, forecastWithMeta)
    }

    if (alerts.length > 0) {
      await sendNotification(user, alerts)
    }
  }

  console.log('Alert processing completed.')
}
