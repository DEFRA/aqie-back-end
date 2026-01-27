import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  user_contact: { type: String, required: false },
  location: [
    {
      location_name: { type: String, required: true },
      coordinates: {
        type: [Number], // [latitude, longitude]
        required: true
      },
      time_stamp: { type: Date, required: true }
    }
  ],
  alertType: { type: String, enum: ['email', 'sms'], required: true }
})

userSchema.index({ user_contact: 1 }, { unique: true })

// storing it as an array of objects improves querying and makes the schema more flexible.
const alertedForecastsSchema = new mongoose.Schema(
  {
    user_subscribed_location: { type: String, required: true },
    user_subscribed_coordinates: { type: [Number], required: true },
    nearest_location: { type: String, required: true },
    nearest_location_coordinates: { type: [Number], required: true }, // Ensure coordinates are stored as an array of numbers
    date: { type: Date, required: true },
    forecast_data: [
      {
        day: { type: String, required: true },
        value: { type: Number, required: true },
        alerted: { type: Boolean, default: false },
        last_alerted_value: { type: Number, default: null }
      }
    ]
  },
  { timestamps: true }
)

alertedForecastsSchema.index(
  { user_subscribed_location: 1, nearest_location: 1 },
  { unique: true }
)

const notificationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location_name: { type: String, required: true },
  forecast_data: {
    type: Map,
    of: Number, // Example: {"Mon":3, "Tue":3, "Wed":3, "Thu":3, "Fri":3}
    required: true
  },
  notificationType: String,
  status: {
    type: String,
    enum: [
      'created',
      'sending',
      'pending',
      'sent',
      'delivered',
      'permanent-failure',
      'temporary-failure',
      'technical-failure'
    ],
    required: true
  },
  timestamp: { type: Date, default: Date.now }
})

export const User = mongoose.model('User', userSchema)
export const AlertedForecasts = mongoose.model(
  'AlertedForecasts',
  alertedForecastsSchema
)
export const NotificationLog = mongoose.model(
  'NotificationLog',
  notificationLogSchema
)

// module.exports = { User, Forecast, NotificationLog }
