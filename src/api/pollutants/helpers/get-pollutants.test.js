import { vi, describe, test, expect } from 'vitest'
import { getPollutants } from './get-pollutants.js'

describe('getPollutants', () => {
  test('returns all measurements from the database', async () => {
    const mockData = [{ name: 'Site A', pollutants: {} }]
    const mockToArray = vi.fn().mockResolvedValue(mockData)
    const mockFind = vi.fn().mockReturnValue({ toArray: mockToArray })
    const mockCollection = vi.fn().mockReturnValue({ find: mockFind })
    const mockDb = { collection: mockCollection }

    const result = await getPollutants(mockDb)

    expect(result).toEqual(mockData)
    expect(mockCollection).toHaveBeenCalledWith('measurements')
    expect(mockFind).toHaveBeenCalledWith({}, { projection: { _id: 0 } })
  })

  test('returns empty array when no measurements exist', async () => {
    const mockToArray = vi.fn().mockResolvedValue([])
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        find: vi.fn().mockReturnValue({ toArray: mockToArray })
      })
    }

    const result = await getPollutants(mockDb)

    expect(result).toEqual([])
  })
})
