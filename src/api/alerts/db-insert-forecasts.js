import mongoose from 'mongoose'
import { connectDB } from './db.js'
import { AlertedForecasts } from './models/alert-schemas.js'

const alertForecasts = async () => {
  await connectDB()

  const forecasts = [
    {
      user_subscribed_location: 'GORING',
      user_subscribed_coordinates: [51.5221, -1.1349],
      nearest_location: 'STREATLEY YOUTH HOSTEL',
      nearest_location_coordinates: [51.5184, -1.1522],
      date: '2025-04-01',
      forecast_data: [
        { day: 'Tue', value: 3, alerted: false, last_alerted_value: null },
        { day: 'Wed', value: 3, alerted: false, last_alerted_value: null },
        { day: 'Thu', value: 3, alerted: false, last_alerted_value: null },
        { day: 'Fri', value: 4, alerted: false, last_alerted_value: null },
        { day: 'Sat', value: 3, alerted: false, last_alerted_value: null }
      ]
    }
  ]

  try {
    await AlertedForecasts.insertMany(forecasts)
    console.log('Forecasts inserted!')
  } catch (error) {
    console.error('Error inserting forecasts:', error)
  } finally {
    mongoose.connection.close()
  }
}

alertForecasts()
