const responseFormatter = (req, res, next) => {
  // Save a reference to the original `send` method
  const originalSend = res.send;

  res.send = (body) => {
    // Ensure that the response is an object (e.g., for successful API responses or errors)
    if (typeof body === 'object' && body !== null) {
      const statusCode = res.statusCode;
      const success = statusCode >= 200 && statusCode < 300;
      const message = body.message || (success ? 'Request was successful' : 'Request failed');
      const error = statusCode >= 400;
      
      // Format the response body
      const response = {
        success,
        message,
        data: body.data || null,
        error,
        statusCode,
      };

      // If there are error details, include them
      if (error) {
        response.errorDetails = body.errorDetails || 'An unexpected error occurred';
      }

      return res.status(statusCode).json(response);  // Send the formatted response as JSON
    }

    // If it's not an object, send the body as is
    return originalSend.call(res, body);
  };

  next();  // Continue to the next middleware or route handler
};

module.exports = responseFormatter;
