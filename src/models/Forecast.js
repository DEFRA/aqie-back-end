/* eslint-disable prettier/prettier */
import mongoose from 'mongoose'

const Forecast = mongoose.Schema({
  name: String,
  updated: Date,
  location: {
    type: String,
    coordinates: [
      {
        lat: Number,
        lon: Number
      }
    ]
  },
  forecasts: [
    {
      day: String,
      value: Number
    }
  ]
})

export default mongoose.model('Forecast', new Forecast())
