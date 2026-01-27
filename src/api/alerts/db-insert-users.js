import mongoose from 'mongoose'
import { connectDB } from './db.js'
import { User } from './models/alert-schemas.js'

const createUsers = async () => {
  await connectDB()

  const users = [
    {
      user_contact: 'saranya.vinayagam@cognizant.com',
      location: [
        {
          location_name: 'GORING',
          coordinates: [51.5221, -1.1349],
          time_stamp: '2025-04-07'
        },
        {
          location_name: 'Little London',
          coordinates: [51.0233, -1.9664],
          time_stamp: '2025-04-07'
        },
        {
          location_name: 'Staines-upon-thames',
          coordinates: [51.4333, -0.5102],
          time_stamp: '2025-04-07'
        }
      ],
      alertType: 'email'
    },
    {
      user_contact: 'Jayamurugan.Parasuraman@cognizant.com',
      location: [
        {
          location_name: 'GORING',
          coordinates: [51.5221, -1.1349],
          time_stamp: '2025-04-07'
        },
        {
          location_name: 'Millbrook',
          coordinates: [50.9234, -1.4531],
          time_stamp: '2025-04-07'
        },
        {
          location_name: 'Egham Hythe',
          coordinates: [51.4275, -0.5219],
          time_stamp: '2025-04-07'
        }
      ],
      alertType: 'email'
    }
    // {
    //   email: null,
    //   phoneNumber: '+447469296586',
    //   location_name: 'LONDON CITY AIRPORT',
    //   coordinates: [51.5048, 0.058],
    //   alertType: 'sms'
    // }
  ]
  try {
    await User.insertMany(users)
    console.log('Users inserted!')
  } catch (error) {
    console.error('Error inserting users:', error)
  } finally {
    mongoose.connection.close()
  }
}

createUsers()
