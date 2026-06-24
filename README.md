# RideApp OTP API

A Node.js REST API that generates and verifies OTPs for the RideApp Flutter project.

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| POST | `/api/otp/send` | Generate & return OTP |
| POST | `/api/otp/verify` | Verify submitted OTP |

## POST /api/otp/send
**Body:** `{ "phone": "03001234567" }`  
**Response:**
```json
{
  "success": true,
  "message": "OTP generated successfully",
  "otp": "4821",
  "expiresInMinutes": 5
}
```

## POST /api/otp/verify
**Body:** `{ "phone": "03001234567", "otp": "4821" }`  
**Response:**
```json
{ "success": true, "message": "OTP verified successfully" }
```

## Deploy to Heroku
```bash
heroku create ride-otp-api
git push heroku main
```
