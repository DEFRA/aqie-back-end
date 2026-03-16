import { afterAll, beforeAll } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMock = createFetchMock(vi)
// Keep test timezone deterministic across platforms.
process.env.TZ = 'UTC'
beforeAll(async () => {
  // Setup fetch mock
  fetchMock.enableMocks()
  global.fetch = fetchMock
  global.fetchMock = fetchMock
})

afterAll(async () => {
  fetchMock.disableMocks()
})
