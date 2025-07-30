import { MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

import { config } from '../config/index.js'

const mongoPlugin = {
  name: 'mongodb',
  version: '1.0.0',
  register: async function (server) {
    const mongoOptions = {
      retryWrites: false,
      readPreference: 'secondary',
      ...(server.secureContext && { secureContext: server.secureContext })
    }

    const mongoUrl = config.get('mongoUri')
    const databaseName = config.get('mongoDatabase')

    server.logger.info('Setting up mongodb')

    const client = await MongoClient.connect(mongoUrl.toString(), mongoOptions)
    const db = client.db(databaseName)
    await createIndexes(db)

    // Add locker
    const locker = new LockManager(db.collection('mongo-locks'))

    server.logger.info(`mongodb connected to ${databaseName}`)

    server.decorate('server', 'mongoClient', client)
    server.decorate('server', 'db', db)
    server.decorate('server', 'locker', locker)
    server.decorate('request', 'db', db)
  }
}

async function createIndexes(db) {
  await db
    .collection('locks')
    .createIndex({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 }) // all locks expire after 1h, adjust as needed
  await db.collection('forecasts').createIndex({ name: 1 })
  await db.collection('forecasts').createIndex({ location: '2dsphere' })
  await db.collection('historicalForecasts').createIndex({ name: 1 })
  await db
    .collection('historicalForecasts')
    .createIndex({ location: '2dsphere' })
  await db.collection('measurements').createIndex({ name: 1 })
  await db.collection('measurements').createIndex({ location: '2dsphere' })
  await db.collection('historicalMeasurements').createIndex({ name: 1 })
  await db
    .collection('historicalMeasurements')
    .createIndex({ location: '2dsphere' })
}

export { mongoPlugin }
