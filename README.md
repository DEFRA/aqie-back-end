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

| Variable                          | Required | Description                                                                          |
| :-------------------------------- | :------: | :----------------------------------------------------------------------------------- |
| `RICARDO_API_EMAIL`               |    ✅    | Email for Ricardo API OAuth login (needed by `/monitoringStationInfo`)               |
| `RICARDO_API_PASSWORD`            |    ✅    | Password for Ricardo API OAuth login (needed by `/monitoringStationInfo`)            |
| `SSH_PRIVATE_KEY`                 |    ✅    | SSH private key for Met Office SFTP access (needed by `/sftp/*`)                     |
| `HTTP_PROXY`                      |          | HTTP proxy URL                                                                       |
| `HTTPS_PROXY`                     |          | HTTPS proxy URL                                                                      |
| `SQUID_USERNAME`                  |          | Squid proxy username                                                                 |
| `SQUID_PASSWORD`                  |          | Squid proxy password                                                                 |
| `ACCESS_CONTROL_ALLOW_ORIGIN_URL` |          | Allowed CORS origin URL                                                              |
| `FORECAST_SCHEDULE`               |          | Cron expression for forecast data polling (default: `0 05-10 * * *` — hourly 5–10am) |
| `POLLUTANTS_SCHEDULE`             |          | Cron expression for pollutant data polling (default: `0 */1 * * *` — every hour)     |

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

| Endpoint                      | Description                                                                  |
| :---------------------------- | :--------------------------------------------------------------------------- |
| `GET: /health`                | Health check                                                                 |
| `GET: /forecasts`             | Returns air quality forecasts stored in MongoDB (populated by cron 5–10am)   |
| `GET: /measurements`          | Returns pollutant measurements stored in MongoDB                             |
| `GET: /monitoringStationInfo` | Returns monitoring station data via Ricardo API (requires credentials)       |
| `GET: /sftp/files`            | Lists files available on the Met Office SFTP server (requires SSH key)       |
| `GET: /sftp/file/{filename}`  | Downloads a specific file from the Met Office SFTP server (requires SSH key) |

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

# Monitoring station info (requires RICARDO_API_EMAIL + RICARDO_API_PASSWORD in .env)
curl http://localhost:3001/monitoringStationInfo

# List files on Met Office SFTP (requires SSH_PRIVATE_KEY in .env)
curl http://localhost:3001/sftp/files

# Download a specific file from SFTP
curl http://localhost:3001/sftp/file/<filename>
```

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
