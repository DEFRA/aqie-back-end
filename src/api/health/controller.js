const HTTP_OK = 200

const healthController = {
  handler(_request, h) {
    return h.response({ message: 'success' }).code(HTTP_OK)
  }
}

export { healthController }
