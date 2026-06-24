const express = require('express');
const router = express.Router();

/**
 * In-memory OTP store: { [phone]: { otp, expiresAt } }
 * On Heroku this resets on each dyno restart — fine for demo purposes.
 */
const otpStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // OTP expires after 5 minutes
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH, 10) || 4;
const FIXED_OTP = process.env.FIXED_OTP || null; // set env var for a static fallback OTP

/** Generate a random N-digit OTP, or use FIXED_OTP if set */
function generateOtp() {
  if (FIXED_OTP) return FIXED_OTP.toString();
  try {
    const min = Math.pow(10, OTP_LENGTH - 1);
    const max = Math.pow(10, OTP_LENGTH) - 1;
    return (Math.floor(Math.random() * (max - min + 1)) + min).toString();
  } catch {
    return '1234'; // last-resort fallback
  }
}

/** Validate Pakistani mobile number format (03XXXXXXXXX or +923XXXXXXXXX) */
function isValidPhone(phone) {
  return /^(\+92|0)3[0-9]{9}$/.test(phone);
}

// ── POST /api/otp/send ────────────────────────────────────────────────────────
// Body: { phone: "03001234567" }
// Returns the OTP directly in the response (shown on-screen, no SMS needed)
router.post('/send', (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number. Use format: 03XXXXXXXXX or +923XXXXXXXXX',
    });
  }

  const otp = generateOtp();
  const expiresAt = Date.now() + OTP_TTL_MS;

  // Store OTP against the phone number
  otpStore.set(phone, { otp, expiresAt });

  // Auto-clean from store after TTL
  setTimeout(() => otpStore.delete(phone), OTP_TTL_MS);

  console.log(`OTP for ${phone}: ${otp}`); // visible in Heroku logs

  return res.status(200).json({
    success: true,
    message: 'OTP generated successfully',
    otp,                          // returned for on-screen display (no SMS needed)
    expiresInMinutes: 5,
  });
});

// ── POST /api/otp/verify ─────────────────────────────────────────────────────
// Body: { phone: "03001234567", otp: "4821" }
router.post('/verify', (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
  }

  const record = otpStore.get(phone);

  if (!record) {
    return res.status(404).json({ success: false, message: 'OTP not found or already used' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    return res.status(410).json({ success: false, message: 'OTP has expired. Please request a new one' });
  }

  if (record.otp !== otp.toString()) {
    return res.status(401).json({ success: false, message: 'Invalid OTP' });
  }

  // OTP matched — delete it so it cannot be reused
  otpStore.delete(phone);

  return res.status(200).json({ success: true, message: 'OTP verified successfully' });
});

module.exports = router;
