const rateLimit = require('express-rate-limit'); // Import reusable IP-based rate limiting middleware.

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Count OTP requests in a 15-minute window.
  max: 10, // Allow each IP up to 10 OTP requests per window.
  message: { success: false, message: 'Too many requests. Try again later.' }, // Return a consistent JSON error when limited.
});

module.exports = { otpLimiter }; // Export named limiters so each route group can choose its own policy.
