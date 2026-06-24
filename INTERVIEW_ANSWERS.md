# Ride-Sharing Technical Interview - Expected Answers

### 1. Google Maps - Real-Time Live Tracking
**Question**: "If 200 drivers are connected to the server, how will you scale Socket.io? Will you use Redis Pub/Sub or not?"

**Expected Answer**:
- **Scaling**: I will use a **Redis Adapter** for Socket.io. This allows multiple Socket.io server instances (on different processes or machines) to communicate.
- **Redis Pub/Sub**: Yes, Redis Pub/Sub is essential. When a driver sends their location to Server A, Redis broadcasts it so that a passenger connected to Server B can also receive the update. 
- **Performance**: For 100+ drivers every 2-3 seconds, memory-based storage (Redis) for the "latest location" is better than hitting the main DB for every single heartbeat.

---

### 2. Heatmap - Demand Zones
**Question**: "You have thousands of pickup locations in PostgreSQL. How will you generate Heatmap Tiles from them? Will you hit the DB directly for every ride or use aggregation?"

**Expected Answer**:
- **Strategy**: Direct hits for every raw point are too expensive for a map with thousands of rides. I would use **Aggregation**.
- **Implementation**: Group pickups by a "Grid Cell" (rounding lat/lng to 3 or 4 decimal places). Count the rides in each cell.
- **Optimization**: For very high scale, I would use Materialized Views that refresh every 5-10 minutes, or an in-memory aggregation layer (like Redis Geospatial) rather than recalculating from raw SQL every time a user pans the map.

---

### 3. inDrive-style Offer Fare / Bidding System
**Question**: "If 5 drivers send an offer on the same ride at the same time, how will you prevent double-accept in the DB? Will you use PostgreSQL Transactions + Row Locking?"

**Expected Answer**:
- **Prevention**: Yes, I will use **PostgreSQL Transactions** combined with **Row Locking (`SELECT ... FOR UPDATE`)**.
- **Process**:
    1. Start Transaction.
    2. Execute `SELECT * FROM rides WHERE id = ? FOR UPDATE`. This locks the ride row.
    3. Check if `status` is still 'pending'.
    4. If yes, update `status` to 'accepted' and assign the driver.
    5. Commit Transaction.
- **Result**: Even if 5 requests hit the server at the exact same millisecond, the DB will queue them. The first one will change the status, and the subsequent 4 will see the status is no longer 'pending' and safely fail.
