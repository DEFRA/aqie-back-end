const healthController = {
  handler: (request, h) =>
    h.response({ message: 'success', text: 'missingFOI' }).code(200)
}

export { healthController }
