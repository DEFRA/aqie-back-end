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

| Endpoint                      | Description                                                                                                                                      |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET: /health`                | Health check                                                                                                                                     |
| `GET: /forecasts`             | Returns air quality forecasts stored in MongoDB (populated by cron 5–10am)                                                                       |
| `GET: /measurements`          | Returns pollutant measurements stored in MongoDB                                                                                                 |
| `GET: /monitoringStations`    | Returns cached monitoring station metadata from MongoDB (populated on startup, refreshed every 6 hours). Zero Ricardo API calls on each request. |
| `GET: /monitoringStationInfo` | Returns monitoring station data via Ricardo API (requires credentials)                                                                           |
| `GET: /aurnData`              | Returns per-station observed DAQI index calculated from latest AURN measurements (refreshed every 30 minutes by a background scheduler)          |
| `GET: /sftp/files`            | Lists files available on the Met Office SFTP server (requires SSH key)                                                                           |
| `GET: /sftp/file/{filename}`  | Downloads a specific file from the Met Office SFTP server (requires SSH key)                                                                     |

## Calling API endpoints

> The default port is `3001` when running via Docker Compose, or `3000` when running via npm directly.

### curl

```bash
# Health check
curl http://localhost:3001/health

# Air quality forecasts — reads from MongoDB, returns empty until populated by the cron job (runs 5–10am)
# To populate immediately, set FORECAST_SCHEDULE=* * * * * in your .env and restart the service.
# Remember to revert it afterwards so it doesn't hammer the upstream API every minute.
curl http://localhost:3001/forecasts

# Pollutant measurements — reads from MongoDB, returns empty until populated by the cron job (runs hourly)
# To populate immediately, set POLLUTANTS_SCHEDULE=* * * * * in your .env and restart the service.
# Remember to revert it afterwards so it doesn't hammer the upstream API every minute.
curl http://localhost:3001/measurements

# Monitoring stations — reads from MongoDB cache, populated on startup and refreshed every 6 hours
# Returns immediately with no Ricardo API calls
curl http://localhost:3001/monitoringStations

# AURN data — per-station observed DAQI index, refreshed every 30 minutes
# To populate immediately, set AURN_SCHEDULE=* * * * * in your .env and restart the service.
# Remember to revert it afterwards.
curl http://localhost:3001/aurnData

# Monitoring station info via Ricardo API (requires RICARDO_API_EMAIL + RICARDO_API_PASSWORD in .env)
curl http://localhost:3001/monitoringStationInfo

# List files on Met Office SFTP (requires SSH_PRIVATE_KEY in .env)
curl http://localhost:3001/sftp/files

# Download a specific file from SFTP
curl http://localhost:3001/sftp/file/<filename>
```

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
