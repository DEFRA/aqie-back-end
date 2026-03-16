import { setup as setupMongo, teardown as teardownMongo } from 'vitest-mongodb'
export default async function globalSetup() {
  // Setup mongo mock once for the whole test run.
  await setupMongo({
    binary: {
      version: 'latest'
    },
    serverOptions: {},
    autoStart: false
  })
  process.env.MONGO_URI = globalThis.__MONGO_URI__
  return async () => {
    await teardownMongo()
  }
}
