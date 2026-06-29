function requestLogger(req, res, next) {
  const start = Date.now(); // Capture request start time for latency logging.
  const originalJson = res.json.bind(res); // Preserve Express' original res.json implementation.

  res.json = (body) => {
    const ms = Date.now() - start; // Calculate total time spent before the JSON response.
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`,
      JSON.stringify(body)
    ); // Log request metadata and the JSON body for debugging/demo visibility.

    return originalJson(body); // Send the response using Express' original method.
  };

  next(); // Continue to the next middleware/controller.
}

module.exports = requestLogger; // Export the logger so app setup stays clean.
