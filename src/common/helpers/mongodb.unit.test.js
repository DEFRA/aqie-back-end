import { vi, describe, test, expect, beforeEach } from 'vitest'

import { mongoDb } from './mongodb.js'
import { LockManager } from 'mongo-locks'

const mockClose = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockCreateIndex = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockConnect = vi.hoisted(() => vi.fn())

vi.mock('mongodb', () => ({
  MongoClient: { connect: mockConnect }
}))
vi.mock('mongo-locks', () => ({
  LockManager: vi.fn().mockImplementation(() => ({}))
}))

const makeDb = () => ({
  collection: vi.fn().mockReturnValue({ createIndex: mockCreateIndex })
})

describe('mongoDb plugin (unit)', () => {
  let mockServer
  let stopHandler

  beforeEach(() => {
    vi.clearAllMocks()
    stopHandler = null
    mockServer = {
      logger: { info: vi.fn() },
      secureContext: null,
      decorate: vi.fn(),
      events: {
        on: vi.fn().mockImplementation((event, fn) => {
          if (event === 'stop') stopHandler = fn
        })
      }
    }
    const mockDb = makeDb()
    mockConnect.mockResolvedValue({
      db: vi.fn().mockReturnValue(mockDb),
      close: mockClose
    })
  })

  test('plugin has correct name and version', () => {
    expect(mongoDb.plugin.name).toBe('mongodb')
    expect(mongoDb.plugin.version).toBe('1.0.0')
  })

  test('connects to MongoDB with the provided URL and options', async () => {
    const options = {
      mongoUrl: 'mongodb://localhost:27017',
      databaseName: 'testdb',
      mongoOptions: { ssl: false }
    }

    await mongoDb.plugin.register(mockServer, options)

    expect(mockConnect).toHaveBeenCalledWith(
      'mongodb://localhost:27017',
      expect.objectContaining({ ssl: false })
    )
  })

  test('decorates server with mongoClient, db, locker, and request db/locker', async () => {
    const options = {
      mongoUrl: 'mongodb://localhost:27017',
      databaseName: 'testdb',
      mongoOptions: {}
    }

    await mongoDb.plugin.register(mockServer, options)

    expect(mockServer.decorate).toHaveBeenCalledWith(
      'server',
      'mongoClient',
      expect.any(Object)
    )
    expect(mockServer.decorate).toHaveBeenCalledWith(
      'server',
      'db',
      expect.any(Object)
    )
    expect(mockServer.decorate).toHaveBeenCalledWith(
      'server',
      'locker',
      expect.any(Object)
    )
    expect(mockServer.decorate).toHaveBeenCalledWith(
      'request',
      'db',
      expect.any(Function),
      { apply: true }
    )
    expect(mockServer.decorate).toHaveBeenCalledWith(
      'request',
      'locker',
      expect.any(Function),
      { apply: true }
    )
  })

  test('creates a LockManager with the mongo-locks collection', async () => {
    const options = {
      mongoUrl: 'mongodb://localhost:27017',
      databaseName: 'testdb',
      mongoOptions: {}
    }

    await mongoDb.plugin.register(mockServer, options)

    expect(LockManager).toHaveBeenCalled()
  })

  test('creates indexes on mongo-locks and example-data collections', async () => {
    const options = {
      mongoUrl: 'mongodb://localhost:27017',
      databaseName: 'testdb',
      mongoOptions: {}
    }

    await mongoDb.plugin.register(mockServer, options)

    expect(mockCreateIndex).toHaveBeenCalledTimes(2)
    expect(mockCreateIndex).toHaveBeenCalledWith({ id: 1 })
  })

  test('registers a stop event handler that closes the MongoDB client', async () => {
    const options = {
      mongoUrl: 'mongodb://localhost:27017',
      databaseName: 'testdb',
      mongoOptions: {}
    }

    await mongoDb.plugin.register(mockServer, options)
    expect(stopHandler).toBeDefined()

    await stopHandler()

    expect(mockClose).toHaveBeenCalledWith(true)
  })

  test('passes secureContext when server has it configured', async () => {
    mockServer.secureContext = { context: {} }
    const options = {
      mongoUrl: 'mongodb://localhost:27017',
      databaseName: 'testdb',
      mongoOptions: {}
    }

    await mongoDb.plugin.register(mockServer, options)

    expect(mockConnect).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ secureContext: mockServer.secureContext })
    )
  })
})
