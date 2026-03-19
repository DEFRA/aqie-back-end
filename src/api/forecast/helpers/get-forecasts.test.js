import { vi, describe, test, expect } from 'vitest'
import { getForecasts } from './get-forecasts.js'

describe('getForecasts', () => {
  test('returns all forecasts from the database', async () => {
    const mockData = [{ name: 'Test Site', forecast: [] }]
    const mockToArray = vi.fn().mockResolvedValue(mockData)
    const mockFind = vi.fn().mockReturnValue({ toArray: mockToArray })
    const mockCollection = vi.fn().mockReturnValue({ find: mockFind })
    const mockDb = { collection: mockCollection }

    const result = await getForecasts(mockDb)

    expect(result).toEqual(mockData)
    expect(mockCollection).toHaveBeenCalledWith('forecasts')
    expect(mockFind).toHaveBeenCalledWith({}, { projection: { _id: 0 } })
  })

  test('returns empty array when no forecasts exist', async () => {
    const mockToArray = vi.fn().mockResolvedValue([])
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({ toArray: mockToArray })
      })
    }

    const result = await getForecasts(mockDb)

    expect(result).toEqual([])
  })
})
