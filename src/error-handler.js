const errors = require('@feathersjs/errors')

const ERROR_CODES = {
  serverError: 0x0000,
  protocolError: 0x000A,
  badCredentials: 0x0100,
  unavailableException: 0x1000,
  overloaded: 0x1001,
  isBootstrapping: 0x1002,
  truncateError: 0x1003,
  writeTimeout: 0x1100,
  readTimeout: 0x1200,
  readFailure: 0x1300,
  functionFailure: 0x1400,
  writeFailure: 0x1500,
  syntaxError: 0x2000,
  unauthorized: 0x2100,
  invalid: 0x2200,
  configError: 0x2300,
  alreadyExists: 0x2400,
  unprepared: 0x2500
}

module.exports = function errorHandler (error) {
  let feathersError = error

  if (error instanceof TypeError) {
    throw new errors.BadRequest(error)
  }

  // CassanKnex errors
  if (error.code !== undefined && (!error.type || error.type !== 'FeathersError')) {
    switch (error.code) {
      case ERROR_CODES.syntaxError:
      case ERROR_CODES.invalid:
      case ERROR_CODES.truncateError:
        feathersError = new errors.BadRequest(error)
        break

      case ERROR_CODES.badCredentials:
        feathersError = new errors.NotAuthenticated(error)
        break

      case ERROR_CODES.unauthorized:
        feathersError = new errors.Forbidden(error)
        break

      case ERROR_CODES.functionFailure:
        feathersError = new errors.MethodNotAllowed(error)
        break

      case ERROR_CODES.protocolError:
        feathersError = new errors.NotAcceptable(error)
        break

      case ERROR_CODES.readTimeout:
      case ERROR_CODES.writeTimeout:
        feathersError = new errors.Timeout(error)
        break

      case ERROR_CODES.alreadyExists:
        feathersError = new errors.Conflict(error)
        break

      case ERROR_CODES.overloaded:
        feathersError = new errors.Unprocessable(error)
        break

      case ERROR_CODES.configError:
      case ERROR_CODES.serverError:
      case ERROR_CODES.readFailure:
      case ERROR_CODES.writeFailure:
        feathersError = new errors.GeneralError(error)
        break

      case ERROR_CODES.unprepared:
        feathersError = new errors.NotImplemented(error)
        break

      case ERROR_CODES.isBootstrapping:
      case ERROR_CODES.unavailableException:
        feathersError = new errors.Unavailable(error)
        break

      default:
        feathersError = new errors.GeneralError(error)
    }

    throw feathersError
  }

  throw feathersError
}
