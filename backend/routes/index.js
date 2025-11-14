// ~/bus-admin-backend/routes/index.js
const express = require('express');
const router = express.Router();

// Import routes
const stationRoutes = require('./stationRoutes');
const routeRoutes = require('./routeRoutes');
const userRoutes = require('./userRoutes');

// Mount routes
router.use('/stations', stationRoutes);
router.use('/routes', routeRoutes);
router.use('/', userRoutes); // Auth routes: /api/auth/register, /api/auth/login, /api/users

module.exports = router;
