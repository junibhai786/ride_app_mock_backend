const env = require('../config/env'); // Read OTP configuration from one central config object.
const otpStore = require('../models/otpStore'); // Use the OTP model for in-memory persistence.

const OTP_TTL_MS = 5 * 60 * 1000; // Keep generated OTPs valid for five minutes.
const PAKISTAN_MOBILE_REGEX = /^(\+92|0)3[0-9]{9}$/; // Accept 03XXXXXXXXX and +923XXXXXXXXX mobile numbers.

function generateOtp() {
  if (env.fixedOtp) return env.fixedOtp.toString(); // Return fixed OTP when demos/tests require predictable output.

  const min = Math.pow(10, env.otpLength - 1); // Calculate the smallest number with the configured digit length.
  const max = Math.pow(10, env.otpLength) - 1; // Calculate the largest number with the configured digit length.
  return (Math.floor(Math.random() * (max - min + 1)) + min).toString(); // Generate a random OTP inside that numeric range.
}

function isValidPhone(phone) {
  return PAKISTAN_MOBILE_REGEX.test(phone); // Validate that the phone matches supported Pakistani mobile formats.
}

function sendOtp(phone) {
  if (!phone) {
    const error = new Error('Phone number is required'); // Create a controller-friendly validation error.
    error.statusCode = 400; // Mark missing phone as a bad request.
    throw error; // Stop before generating an OTP.
  }

  if (!isValidPhone(phone)) {
    const error = new Error('Invalid phone number. Use format: 03XXXXXXXXX or +923XXXXXXXXX'); // Create a clear phone-format error.
    error.statusCode = 400; // Mark invalid phone format as a bad request.
    throw error; // Stop before storing an OTP.
  }

  const otp = generateOtp(); // Generate the OTP after validation passes.
  const expiresAt = Date.now() + OTP_TTL_MS; // Calculate the absolute expiry timestamp.

  otpStore.saveOtp(phone, otp, expiresAt); // Persist the OTP in the model/store layer.
  setTimeout(() => otpStore.deleteOtp(phone), OTP_TTL_MS); // Clean the OTP automatically after it expires.

  console.log(`OTP for ${phone}: ${otp}`); // Log the demo OTP because no SMS provider is connected.

  return {
    otp,
    expiresInMinutes: OTP_TTL_MS / 60 / 1000,
  }; // Return response data without Express-specific code.
}

function verifyOtp(phone, otp) {
  if (!phone || !otp) {
    const error = new Error('Phone and OTP are required'); // Create a validation error when either field is missing.
    error.statusCode = 400; // Mark missing input as a bad request.
    throw error; // Stop verification early.
  }

  const record = otpStore.findOtp(phone); // Load the latest OTP record for this phone number.

  if (!record) {
    const error = new Error('OTP not found or already used'); // Explain that the OTP cannot be verified.
    error.statusCode = 404; // Use not found when there is no active OTP record.
    throw error; // Stop before expiry/value checks.
  }

  if (Date.now() > record.expiresAt) {
    otpStore.deleteOtp(phone); // Remove expired OTPs immediately.
    const error = new Error('OTP has expired. Please request a new one'); // Create an expiry-specific error.
    error.statusCode = 410; // Use Gone for expired OTPs.
    throw error; // Stop because expired OTPs are invalid.
  }

  if (record.otp !== otp.toString()) {
    const error = new Error('Invalid OTP'); // Create a mismatch error without revealing the correct OTP.
    error.statusCode = 401; // Use unauthorized for incorrect credentials.
    throw error; // Stop because the OTP does not match.
  }

  otpStore.deleteOtp(phone); // Delete verified OTPs so they are single-use.
}

module.exports = {
  sendOtp,
  verifyOtp,
}; // Export OTP business operations for controllers.
