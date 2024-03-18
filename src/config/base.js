/* eslint-disable prettier/prettier */
// 1.North East Scotland
const regionId = [
  { 3: 'North East Scotland' },
  { 4: 'North Wales' },
  { 5: 'Highland' },
  { 6: 'Central Scotland' },
  { 7: 'Eastern' },
  { 8: 'South-East' },
  { 9: 'South Wales' },
  { 10: 'North West & Merseyside' },
  { 11: 'South West' },
  { 12: 'East Midlands' },
  { 13: 'Scottish Borders' },
  { 14: 'North East' },
  { 15: 'Greater London' },
  { 16: 'West Midlands' },
  { 17: 'Yorkshire & Humberside' },
  { 18: 'Isle of Man' }
]

const pollutants = ['NO2', 'GE10', 'PM25', 'SO2', 'O3']
const regionRootAPI =
  'https://uk-air.defra.gov.uk/data/API/site-process-featureofinterest-by-region?group_id=4&closed=false&region_id=3'

const fetchRegion = `${regionRootAPI}region_id=${regionId}`

// https://uk-air.defra.gov.uk/data/API/site-process-featureofinterest-by-region?group_id=4&closed=false&region_id=3

const parameterId = fetchRegion.parameter_ids[0].parameter_id // it is the pollutant name use to get the feature of interest
const siteName = fetchRegion[0].site_name
const locationType = fetchRegion[0].location_type
const longitude = fetchRegion[0].longitude
const latitude = fetchRegion[0].latitude

// ---------------------------------------------------

const startTimeStamp = '2023 - 12 - 13T23:00:00.000Z'
const endTimeStamp = '2023 - 12 - 15T01:00:00.00'
const timestamp = `${startTimeStamp}/${endTimeStamp}`

// once we get fetchRegion we get feature of Interest.
let featureOfInterest =
  'http://environment.data.gov.uk/air-quality/so/GB_SamplingFeature_786698'

if (fetchRegion.parameter_ids[0].parameter_id === pollutants[[0]]) {
  featureOfInterest =
    fetchRegion.parameter_ids[0].feature_of_interest[0].featureOfInterset
}

const rootAPI =
  'https://uk-air.defra.gov.uk/sos-ukair/service?service=AQD&version=1.0.0&request=GetObservation&'

const fetchPollutant = `${rootAPI}&temporalFilter=om:phenomenonTime,${timestamp}&featureOfInterest=${featureOfInterest}`

// https://uk-air.defra.gov.uk/sos-ukair/service?service=AQD&version=1.0.0&request=GetObservation&temporalFilter=om:phenomenonTime,2023-12-13T23:00:00.000Z/2023-12-15T01:00:00.00&featureOfInterest=http://environment.data.gov.uk/air-quality/so/GB_SamplingFeature_1181
// https://uk-air.defra.gov.uk/sos-ukair/service?service=AQD&version=1.0.0&request=GetObservation&temporalFilter=om:phenomenonTime,2023-12-14T00:01:00.000Z/2023-12-14T10:00:00.00&featureOfInterest=http://environment.data.gov.uk/air-quality/so/GB_SamplingFeature_748
