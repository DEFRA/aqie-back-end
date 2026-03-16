const { MongoClient } = require('mongodb')

let client
let db

const connectToDatabase = async () => {
  try {
    client = await MongoClient.connect('mongodb://localhost:27017', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    db = client.db('test')
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    throw error
  }
}

const closeDatabaseConnection = async () => {
  if (client) {
    await client.close()
  }
}

beforeAll(async () => {
  await connectToDatabase()
})

afterAll(async () => {
  await closeDatabaseConnection()
})

test('hello world!', async () => {
  const result = await db
    .collection('testCollection')
    .insertOne({ message: 'Hello, World!' })
  expect(result.insertedCount).toBe(1)
})
