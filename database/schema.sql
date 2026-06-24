-- Enable PostGIS if needed for spatial queries
-- CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline', -- 'online', 'busy', 'offline'
    last_lat DECIMAL(9,6),
    last_lng DECIMAL(9,6),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    passenger_id INTEGER NOT NULL,
    driver_id INTEGER,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'completed', 'cancelled'
    pickup_lat DECIMAL(9,6) NOT NULL,
    pickup_lng DECIMAL(9,6) NOT NULL,
    destination_lat DECIMAL(9,6) NOT NULL,
    destination_lng DECIMAL(9,6) NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP
);

-- driver_id has no FK so any integer driverId works without pre-seeding drivers table
CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    ride_id INTEGER REFERENCES rides(id),
    driver_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ride_id, driver_id)
);

-- Indexes for heatmap aggregation and bid lookups
CREATE INDEX IF NOT EXISTS idx_rides_requested_at ON rides(requested_at);
CREATE INDEX IF NOT EXISTS idx_rides_pickup ON rides(pickup_lat, pickup_lng);
CREATE INDEX IF NOT EXISTS idx_bids_ride_id ON bids(ride_id);
