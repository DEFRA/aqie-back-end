const GML_FEATURE_COLLECTION = 'gml:FeatureCollection'
const GML_FEATURE_MEMBER = 'gml:featureMember'
const OWS_EXCEPTION_REPORT = 'ows:ExceptionReport'
const MAX_LISTENERS = 500
const DAYS_BACK = -2
const NEAR_ONE_THRESHOLD = 0.98999
const SITE_ALPHA = 'Site Alpha'
const SITE_ALPHA_LAT = 51.5
const SITE_ALPHA_LON = -0.1
const HTTP_PROXY_URL = 'http://localhost:3128'
const HTTPS_PROXY_TEST_URL = 'http://localhost:8080'
const HTTP_PORT = 80
const HTTPS_PORT = 443
const TEST_API_URL = 'http://example.com/api'
const MONGO_START_TIMEOUT = 30000
const TEN_SECONDS = 10 * 1000
const POLLUTANT_FETCH_OPTIONS = { headers: { 'Cache-Control': 'no-cache' } }
const POLLUTANT_MAP = {
  NO2: 'Nitrogen dioxide',
  PM10: 'PM10',
  PM25: 'PM2.5',
  O3: 'Ozone',
  SO2: 'Sulphur dioxide'
}
const POLLUTANT_REGIONS = [
  { name: 'North East Scotland', id: 3, split: 12 },
  { name: 'North Wales', id: 4, split: 2 },
  { name: 'Highland', id: 5, split: 4 },
  { name: 'Central Scotland', id: 6, split: 12 },
  { name: 'Eastern', id: 7, split: 12 },
  { name: 'South East', id: 8, split: 19 },
  { name: 'South Wales', id: 9, split: 9 },
  { name: 'NorthWest And Merseyside', id: 10, split: 19 },
  { name: 'South West', id: 11, split: 14 },
  { name: 'East Midlands', id: 12, split: 14 },
  { name: 'Scottish Borders', id: 13, split: 3 },
  { name: 'North East', id: 14, split: 9 },
  { name: 'Greater London', id: 15, split: 16 },
  { name: 'West Midlands', id: 16, split: 15 },
  { name: 'Yorkshire And Humberside', id: 17, split: 16 },
  { name: 'Isle of Man', id: 18, split: 7 }
]
const SFTP_TEST_FILENAME = 'forecast.xml'
const SFTP_TEST_FILE_CONTENT = '<xml>forecast data</xml>'
const TEST_DATE = '2023-01-01'
const HTTP_OK = 200
const HTTP_NOT_FOUND = 404
const HTTP_INTERNAL_SERVER_ERROR = 500
const PROXY_PORT = 3128
const HOURS_IN_DAY = 12
const SECONDS_PER_HOUR = 3600
const MINUTES_PER_HOUR = 60
const INVALID_POLLUTANT_LARGE = -9999
const INVALID_POLLUTANT_SMALL = -99
const MOCK_PROBABILITY = 0.9

export {
  GML_FEATURE_COLLECTION,
  GML_FEATURE_MEMBER,
  OWS_EXCEPTION_REPORT,
  MAX_LISTENERS,
  DAYS_BACK,
  NEAR_ONE_THRESHOLD,
  SITE_ALPHA,
  SITE_ALPHA_LAT,
  SITE_ALPHA_LON,
  HTTP_PROXY_URL,
  HTTPS_PROXY_TEST_URL,
  HTTP_PORT,
  HTTPS_PORT,
  TEST_API_URL,
  MONGO_START_TIMEOUT,
  TEN_SECONDS,
  POLLUTANT_FETCH_OPTIONS,
  POLLUTANT_MAP,
  POLLUTANT_REGIONS,
  SFTP_TEST_FILENAME,
  SFTP_TEST_FILE_CONTENT,
  TEST_DATE,
  HTTP_OK,
  HTTP_NOT_FOUND,
  HTTP_INTERNAL_SERVER_ERROR,
  PROXY_PORT,
  HOURS_IN_DAY,
  SECONDS_PER_HOUR,
  MINUTES_PER_HOUR,
  INVALID_POLLUTANT_LARGE,
  INVALID_POLLUTANT_SMALL,
  MOCK_PROBABILITY
}
