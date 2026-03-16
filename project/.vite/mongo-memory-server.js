const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

const startMongoServer = async () => {
  const mongoServer = await MongoMemoryServer.create()
  const uri = mongoServer.getUri()

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

  return mongoServer
}

const stopMongoServer = async (mongoServer) => {
  await mongoose.disconnect()
  await mongoServer.stop()
}

module.exports = { startMongoServer, stopMongoServer }
