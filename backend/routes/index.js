// ~/bus-admin-backend/routes/index.js
const express = require('express');
const router = express.Router();

// Import routes
const stationRoutes = require('./stationRoutes');
const routeRoutes = require('./routeRoutes');
const userRoutes = require('./userRoutes');
const pathfindingRoutes = require('./pathfindingRoutes');
const paymentRoutes = require('./paymentRoutes');
const revenueRoutes = require('./revenueRoutes');

// Mount routes
router.use('/stations', stationRoutes);
router.use('/routes', routeRoutes);
router.use('/pathfinding', pathfindingRoutes);
router.use('/payment', paymentRoutes);
router.use('/', userRoutes); // Auth routes: /api/auth/register, /api/auth/login, /api/users
router.use('/revenue', revenueRoutes);

module.exports = router;
