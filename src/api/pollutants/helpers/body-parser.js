function getValueMeasured(data) {
  const value = data?.['gml:FeatureCollection']?.['gml:featureMember']?.[1]?.[
    'om:OM_Observation'
  ]?.['om:result']?.['swe:DataArray']?.['swe:values']
    .split(',')
    .pop()
  return value
}

function getTempDate(data) {
  const value =
    data?.['gml:FeatureCollection']?.['gml:featureMember']?.[1]?.[
      'om:OM_Observation'
    ]?.['om:result']?.['swe:DataArray']?.['swe:values'].split(',')
  return value
}

function getDateMeasured(data, tempDate) {
  const value = tempDate
    ? tempDate[tempDate?.length - 4]
    : data?.['gml:FeatureCollection']?.['gml:featureMember']?.[
        'aqd:AQD_ReportingHeader'
      ]?.['aqd:changeDescription']
  return value
}

export { getValueMeasured, getTempDate, getDateMeasured }
