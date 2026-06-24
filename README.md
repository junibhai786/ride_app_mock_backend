# Ride-Sharing Mock Backend

This project implements three core technical challenges for a ride-sharing application.

## Core Features

### 1. Google Maps - Real-Time Live Tracking
- **Goal**: Scalable driver location updates.
- **Tech Stack**: Socket.io + Redis Adapter (scaling) + ioredis.
- **Implementation**: Drivers emit `update-location`. Redis stores the latest coordinates. Passengers subscribe to `tracking:driver:{id}` to receive live updates.

### 2. Heatmap - Demand Zones
- **Goal**: Real-time demand visualization without DB overload.
- **Tech Stack**: PostgreSQL + Tile-based Aggregation.
- **Implementation**: SQL query rounds lat/lng to a specific precision (creating a grid) and counts occurrences in the last 24 hours.

### 3. inDrive-style Bidding System (Race Conditions)
- **Goal**: Prevent double-acceptance of rides.
- **Tech Stack**: PostgreSQL Transactions + `SELECT ... FOR UPDATE` (Row Locking).
- **Implementation**: Locking the specific `ride` row during the bid acceptance transaction ensures that only one driver can succeed, even if multiple requests arrive simultaneously.

## Getting Started

### Prerequisites
- Node.js (>=18)
- Docker (for PostgreSQL & Redis)

### Setup
1. Copy `.env.example` to `.env`.
2. Start infrastructure: `docker-compose up -d`.
3. Install dependencies: `npm install`.
4. Initialize database: `psql -f database/schema.sql`.
5. Run server: `npm run dev`.

## Testing

### Postman Collection
Import `RideApp_Backend_Tests.postman_collection.json` into Postman to test API endpoints.

### Race Condition Proof
Run the script: `./scripts/test-race-condition.sh`. 
It simulates two drivers accepting the same ride at the exact same time. One will succeed, and the other will fail with a "Ride already accepted" error, proving the row locking works.

## Interview Questions & Answers
Available in `INTERVIEW_ANSWERS.md`.

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
