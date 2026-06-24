#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api/rides"
RIDE_ID=1
BID_1=1
BID_2=2

echo "Testing Race Condition: Simultaneous Bid Acceptance"
echo "Targeting Ride ID: $RIDE_ID with Bids $BID_1 and $BID_2"

# Run two requests in the background simultaneously
curl -X POST "$API_URL/$RIDE_ID/accept-bid" -H "Content-Type: application/json" -d "{\"bidId\": $BID_1}" &
PID1=$!

curl -X POST "$API_URL/$RIDE_ID/accept-bid" -H "Content-Type: application/json" -d "{\"bidId\": $BID_2}" &
PID2=$!

# Wait for both to complete
wait $PID1
wait $PID2

echo -e "\nVerification Complete. Only one request should have succeeded (success: true)."
echo "The other should have returned 'Ride already accepted or finished'."
