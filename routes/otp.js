const express = require('express'); // Import Express to create a scoped router.
const otpController = require('../controllers/otpController'); // Import OTP controller actions.

const router = express.Router(); // Create a router for /api/otp endpoints.

router.post('/send', otpController.sendOtp); // Route OTP generation requests to the controller.
router.post('/verify', otpController.verifyOtp); // Route OTP verification requests to the controller.

module.exports = router; // Export the router so config/app can mount it.
