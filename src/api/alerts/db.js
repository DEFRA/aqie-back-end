import mongoose from 'mongoose'
// import dotenv from 'dotenv'
import axios from 'axios'
import { User, AlertedForecasts } from './models/alert-schemas.js'

// dotenv.config()

const MOCK_API_URL = 'http://localhost:5000/forecasts'

export const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://localhost:27017/air_quality_db')
      console.log('MongoDB Connected')
    }
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message)
    process.exit(1)
  }
}

export async function getUsers() {
  try {
    await connectDB() // Ensure DB is connected
    return await User.find() // Fetch users
  } catch (error) {
    console.error('Error fetching users:', error.message)
    throw new Error('Failed to fetch users')
  }
}

export async function getForecasts() {
  try {
    const response = await axios.get(MOCK_API_URL)
    return response.data
  } catch (error) {
    console.error('Error fetching forecast data:', error)
    throw error // Ensure the error is propagated so it can be handled later
  }
}

export async function getPreviousForecast(userLocName, nearestLocName) {
  try {
    // Query the database for the latest forecast using Mongoose
    const alertedForecasts = await AlertedForecasts.findOne({
      user_subscribed_location: userLocName,
      nearest_location: nearestLocName
    })
      .sort({ date: -1 }) // Sort by date in descending order to get the most recent forecast
      .exec() // Execute the query

    if (!alertedForecasts) {
      console.log(
        'No Previous forecast found for location:',
        userLocName + nearestLocName
      )
      return null
    }

    return alertedForecasts
  } catch (error) {
    console.error('Error in getPreviousForecast:', error)
  }
}

//version - 1
export async function storeForecast(
  userLocName,
  userCoords,
  nearestLocName,
  nearestCoords,
  forecastData
) {
  console.log(`Storing forecast for user location: ${userLocName}`)

  try {
    const filter = { user_subscribed_location: userLocName }
    const update = {
      user_subscribed_location: userLocName,
      user_subscribed_coordinates: userCoords,
      nearest_location: nearestLocName,
      nearest_location_coordinates: nearestCoords,
      date: new Date(),
      forecast_data: forecastData
    }

    const options = { upsert: true, new: true }
    await AlertedForecasts.findOneAndUpdate(filter, update, options)
    console.log('Forecast updated successfully.')
  } catch (error) {
    console.error('Error saving forecast:', error)
  }
}

export async function storeForecastBatch(bulkOps) {
  try {
    await AlertedForecasts.bulkWrite(bulkOps, { ordered: false }) // 'ordered: false' lets Mongo continue on individual write errors
  } catch (err) {
    console.error('Bulk forecast update failed:', err)
  }
}
