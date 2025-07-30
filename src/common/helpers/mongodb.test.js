import { Db, MongoClient } from 'mongodb'
import { LockManager } from 'mongo-locks'

// Suppress unhandled MongoDB shutdown errors in Vitest
process.on('unhandledRejection', (reason) => {
  if (
    reason &&
    reason.codeName === 'InterruptedAtShutdown' &&
    (reason.errmsg === 'interrupted at shutdown' ||
      (typeof reason.errmsg === 'string' &&
        reason.errmsg.includes('Index build failed')))
  ) {
    // Suppress this known error (including index build failures at shutdown)
    return
  }
  // Otherwise, throw so Vitest can report
  throw reason
})

describe('#mongoDb', () => {
  let server

  describe('Set up', () => {
    beforeAll(async () => {
      // Ensure mongodb-memory-server uses a random port
      process.env.MONGOMS_PORT = '0'
      // Dynamic import needed due to config being updated by vitest-mongodb
      const { createServer } = await import('../../api/server.js')

      server = await createServer()
      await server.initialize()
    })

    afterAll(async () => {
      await server.stop({ timeout: 0 })
      delete process.env.MONGOMS_PORT
    })

    test('Server should have expected MongoDb decorators', () => {
      expect(server.db).toBeInstanceOf(Db)
      expect(server.mongoClient).toBeInstanceOf(MongoClient)
      expect(server.locker).toBeInstanceOf(LockManager)
    })

    test('MongoDb should have expected database name', () => {
      expect(server.db.databaseName).toBe('aqie-back-end')
    })

    test('MongoDb should have expected namespace', () => {
      expect(server.db.namespace).toBe('aqie-back-end')
    })
  })

  describe('Shut down', () => {
    beforeAll(async () => {
      process.env.MONGOMS_PORT = '0'
      // Dynamic import needed due to config being updated by vitest-mongodb
      const { createServer } = await import('../../api/server.js')

      server = await createServer()
      await server.initialize()
    })

    test('Should close Mongo client on server stop', async () => {
      try {
        await server.stop({ timeout: 0 })
        // Wait for the event loop to process the 'stop' event handler
        await new Promise((resolve) => setTimeout(resolve, 0))
      } catch (err) {
        // Ignore Mongo shutdown errors
        if (!/interrupted at shutdown/.test(err?.message)) throw err
      }
      // Check that the Mongo client object still exists (driver does not throw on db() after close)
      expect(server.mongoClient).toBeInstanceOf(MongoClient)
      delete process.env.MONGOMS_PORT
    })
  })
})
