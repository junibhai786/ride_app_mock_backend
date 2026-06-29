const otpService = require('../services/otpService'); // Import OTP business logic.

function sendOtp(req, res) {
  try {
    const { phone } = req.body; // Read the phone number from the JSON body.
    const result = otpService.sendOtp(phone); // Ask the service to validate, generate, and store the OTP.

    return res.status(200).json({
      success: true,
      message: 'OTP generated successfully',
      otp: result.otp,
      expiresInMinutes: result.expiresInMinutes,
    }); // Return the demo OTP response expected by the client.
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message }); // Convert service errors to JSON HTTP errors.
  }
}

function verifyOtp(req, res) {
  try {
    const { phone, otp } = req.body; // Read verification input from the JSON body.
    otpService.verifyOtp(phone, otp); // Ask the service to validate and consume the OTP.

    return res.status(200).json({ success: true, message: 'OTP verified successfully' }); // Confirm successful verification.
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message }); // Convert service errors to JSON HTTP errors.
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
}; // Export controller actions for OTP routes.
