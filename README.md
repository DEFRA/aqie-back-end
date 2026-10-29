# aqie-back-end

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
  - [Docker](#docker)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Environment variables](#environment-variables)
  - [Development](#development)
    - [Docker Compose](#docker-compose)
    - [npm](#npm)
  - [Production](#production)
    - [Docker Compose](#docker-compose-1)
    - [npm](#npm-1)
  - [Npm scripts](#npm-scripts)
- [API endpoints](#api-endpoints)
- [Calling API endpoints](#calling-api-endpoints)
  - [curl](#curl)
  - [Postman](#postman)
- [Monitoring station history](#monitoring-station-history)
  - [Query parameters](#query-parameters)
  - [Response](#response)
  - [Error responses](#error-responses)
  - [Upstream quirks handled by this endpoint](#upstream-quirks-handled-by-this-endpoint)
- [Verifying AURN data accuracy](#verifying-aurn-data-accuracy)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v9`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd aqie-back-end
nvm use
```

### Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose). Docker is the recommended way to run the service locally as it starts MongoDB and Redis automatically alongside the app.

## Local development

### Setup

Copy the environment variable template and fill in the required values:

```bash
cp .env.example .env
```

Install application dependencies:

```bash
npm install --ignorescripts
```

### Environment variables

This project uses [convict](https://github.com/mozilla/node-convict) for configuration.

- **Via Docker Compose:** the `.env` file is loaded automatically via the `env_file` directive in `compose.yml` — no extra steps needed.
- **Via npm (without Docker):** the `.env` file is _not_ loaded automatically. Variables must be exported in your shell before starting the app, e.g. `export $(cat .env | xargs)`, or set individually.

| Variable                          | Required | Description                                                                                           |
| :-------------------------------- | :------: | :---------------------------------------------------------------------------------------------------- |
| `RICARDO_API_EMAIL`               |    ✅    | Email for Ricardo API OAuth login (needed by `/monitoringStationInfo`)                                |
| `RICARDO_API_PASSWORD`            |    ✅    | Password for Ricardo API OAuth login (needed by `/monitoringStationInfo`)                             |
| `SSH_PRIVATE_KEY`                 |    ✅    | SSH private key for Met Office SFTP access (needed by `/sftp/*`)                                      |
| `HTTP_PROXY`                      |          | HTTP proxy URL                                                                                        |
| `HTTPS_PROXY`                     |          | HTTPS proxy URL                                                                                       |
| `SQUID_USERNAME`                  |          | Squid proxy username                                                                                  |
| `SQUID_PASSWORD`                  |          | Squid proxy password                                                                                  |
| `ACCESS_CONTROL_ALLOW_ORIGIN_URL` |          | Allowed CORS origin URL                                                                               |
| `FORECAST_SCHEDULE`               |          | Cron expression for forecast data polling (default: `0 05-10 * * *` — hourly 5–10am)                  |
| `POLLUTANTS_SCHEDULE`             |          | Cron expression for pollutant data polling (default: `0 */1 * * *` — every hour)                      |
| `MONITORING_STATIONS_SCHEDULE`    |          | Cron expression for monitoring station cache refresh (default: `0 */6 * * *` — every 6 hours)         |
| `AURN_SCHEDULE`                   |          | Cron expression for AURN measurements + DAQI calculation (default: `*/30 * * * *` — every 30 minutes) |

All other configuration values have sensible defaults — see [src/config/index.js](src/config/index.js) for the full list.

### Development

#### Docker Compose

The recommended way to run the project locally. Starts MongoDB, Redis and the app together, with hot-reloading enabled. Requires a `.env` file at the project root (see [Setup](#setup) and [Environment variables](#environment-variables)):

```bash
docker compose up --build
```

This uses the `development` target from the Dockerfile, which installs all dependencies (including devDependencies) and runs the app via `npm run docker:dev` (an alias for nodemon with inspect enabled).

#### npm

> **Note:** requires MongoDB running on `mongodb://localhost:27017/` and Redis on `localhost:6379`. You can start them with `docker compose up mongodb redis` if needed.

```bash
npm run dev
```

### Production

#### Docker Compose

To run the application in production mode using Docker Compose, override the build target:

```bash
docker compose build --build-arg target=production
docker compose up
```

Or build and run the production image directly without Compose:

```bash
docker build --target production -t aqie-back-end .
docker run -p 3000:3000 --env-file .env aqie-back-end
```

This uses the `production` target from the Dockerfile, which omits devDependencies and runs `node src` directly.

#### npm

> **Note:** requires MongoDB running on `mongodb://localhost:27017/` and Redis on `localhost:6379`.

```bash
npm start
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json)
To view them in your command line run:

```bash
npm run
```

## API endpoints

| Endpoint                         | Description                                                                                                                                      |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET: /health`                   | Health check                                                                                                                                     |
| `GET: /monitoringStations`       | Returns cached monitoring station metadata from MongoDB (populated on startup, refreshed every 6 hours). Zero Ricardo API calls on each request. |
| `GET: /monitoringStationInfo`    | Returns monitoring station data via Ricardo API (requires credentials)                                                                           |
| `GET: /monitoringStationHistory` | Returns an hourly pollutant time series for a single station over the last 24 hours or 7 days via the Ricardo API (requires credentials)         |
| `GET: /aurnData`                 | Returns per-station observed DAQI index calculated from latest AURN measurements (refreshed every 30 minutes by a background scheduler)          |
| `GET: /sftp/files`               | Lists files available on the Met Office SFTP server (requires SSH key)                                                                           |
| `GET: /sftp/file/{filename}`     | Downloads a specific file from the Met Office SFTP server (requires SSH key)                                                                     |

## Calling API endpoints

> The default port is `3001` when running via Docker Compose, or `3000` when running via npm directly.

### curl

```bash
# Health check
curl http://localhost:3001/health

# Monitoring stations — reads from MongoDB cache, populated on startup and refreshed every 6 hours
# Returns immediately with no Ricardo API calls
curl http://localhost:3001/monitoringStations

# AURN data — per-station observed DAQI index, refreshed every 30 minutes
# To populate immediately, set AURN_SCHEDULE=* * * * * in your .env and restart the service.
# Remember to revert it afterwards.
curl http://localhost:3001/aurnData

# Monitoring station info via Ricardo API (requires RICARDO_API_EMAIL + RICARDO_API_PASSWORD in .env)
curl http://localhost:3001/monitoringStationInfo

# Hourly pollutant history for one station (requires RICARDO_API_EMAIL + RICARDO_API_PASSWORD in .env)
curl "http://localhost:3001/monitoringStationHistory?siteId=UKA00315&period=7d"

# List files on Met Office SFTP (requires SSH_PRIVATE_KEY in .env)
curl http://localhost:3001/sftp/files

# Download a specific file from SFTP
curl http://localhost:3001/sftp/file/<filename>
```

## Monitoring station history

`GET /monitoringStationHistory` returns an hourly time series per pollutant for
a single monitoring station. `/monitoringStationInfo` cannot be used for this:
it reduces each series down to the single newest reading.

### Query parameters

| Param    | Required | Values                            | Default | Notes                              |
| :------- | :------- | :-------------------------------- | :------ | :--------------------------------- |
| `siteId` | yes      | Ricardo `siteId`, e.g. `UKA00315` | —       | Not the `localSiteId` form (`MY1`) |
| `period` | no       | `24h`, `7d`                       | `24h`   | Anything else returns `400`        |

### Response

```json
{
  "siteId": "UKA00315",
  "period": "7d",
  "resolution": "hourly",
  "timeBasis": "end",
  "from": "2026-09-23T01:00:00.000Z",
  "to": "2026-09-30T00:00:00.000Z",
  "truncated": false,
  "pollutants": {
    "NO2": [{ "time": "2026-09-23T01:00:00.000Z", "value": 32.1 }],
    "PM25": [{ "time": "2026-09-23T01:00:00.000Z", "value": null }]
  },
  "fifteenMinute": {
    "SO2": [{ "time": "2026-09-23T00:15:00.000Z", "value": 2.39481 }]
  },
  "summary": {
    "daqiIndex": 2,
    "measuredAt": "2026-09-30T00:00:00.000Z",
    "pollutants": {
      "PM25": {
        "periodAverage": 10.4625,
        "dataCapture": {
          "validHours": 160,
          "expectedHours": 168,
          "capturePercentage": 95,
          "isLowDataCapture": false
        },
        "hourlyExceedances": null,
        "dailyExceedances": null,
        "dailyMeans": [{ "time": "2026-09-24T00:00:00.000Z", "value": 9.8 }],
        "daqi": {
          "concentration": 10.4,
          "index": 1,
          "measuredAt": "2026-09-30T00:00:00.000Z",
          "averagingPeriod": "24-hour mean"
        }
      }
    }
  }
}
```

- Pollutant keys are `PM25`, `PM10`, `NO2`, `O3` and `SO2`.
- Every `time` is the **end** of its averaging period (`timeBasis: "end"`): the
  reading for 09:00–10:00 is stamped `10:00`.
- `value: null` means the instrument produced no reading for that hour. The
  point is kept so data capture can be counted against it.
- `from` / `to` bound the window, and both are `null` when the station returned
  no readings at all. They are the first and last hour stamps of the window:
  - `24h`: the 24 hours ending at the station's **newest reading**, so a station
    that has stopped publishing shows a gap instead of a window of empty hours.
  - `7d`: **seven complete UTC days** ending at the most recent midnight at or
    before the newest reading. The unfinished current day is not included, so
    `from` is `01:00` on the first day and `to` is `00:00` after the last. Every
    daily mean is a real calendar day made of hours inside the window, and the
    168 hours counted for data capture are exactly the hours behind the seven
    daily means.
- `fifteenMinute.SO2` holds SO₂'s 15-minute means from 45 minutes before `from`
  (so the first hour has all four quarters). `pollutants.SO2` is the hourly mean
  derived from these (at least 3 valid of 4); the feed's own hourly SO₂ rows are
  used only when there are no 15-minute rows.
- `truncated: true` means at least one pollutant hit the upstream 10,000 row
  cap, so its series is incomplete. The cap cannot be paginated past.
- Expect roughly 24 points per pollutant for `24h` and 168 for `7d`.
- Responses are cached in memory for 15 minutes per `siteId` + `period`.

### Data capture and averaging rules

All averages, capture figures and DAQI values come from
`src/common/helpers/averaging.js`, which the map DAQI (`/aurnData`) also uses.
Consumers should display these values and not recalculate them.

- A mean is only calculated with at least 75% data capture, otherwise it is
  `null` (never a partial-window estimate):
  hourly mean 3 of 4 fifteen-minute means; 8-hour mean 6 of 8 hourly means;
  daily (and 24-hour) mean 18 of 24 hourly means. `summary...periodAverage`
  also needs 75% of the window's hours to be valid (126 of 168 for `7d`).
- `periodAverage` is the **7-day average** for `period=7d`, the mean of the seven
  valid daily means (a day with fewer than 18 valid hours is left out), and the
  **24-hour average** for `period=24h`, the mean of the window's valid hourly means.
- `dataCapture.isLowDataCapture` is true exactly when `periodAverage` is
  withheld, so a consumer can show the "Low data capture" tag and a `-` average
  from one flag instead of repeating the 75% rule.
- Missing hours count as invalid, not as a shorter window.
- Values are never rounded in the response, and intermediate means stay
  unrounded. Rounding happens once, immediately before a DAQI band or
  legal-limit comparison; display rounding is for the consumer to do.
- DAQI concentrations: NO₂ 1-hour mean, PM2.5/PM10 24-hour mean, O₃ 8-hour mean
  and SO₂ latest 15-minute mean. SO₂ has no DAQI value when no 15-minute data
  is available.
- `daqi` is evaluated at each pollutant's newest valid reading, and
  `measuredAt` says when that was.

### Example requests

These assume the service is running locally (see [Calling API endpoints](#calling-api-endpoints))
and use [`jq`](https://jqlang.org/) to pick out parts of the response. Replace
`UKA00315` with any Ricardo `siteId`.

```bash
BASE="http://localhost:3001/monitoringStationHistory?siteId=UKA00315"

# Everything the endpoint returns, top level only
curl -s "$BASE&period=24h" | jq 'keys'
# ["fifteenMinute","from","period","pollutants","resolution",
#  "siteId","summary","timeBasis","to","truncated"]

# The window. For 7d this is seven complete UTC days: `from` is 01:00 on the first
# day and `to` is midnight at the end of the last (hour-ending stamps).
curl -s "$BASE&period=7d" | jq '{from, to, hours: (.pollutants.NO2 | length)}'

# 7-day average and data capture per pollutant. `periodAverage` (the mean of the valid
# daily means) is null when fewer than 75% of the window's hours (126 of 168) are
# valid; `dataCapture` is still reported.
curl -s "$BASE&period=7d" | jq '.summary.pollutants | map_values({periodAverage, dataCapture})'

# Only the pollutants flagged "Low data capture" (average withheld)
curl -s "$BASE&period=7d" | jq '.summary.pollutants
  | to_entries[]
  | select(.value.dataCapture.isLowDataCapture and .value.dataCapture.validHours > 0)
  | {pollutant: .key, dataCapture: .value.dataCapture}'

# The DAQI concentration, index and averaging period for each pollutant, plus the
# overall index. Concentrations are unrounded; the index is banded on the rounded value.
curl -s "$BASE&period=24h" | jq '{
  daqiIndex: .summary.daqiIndex,
  measuredAt: .summary.measuredAt,
  pollutants: (.summary.pollutants | map_values(.daqi | {concentration, index, averagingPeriod}))
}'

# SO2 15-minute means: 96 points for 24h, starting 45 minutes before `from` so the
# first hour has all four quarters
curl -s "$BASE&period=24h" | jq '{from, fifteenMinute: (.fifteenMinute.SO2 | {count: length, first: .[0], last: .[-1]})}'

# Daily means (one per UTC day, stamped at the end of the day) and the number of
# days over the PM10 daily limit. A day with fewer than 18 valid hours is null.
curl -s "$BASE&period=7d" | jq '.summary.pollutants.PM10 | {dailyExceedances, dailyMeans: [.dailyMeans[] | {time, value}]}'

# Hours with no valid reading stay in the series as null values
curl -s "$BASE&period=7d" | jq '[.pollutants.NO2[] | select(.value == null)] | length'
```

Hours missing from the series (for example the upstream clock-change rows described
under [Upstream quirks](#upstream-quirks-handled-by-this-endpoint)) show up as a
`validHours` count below `expectedHours` in `dataCapture`.

### Error responses

| Status | When                                                  |
| :----- | :---------------------------------------------------- |
| `400`  | Missing or malformed `siteId`, or an unknown `period` |
| `502`  | Ricardo unreachable, or returned a non-2xx            |

Upstream failure is never reported as `200` with an empty series — "no data"
and "the call failed" are deliberately distinguishable.

### Upstream quirks handled by this endpoint

These all fail silently upstream, returning `200` with plausible but wrong data:

- Dates are sent as `start-date` / `end-date` (`YYYY-MM-DD`). The
  `start-date-time` / `end-date-time` forms used elsewhere in this repo are not
  in the Ricardo OpenAPI spec and are ignored, degrading the request to the
  `latest-measurement` default.
- PM10 and PM2.5 are requested as `GE10` and `PM25`; their display names are
  rejected with `422`.
- Rows are attributed to the pollutant code that was requested, because
  returned names are HTML-encoded, e.g. `PM<sub>10</sub> particulate matter`.
- SO2 mixes 15-minute and hourly rows and `data-type` cannot separate them, so
  rows are filtered on their own interval (`endDateTime - startDateTime`).
- `-9999` and `-99` are no-reading sentinels, not values; averaging them
  produces figures around −400 µg/m³. Any negative value becomes `null`.
- At the autumn BST→GMT clock change, rows can start at `+01:00` and end at
  `+00:00`, giving a 2-hour "hourly" row (or a 75-minute "15-minute" row). These
  are not usable means, so they are treated as missing data and lower capture. A
  warning naming the station, pollutant and example rows is logged once per
  pollutant per request (search the logs for "not 60 or 15 minutes long").
- Because the API takes whole dates, a one-day request returns ~33 hours. The
  series is trimmed to the exact requested window.

## Verifying AURN data accuracy

The `/aurnData` endpoint returns a DAQI index (1–10) per station calculated from observed measurements fetched from the Ricardo API. To verify the data is correct for a given station:

### Step 1 — Find the station's localSiteID

```bash
# Find the localSiteID for a station by name (e.g. London Bloomsbury)
curl -s http://localhost:3001/monitoringStations | python3 -c \
  'import sys,json; d=json.load(sys.stdin); s=next((s for s in d["stations"] if "Bloomsbury" in (s.get("name") or "")),None); print(s["localSiteID"], s["name"])'
```

### Step 2 — Check the DAQI value our endpoint calculated

```bash
# Check the daqiIndex stored for that station (replace UKA00651 with the localSiteID from Step 1)
curl -s http://localhost:3001/aurnData | python3 -c \
  'import sys,json; d=json.load(sys.stdin); m=next((m for m in d["measurements"] if m["localSiteID"]=="UKA00211"),None); print(m)'
```

This returns the `daqiIndex`, `measuredAt` (the timestamp of the underlying reading) and `updatedAt` (when our scheduler last ran).

### Step 3 — Fetch the raw measurements from Ricardo to verify

Get a JWT token from the running container logs, then query the Ricardo API directly for the same station and date:

```bash
# Run this from the aqie-back-end directory
TOKEN=$(docker compose logs aqie-back-end 2>&1 | grep -o '"token":"[^"]*"' | tail -1 | cut -d'"' -f4)

# Verify a token was found before proceeding
echo "Token found: ${TOKEN:0:20}..."

curl -s -H "Authorization: Bearer $TOKEN" \
  "https://api-ukair.defra.gov.uk/api/pollutant_measurement_datas?station-id=UKA00211&start-date-time=$(date +%Y-%m-%d)%2000:00:00&end-date-time=$(date +%Y-%m-%d)%2023:59:00" \
  | python3 -c '
import sys, json
d = json.load(sys.stdin)
for r in sorted(d.get("member", []), key=lambda x: x.get("endDateTime",""), reverse=True)[:5]:
    print(r["pollutantName"], r["value"], r["endDateTime"])
'
```

### Step 4 — Apply the DAQI breakpoints manually

The Ricardo API returns pollutant names as full English strings. The nitrogen compounds are commonly confused:

| API pollutant name                  | Chemical                          | DAQI relevant?                                  |
| ----------------------------------- | --------------------------------- | ----------------------------------------------- |
| Nitrogen dioxide                    | NO₂                               | ✅ Yes — used directly                          |
| Nitric oxide                        | NO                                | ❌ No — a precursor gas, not used in DAQI       |
| Nitrogen oxides as nitrogen dioxide | NOₓ (expressed as NO₂ equivalent) | ❌ No — combined NO+NO₂ total, not used in DAQI |

Compare the raw values from Step 3 against the official [Defra DAQI breakpoints](https://uk-air.defra.gov.uk/air-pollution/daqi?view=more-info) (the "Boundaries Between Index Points for Each Pollutant" section):

| Pollutant     | Band 1 | Band 2 | Band 3  | Band 4  | ... | Band 10 |
| ------------- | ------ | ------ | ------- | ------- | --- | ------- |
| NO2 (µg/m³)   | 0–67   | 68–134 | 135–200 | 201–267 | ... | >600    |
| PM10 (µg/m³)  | 0–16   | 17–33  | 34–50   | 51–58   | ... | >100    |
| PM2.5 (µg/m³) | 0–11   | 12–23  | 24–35   | 36–41   | ... | >70     |
| O3 (µg/m³)    | 0–33   | 34–66  | 67–100  | 101–120 | ... | >240    |
| SO2 (µg/m³)   | 0–88   | 89–177 | 178–266 | 267–354 | ... | >1064   |

The overall station DAQI is the **maximum** index across all DAQI-relevant pollutants. Only NO₂, PM10, PM2.5, O3 and SO2 contribute — Nitric oxide (NO), Nitrogen oxides as NO₂ (NOₓ) and Carbon monoxide (CO) are ignored.

### Step 5 — Cross-reference with UK Air

The [UK Air current levels page](https://uk-air.defra.gov.uk/latest/currentlevels) shows live DAQI and raw concentrations for every AURN station, updated hourly. Find the station by name and confirm the band shown (e.g. `2 (1 Low)`) matches the `daqiIndex` your endpoint returned.

### Tip: trigger an immediate refresh for testing

Set `AURN_SCHEDULE=* * * * *` in `.env` and restart the service. The scheduler will run every minute, populating fresh data within 60 seconds. Revert to `*/30 * * * *` (or remove the line to use the default) once verified.

### Postman

A [Postman](https://www.postman.com/) collection and environment are available for making calls to the Teams and
Repositories API. Simply import the collection and environment into Postman.

- [CDP Node Backend Template Postman Collection](postman/aqie-back-end.postman_collection.json)
- [CDP Node Backend Template Postman Environment](postman/aqie-back-end.postman_environment.json)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
