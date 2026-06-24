const express = require('express'); // Import the Express framework
const router = express.Router(); // Create a new router object to handle routes

/**
 * In-memory OTP store: { [phone]: { otp, expiresAt } }
 * On Heroku this resets on each dyno restart — fine for demo purposes.
 */
const otpStore = new Map(); // Initialize a Map to store OTPs with phone numbers as keys

const OTP_TTL_MS = 5 * 60 * 1000; // Define OTP Time-To-Live as 5 minutes in milliseconds
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH, 10) || 4; // Set OTP length from environment variable or default to 4
const FIXED_OTP = process.env.FIXED_OTP || null; // Set a fixed OTP from environment variables if provided

/** Generate a random N-digit OTP, or use FIXED_OTP if set */
function generateOtp() { // Function to generate a one-time password
  if (FIXED_OTP) return FIXED_OTP.toString(); // If a fixed OTP is set, return it as a string
  try { // Start a try block for random number generation
    const min = Math.pow(10, OTP_LENGTH - 1); // Calculate the minimum value for the OTP
    const max = Math.pow(10, OTP_LENGTH) - 1; // Calculate the maximum value for the OTP
    return (Math.floor(Math.random() * (max - min + 1)) + min).toString(); // Generate and return a random OTP string
  } catch (error) { // Catch any errors during generation
    return '1234'; // Return a hardcoded fallback OTP in case of error
  }
}

/** Validate Pakistani mobile number format (03XXXXXXXXX or +923XXXXXXXXX) */
function isValidPhone(phone) { // Function to check if a phone number is valid
  return /^(\+92|0)3[0-9]{9}$/.test(phone); // Use regex to validate Pakistani phone formats
}

// ── POST /api/otp/send ────────────────────────────────────────────────────────
// Body: { phone: "03001234567" }
// Returns the OTP directly in the response (shown on-screen, no SMS needed)
router.post('/send', (req, res) => { // Define the POST route for sending OTP
  const { phone } = req.body; // Destructure the phone number from the request body

  if (!phone) { // Check if the phone number was provided
    return res.status(400).json({ success: false, message: 'Phone number is required' }); // Return 400 if phone is missing
  }

  if (!isValidPhone(phone)) { // Validate the phone number format
    return res.status(400).json({ // Return 400 if the format is invalid
      success: false, // Indicate failure
      message: 'Invalid phone number. Use format: 03XXXXXXXXX or +923XXXXXXXXX', // Error message
    });
  }

  const otp = generateOtp(); // Generate a new OTP for the user
  const expiresAt = Date.now() + OTP_TTL_MS; // Calculate the expiration timestamp

  // Store OTP against the phone number
  otpStore.set(phone, { otp, expiresAt }); // Save the OTP and expiry in the in-memory store

  // Auto-clean from store after TTL
  setTimeout(() => otpStore.delete(phone), OTP_TTL_MS); // Schedule deletion of the OTP after it expires

  console.log(`OTP for ${phone}: ${otp}`); // Log the generated OTP to the console

  return res.status(200).json({ // Return a successful response
    success: true, // Indicate success
    message: 'OTP generated successfully', // Success message
    otp,                          // Include the OTP in the response for demo purposes
    expiresInMinutes: 5, // Inform the user how long the OTP is valid
  });
});

// ── POST /api/otp/verify ─────────────────────────────────────────────────────
// Body: { phone: "03001234567", otp: "4821" }
router.post('/verify', (req, res) => { // Define the POST route for verifying OTP
  const { phone, otp } = req.body; // Destructure phone and otp from the request body

  if (!phone || !otp) { // Check if both phone and otp are provided
    return res.status(400).json({ success: false, message: 'Phone and OTP are required' }); // Return 400 if either is missing
  }

  const record = otpStore.get(phone); // Retrieve the stored OTP record for the phone number

  if (!record) { // Check if a record exists for this phone number
    return res.status(404).json({ success: false, message: 'OTP not found or already used' }); // Return 404 if no record found
  }

  if (Date.now() > record.expiresAt) { // Check if the OTP has expired
    otpStore.delete(phone); // Remove the expired record from the store
    return res.status(410).json({ success: false, message: 'OTP has expired. Please request a new one' }); // Return 410 Gone
  }

  if (record.otp !== otp.toString()) { // Compare the provided OTP with the stored one
    return res.status(401).json({ success: false, message: 'Invalid OTP' }); // Return 401 Unauthorized if they don't match
  }

  // OTP matched — delete it so it cannot be reused
  otpStore.delete(phone); // Remove the verified OTP from the store

  return res.status(200).json({ success: true, message: 'OTP verified successfully' }); // Return success response
});

module.exports = router; // Export the router for use in other parts of the app
