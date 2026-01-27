/* eslint-disable */
async function processAlerts() {
  console.log('Starting alert processing...')

  const users = await getUsers() // Fetch all users
  const forecasts = await getForecasts() // Get today's forecasts

  for (const user of users) {
    const userLoc = user.coordinates
    const locationName = user.location_name

    const nearestForecast = getNearestForecast(userLoc, forecasts) // Match by coordinates
    if (!nearestForecast) continue

    const prevForecastDoc = await Forecast.findOne({
      location_name: locationName
    }).sort({ date: -1 })

    const todayForecast = nearestForecast.forecast
    const alertsToSend = []

    todayForecast.forEach((dayForecast) => {
      const prevDay = prevForecastDoc?.forecast_data?.find(
        (d) => d.day === dayForecast.day
      )
      const alreadyNotified =
        prevDay?.alerted && prevDay.last_alerted_value === dayForecast.value

      const isOverThreshold = dayForecast.value > 6
      const isChanged = prevDay && prevDay.value !== dayForecast.value

      if ((isOverThreshold || isChanged) && !alreadyNotified) {
        alertsToSend.push({
          day: dayForecast.day,
          value: dayForecast.value,
          location_name: locationName
        })
      }
    })

    if (alertsToSend.length > 0) {
      await sendNotificationEmail(user.email, alertsToSend)

      // Update alert tracking in DB
      const updatedForecastData = todayForecast.map((d) => ({
        ...d,
        alerted: d.value > 6,
        last_alerted_value: d.value > 6 ? d.value : undefined
      }))

      await Forecast.findOneAndUpdate(
        { location_name: locationName },
        {
          $set: {
            date: new Date(),
            coordinates: nearestForecast.location.coordinates,
            forecast_data: updatedForecastData
          }
        },
        { upsert: true, new: true }
      )
    }
  }

  console.log('Alert processing completed.')
}

processAlerts()
