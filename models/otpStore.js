const otpStore = new Map(); // Keep demo OTP records in memory, keyed by phone number.

function saveOtp(phone, otp, expiresAt) {
  otpStore.set(phone, { otp, expiresAt }); // Store the OTP and expiry together for later verification.
}

function findOtp(phone) {
  return otpStore.get(phone) || null; // Return the record when it exists, otherwise normalize to null.
}

function deleteOtp(phone) {
  otpStore.delete(phone); // Remove used or expired OTPs so they cannot be reused.
}

module.exports = {
  saveOtp,
  findOtp,
  deleteOtp,
}; // Export store operations as the OTP model layer.
