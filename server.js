const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const otpRoutes = require('./routes/otp');

const app = express();
const PORT = process.env.PORT || 3000;
const LIVE_URL = process.env.LIVE_URL || 'https://welcoming-mindfulness-production-539a.up.railway.app';

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Response logger
app.use((req, res, next) => {
  const start = Date.now();
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`, JSON.stringify(body));
    return originalJson(body);
  };
  next();
});

// Limit each IP to 10 OTP requests per 15 minutes
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime() });
});

app.use('/api/otp', otpLimiter, otpRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`RideApp OTP API running on port ${PORT}`);
  console.log(`Live URL: ${LIVE_URL}`);
});
