# RideApp Mock Backend — API Documentation

> **Base URL (local):** `http://localhost:3000`  
> **Base URL (live):** `https://welcoming-mindfulness-production-539a.up.railway.app`  
> All request bodies must be `Content-Type: application/json`.  
> All responses are JSON with a top-level `"success": true | false` field.

---

## Table of Contents

1. [Setup & Environment](#1-setup--environment)
2. [System](#2-system)
3. [OTP Auth](#3-otp-auth)
4. [Rides](#4-rides)
5. [Heatmap](#5-heatmap)
6. [Socket.io — Real-Time Tracking](#6-socketio--real-time-tracking)
7. [Error Reference](#7-error-reference)
8. [Rate Limits](#8-rate-limits)
9. [Mobile Integration Checklist](#9-mobile-integration-checklist)

---

## 1. Setup & Environment

### Prerequisites
- Docker (PostgreSQL 15 + Redis 7 via `docker-compose.yml`)
- Node.js ≥ 18

### Start the stack
```bash
docker-compose up -d      # Start PostgreSQL and Redis
npm install
npm run dev               # Starts on port 3000 with nodemon
```

### Environment Variables (`.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `OTP_LENGTH` | `4` | Digits in generated OTP |
| `FIXED_OTP` | `null` | Override OTP to a fixed value (dev only) |
| `NODE_ENV` | — | Set to `production` to enable SSL for DB |
| `LIVE_URL` | Railway URL | Logged on startup |

### Initialize Database
Run the schema once after PostgreSQL is up:
```bash
psql $DATABASE_URL -f database/schema.sql
```

---

## 2. System

### Health Check

```
GET /health
```

No body required.

**Response `200`**
```json
{
  "status": "OK",
  "uptime": 142.83
}
```

`uptime` is process uptime in seconds. Use this to verify the server is reachable before attempting other calls.

---

## 3. OTP Auth

> Rate limited: **10 requests per 15 minutes per IP** across all `/api/otp` endpoints.

OTPs are stored in-memory with a 5-minute TTL. On server restart the store clears — expected for a mock/demo environment.

---

### 3.1 Send OTP

```
POST /api/otp/send
```

**Request body**
```json
{
  "phone": "03001234567"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `phone` | string | Yes | Pakistani format: `03XXXXXXXXX` or `+923XXXXXXXXX` |

**Response `200`**
```json
{
  "success": true,
  "message": "OTP generated successfully",
  "otp": "4821",
  "expiresInMinutes": 5
}
```

> The `otp` is returned directly in the response for demo purposes (no SMS gateway). In production, remove `otp` from the response and deliver it via SMS.

**Error responses**

| Status | `message` | Reason |
|---|---|---|
| `400` | `Phone number is required` | Body has no `phone` field |
| `400` | `Invalid phone number. Use format: 03XXXXXXXXX or +923XXXXXXXXX` | Wrong phone format |
| `429` | `Too many requests. Try again later.` | Rate limit exceeded |

---

### 3.2 Verify OTP

```
POST /api/otp/verify
```

**Request body**
```json
{
  "phone": "03001234567",
  "otp": "4821"
}
```

| Field | Type | Required |
|---|---|---|
| `phone` | string | Yes |
| `otp` | string | Yes |

**Response `200`**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

OTP is deleted after successful verification — cannot be reused.

**Error responses**

| Status | `message` | Reason |
|---|---|---|
| `400` | `Phone and OTP are required` | Missing field |
| `404` | `OTP not found or already used` | No pending OTP for this phone |
| `410` | `OTP has expired. Please request a new one` | TTL (5 min) passed |
| `401` | `Invalid OTP` | OTP does not match |

---

## 4. Rides

The core flow for the bidding interview demo:

```
POST /request → POST /:id/bid (×N drivers) → GET /:id/bids → POST /:id/accept-bid → GET /:id
```

---

### 4.1 Create Ride Request

```
POST /api/rides/request
```

**Request body**
```json
{
  "passengerId": 1,
  "pickup": {
    "lat": 24.8607,
    "lng": 67.0011
  },
  "destination": {
    "lat": 24.8800,
    "lng": 67.0200
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `passengerId` | integer | Yes | Any integer — no auth in mock backend |
| `pickup.lat` | number | Yes | Decimal degrees |
| `pickup.lng` | number | Yes | Decimal degrees |
| `destination.lat` | number | Yes | Decimal degrees |
| `destination.lng` | number | Yes | Decimal degrees |

**Response `200`**
```json
{
  "success": true,
  "ride": {
    "id": 7,
    "passenger_id": 1,
    "driver_id": null,
    "status": "pending",
    "pickup_lat": "24.860700",
    "pickup_lng": "67.001100",
    "destination_lat": "24.880000",
    "destination_lng": "67.020000",
    "requested_at": "2026-06-24T10:30:00.000Z",
    "accepted_at": null
  }
}
```

Save `ride.id` — you need it for all subsequent calls.

**Error responses**

| Status | `message` | Reason |
|---|---|---|
| `400` | `passengerId, pickup {lat,lng}, destination {lat,lng} are required` | Missing any field |
| `500` | DB error message | Database unreachable |

---

### 4.2 Get Ride Status

```
GET /api/rides/:rideId
```

**Path params**

| Param | Type | Example |
|---|---|---|
| `rideId` | integer | `7` |

**Response `200`**
```json
{
  "success": true,
  "ride": {
    "id": 7,
    "passenger_id": 1,
    "driver_id": 101,
    "status": "accepted",
    "pickup_lat": "24.860700",
    "pickup_lng": "67.001100",
    "destination_lat": "24.880000",
    "destination_lng": "67.020000",
    "requested_at": "2026-06-24T10:30:00.000Z",
    "accepted_at": "2026-06-24T10:31:45.000Z"
  }
}
```

Possible `status` values: `pending` | `accepted` | `completed` | `cancelled`

**Error responses**

| Status | `message` | Reason |
|---|---|---|
| `404` | `Ride not found` | Invalid `rideId` |

---

### 4.3 Place Bid (Driver)

```
POST /api/rides/:rideId/bid
```

A driver offers a fare for a pending ride. If the same driver bids again, the amount is updated (upsert).

**Path params**

| Param | Type | Example |
|---|---|---|
| `rideId` | integer | `7` |

**Request body**
```json
{
  "driverId": 101,
  "amount": 1007
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `driverId` | integer | Yes | Any integer — no driver auth in mock backend |
| `amount` | number | Yes | Fare in PKR |

**Response `200`**
```json
{
  "success": true,
  "bid": {
    "id": 3,
    "ride_id": 7,
    "driver_id": 101,
    "amount": "1007.00",
    "status": "pending",
    "created_at": "2026-06-24T10:30:15.000Z"
  }
}
```

Save `bid.id` — needed to accept a specific bid.

**Error responses**

| Status | `message` | Reason |
|---|---|---|
| `400` | `driverId and amount are required` | Missing field |
| `500` | DB error | `rideId` does not exist |

---

### 4.4 Get All Bids for a Ride

```
GET /api/rides/:rideId/bids
```

Returns all bids sorted by `amount` ascending (cheapest first). Poll this on the passenger screen to show the live offer list.

**Path params**

| Param | Type | Example |
|---|---|---|
| `rideId` | integer | `7` |

**Response `200`**
```json
{
  "success": true,
  "bids": [
    {
      "id": 3,
      "ride_id": 7,
      "driver_id": 101,
      "amount": "1007.00",
      "status": "pending",
      "created_at": "2026-06-24T10:30:15.000Z"
    },
    {
      "id": 4,
      "ride_id": 7,
      "driver_id": 102,
      "amount": "1098.00",
      "status": "pending",
      "created_at": "2026-06-24T10:30:22.000Z"
    }
  ]
}
```

After `accept-bid`, the accepted bid has `"status": "accepted"` and all others have `"status": "rejected"`.

---

### 4.5 Accept Bid (Race Condition Demo)

```
POST /api/rides/:rideId/accept-bid
```

Accepts one driver's bid. Uses `SELECT ... FOR UPDATE` inside a PostgreSQL transaction — guarantees exactly one winner even if multiple requests arrive simultaneously.

**Path params**

| Param | Type | Example |
|---|---|---|
| `rideId` | integer | `7` |

**Request body**
```json
{
  "bidId": 3
}
```

| Field | Type | Required |
|---|---|---|
| `bidId` | integer | Yes |

**Response `200` — winner**
```json
{
  "success": true,
  "rideId": 7,
  "driverId": 101
}
```

**Response `400` — loser (concurrent request)**
```json
{
  "success": false,
  "message": "Ride already accepted or finished"
}
```

**Error responses**

| Status | `message` | Reason |
|---|---|---|
| `400` | `bidId is required` | Missing field |
| `400` | `Ride already accepted or finished` | Another request won the lock first |
| `400` | `Ride not found` | Invalid `rideId` |
| `400` | `Bid not found` | Invalid `bidId` or wrong `rideId` |

> **Race condition demo:** Open two Postman tabs. Send Accept Bid with `bidId: 3` from tab 1 and `bidId: 4` from tab 2 at the same time. Exactly one returns `success: true`; the other returns `"Ride already accepted or finished"`. Run `scripts/test-race-condition.sh` for an automated bash version of the same test.

---

## 5. Heatmap

---

### 5.1 Seed Dummy Rides

```
POST /api/heatmap/seed
```

Inserts N dummy ride records in a **single bulk SQL statement** (not a loop). Fast enough for mobile demo — completes in under 500ms.

**Query params** (all optional)

| Param | Type | Default | Notes |
|---|---|---|---|
| `count` | integer | `500` | Number of rides to insert |
| `lat` | number | `24.8607` | City center latitude (default: Karachi) |
| `lng` | number | `67.0011` | City center longitude (default: Karachi) |

**Example**
```
POST /api/heatmap/seed?count=500&lat=24.8607&lng=67.0011
```

**Response `200`**
```json
{
  "success": true,
  "message": "Inserted 500 dummy rides around (24.8607, 67.0011)"
}
```

---

### 5.2 Get Heatmap Data

```
GET /api/heatmap/data
```

Returns aggregated pickup locations as a grid. Each cell has a `weight` (ride count) that maps to heatmap intensity (low = green, high = red).

**Query params**

| Param | Type | Default | Notes |
|---|---|---|---|
| `precision` | integer | `3` | Decimal places to round lat/lng to. `3` ≈ 100m cells (city view). `4` ≈ 10m cells (street view). |

**Example**
```
GET /api/heatmap/data?precision=3
```

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "lat": "24.861", "lng": "67.001", "weight": "23" },
    { "lat": "24.862", "lng": "67.003", "weight": "11" },
    { "lat": "24.859", "lng": "66.999", "weight": "8" }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `lat` | string | Grid cell center latitude |
| `lng` | string | Grid cell center longitude |
| `weight` | string | Number of pickups in this cell (last 24 hours) |

**Mobile rendering guide:**
Pass the array directly to Google Maps `HeatmapLayer` or Mapbox `heatmap` layer. Convert `weight` to a number and use it as the point intensity. Higher `precision` = more cells = finer detail.

---

## 6. Socket.io — Real-Time Tracking

Connect to the same base URL using any Socket.io client (v4 compatible).

```
ws://localhost:3000
```

The server uses `@socket.io/redis-adapter` — location updates broadcast across all server instances via Redis Pub/Sub. Works with 200+ concurrent drivers.

---

### Connection

```js
// React Native / any JS client
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  transports: ["websocket"],   // skip long-polling on mobile for speed
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => console.log("connected:", socket.id));
socket.on("disconnect", (reason) => console.log("disconnected:", reason));
```

---

### Events: Client → Server

#### `join`

Register this socket as a driver or passenger. Call immediately after `connect`.

```js
socket.emit("join", {
  role: "driver",   // "driver" | "passenger"
  id: 101           // your userId or driverId
});
```

| Field | Type | Values |
|---|---|---|
| `role` | string | `"driver"` or `"passenger"` |
| `id` | integer | Your user/driver ID |

No acknowledgement is sent back.

---

#### `update-location` (Driver only)

Send the driver's current GPS coordinates. Call every 2-3 seconds while the trip is active.

```js
// Call this inside navigator.geolocation.watchPosition callback
socket.emit("update-location", {
  driverId: 101,
  lat: 24.8612,
  lng: 67.0025
});
```

| Field | Type | Required |
|---|---|---|
| `driverId` | integer | Yes |
| `lat` | number | Yes |
| `lng` | number | Yes |

The server stores `{ lat, lng, timestamp }` in Redis with a 5-minute TTL. If no update arrives for 5 minutes, the cached location expires automatically.

No acknowledgement is sent back.

---

#### `start-tracking` (Passenger only)

Subscribe to a driver's location stream.

```js
socket.emit("start-tracking", { driverId: 101 });
```

| Field | Type | Required |
|---|---|---|
| `driverId` | integer | Yes |

The server **immediately emits the last known location** from Redis cache (so the map is not blank while waiting for the next GPS update), then continues emitting `location-updated` as the driver moves.

---

### Events: Server → Client

#### `location-updated`

Received by the passenger whenever the driver's location changes (and once immediately on `start-tracking` if a cached location exists).

```js
socket.on("location-updated", (data) => {
  const { driverId, lat, lng } = data;
  // Update the driver marker on the map
  mapRef.current.animateMarker({ lat, lng });
});
```

| Field | Type | Notes |
|---|---|---|
| `driverId` | integer | Which driver moved |
| `lat` | number | New latitude |
| `lng` | number | New longitude |

---

### Full Mobile Flow (Two Phones Demo)

**Driver phone:**
```js
const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", () => {
  socket.emit("join", { role: "driver", id: 101 });

  navigator.geolocation.watchPosition((pos) => {
    socket.emit("update-location", {
      driverId: 101,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
  }, null, { distanceFilter: 5 });  // emit every 5m of movement
});
```

**Passenger phone:**
```js
const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", () => {
  socket.emit("join", { role: "passenger", id: 1 });
  socket.emit("start-tracking", { driverId: 101 });
});

socket.on("location-updated", ({ driverId, lat, lng }) => {
  // Animate driver marker to new position
  driverMarker.setCoordinate({ latitude: lat, longitude: lng });
});
```

---

## 7. Error Reference

All error responses follow this shape:

```json
{
  "success": false,
  "message": "Human-readable reason"
}
```

| HTTP Status | Meaning |
|---|---|
| `200` | Success |
| `400` | Bad request — missing or invalid input |
| `401` | Invalid OTP |
| `404` | Resource not found |
| `410` | OTP expired |
| `429` | Rate limit exceeded |
| `500` | Server or database error |

---

## 8. Rate Limits

| Endpoint group | Limit | Window |
|---|---|---|
| `POST /api/otp/send` | 10 requests | 15 minutes per IP |
| `POST /api/otp/verify` | 10 requests | 15 minutes per IP |
| All other endpoints | No limit | — |

When the limit is exceeded:
```json
{
  "success": false,
  "message": "Too many requests. Try again later."
}
```

---

## 9. Mobile Integration Checklist

Work through these in order for the full interview demo.

### Setup
- [ ] `docker-compose up -d` — PostgreSQL + Redis running
- [ ] `npm run dev` — server logs `RideApp API running on port 3000`
- [ ] `psql $DATABASE_URL -f database/schema.sql` — tables + indexes created
- [ ] `GET /health` returns `{"status":"OK"}`

### Feature 1 — Real-Time Tracking
- [ ] Driver phone connects Socket.io with `transports: ["websocket"]`
- [ ] Driver emits `join` then `update-location` every 2-3 seconds
- [ ] Passenger phone connects, emits `join` then `start-tracking`
- [ ] Passenger receives `location-updated` immediately (from Redis cache), then on every driver move
- [ ] Confirm both phones can be on different networks (Redis adapter handles cross-server routing)

### Feature 2 — Heatmap
- [ ] `POST /api/heatmap/seed` — returns `"Inserted 500 dummy rides"` in < 1 second
- [ ] `GET /api/heatmap/data?precision=3` — returns array of `{lat, lng, weight}` objects
- [ ] Higher `weight` values render as red, lower as green/yellow on the map

### Feature 3 — Bidding / Race Condition
- [ ] `POST /api/rides/request` — note `ride.id` from response
- [ ] `POST /api/rides/:id/bid` with `driverId: 101, amount: 1007` — note `bid.id`
- [ ] `POST /api/rides/:id/bid` with `driverId: 102, amount: 1098` — note second `bid.id`
- [ ] `GET /api/rides/:id/bids` — see both bids with `status: "pending"`
- [ ] Send two `POST /api/rides/:id/accept-bid` requests simultaneously (different `bidId`)
- [ ] Exactly one returns `success: true`; the other returns `"Ride already accepted or finished"`
- [ ] `GET /api/rides/:id` — `status` is `"accepted"`, `driver_id` is set
- [ ] `GET /api/rides/:id/bids` — one bid is `"accepted"`, other is `"rejected"`

---

*Generated for RideApp Mock Backend — June 2026*
