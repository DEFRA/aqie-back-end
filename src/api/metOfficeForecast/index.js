import {
  metOfficeForecastReadController,
  metOfficeForecastListController
} from './controllers/index.js'

const metOfficeForecastRead = {
  plugin: {
    name: 'metOfficeForecastRead',
    register: async (server) => {
      server.route({
        method: 'GET',
        path: '/sftp/file/{filename}',
        ...metOfficeForecastReadController
      })
    }
  }
}

const metOfficeForecastList = {
  plugin: {
    name: 'metOfficeForecastList',
    register: async (server) => {
      server.route([
        {
          method: 'GET',
          path: '/sftp/files',
          ...metOfficeForecastListController
        }
      ])
    }
  }
}

export { metOfficeForecastRead, metOfficeForecastList }
