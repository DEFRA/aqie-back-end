/* eslint-disable prettier/prettier */
import mongoose from 'mongoose'

const Pollutant = mongoose.Schema({
  name: String,
  area: String,
  areaType: String,
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
  pollutants: []
})

export default mongoose.model('Pollutant', new Pollutant())
