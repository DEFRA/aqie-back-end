import { describe, test, expect } from 'vitest'
import {
  getValueMeasured,
  getTempDate,
  getDateMeasured
} from './body-parser.js'
import {
  GML_FEATURE_COLLECTION,
  GML_FEATURE_MEMBER,
  TEST_DATE
} from './common/constants.js'

function buildObservationData(values) {
  return {
    [GML_FEATURE_COLLECTION]: {
      [GML_FEATURE_MEMBER]: [
        null,
        {
          'om:OM_Observation': {
            'om:result': {
              'swe:DataArray': {
                'swe:values': values
              }
            }
          }
        }
      ]
    }
  }
}

describe('body-parser', () => {
  describe('getValueMeasured', () => {
    test('returns the last comma-separated value', () => {
      const data = buildObservationData('10.5,20.3,35.7')
      expect(getValueMeasured(data)).toBe('35.7')
    })

    test('returns single value when no commas', () => {
      const data = buildObservationData('42')
      expect(getValueMeasured(data)).toBe('42')
    })

    test('returns undefined when data is null', () => {
      expect(getValueMeasured(null)).toBeUndefined()
    })

    test('returns undefined when data structure is incomplete', () => {
      expect(getValueMeasured({})).toBeUndefined()
    })

    test('returns undefined when featureMember index 1 is missing', () => {
      const data = { [GML_FEATURE_COLLECTION]: { [GML_FEATURE_MEMBER]: [] } }
      expect(getValueMeasured(data)).toBeUndefined()
    })
  })

  describe('getTempDate', () => {
    test('returns array of values split by comma', () => {
      const data = buildObservationData('2023-01-01,val1,val2')
      expect(getTempDate(data)).toEqual([TEST_DATE, 'val1', 'val2'])
    })

    test('returns single element array when no commas', () => {
      const data = buildObservationData(TEST_DATE)
      expect(getTempDate(data)).toEqual([TEST_DATE])
    })

    test('returns undefined when data is null', () => {
      expect(getTempDate(null)).toBeUndefined()
    })

    test('returns undefined when data structure is incomplete', () => {
      expect(getTempDate({})).toBeUndefined()
    })
  })

  describe('getDateMeasured', () => {
    test('returns element at length - 4 when tempDate is provided', () => {
      const tempDate = ['a', 'b', 'c', 'd', 'e', 'f']
      // length=6, 6-4=2, index 2 = 'c'
      expect(getDateMeasured(null, tempDate)).toBe('c')
    })

    test('returns undefined when tempDate has fewer than 4 elements', () => {
      const tempDate = ['a', 'b']
      // length=2, 2-4=-2, index -2 = undefined
      expect(getDateMeasured(null, tempDate)).toBeUndefined()
    })

    test('returns changeDescription from data when tempDate is null', () => {
      const data = {
        [GML_FEATURE_COLLECTION]: {
          [GML_FEATURE_MEMBER]: {
            'aqd:AQD_ReportingHeader': {
              'aqd:changeDescription': '2023-01-15'
            }
          }
        }
      }
      expect(getDateMeasured(data, null)).toBe('2023-01-15')
    })

    test('returns undefined when tempDate is falsy and data is null', () => {
      expect(getDateMeasured(null, null)).toBeUndefined()
    })

    test('returns undefined when tempDate is an empty array', () => {
      // [] is truthy, uses tempDate path: [][0-4] = [][-4] = undefined
      expect(getDateMeasured(null, [])).toBeUndefined()
    })

    test('returns undefined when data has no changeDescription', () => {
      expect(getDateMeasured({}, null)).toBeUndefined()
    })
  })
})
