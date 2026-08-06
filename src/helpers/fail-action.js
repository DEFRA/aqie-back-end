function failAction(request, error) {
  request.logger.error(error, error.message)

  throw error
}

export { failAction }
