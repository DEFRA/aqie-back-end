import {
  GML_FEATURE_COLLECTION,
  GML_FEATURE_MEMBER
} from './common/constants.js'

function getValueMeasured(data) {
  const value = data?.[GML_FEATURE_COLLECTION]?.[GML_FEATURE_MEMBER]?.[1]?.[
    'om:OM_Observation'
  ]?.['om:result']?.['swe:DataArray']?.['swe:values']
    .split(',')
    .pop()
  return value
}

function getTempDate(data) {
  const value =
    data?.[GML_FEATURE_COLLECTION]?.[GML_FEATURE_MEMBER]?.[1]?.[
      'om:OM_Observation'
    ]?.['om:result']?.['swe:DataArray']?.['swe:values'].split(',')
  return value
}

function getDateMeasured(data, tempDate) {
  const value = tempDate
    ? tempDate[tempDate?.length - 4]
    : data?.[GML_FEATURE_COLLECTION]?.[GML_FEATURE_MEMBER]?.[
        'aqd:AQD_ReportingHeader'
      ]?.['aqd:changeDescription']
  return value
}

export { getValueMeasured, getTempDate, getDateMeasured }
