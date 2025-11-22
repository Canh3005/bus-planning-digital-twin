// routes/pathfindingRoutes.js
const express = require('express');
const router = express.Router();
const pathfindingController = require('../controllers/pathfindingController');

// POST /api/pathfinding/find-route - Tìm đường đi ngắn nhất
router.post('/find-route', pathfindingController.findRouteInMatrix.bind(pathfindingController));

// GET /api/pathfinding/nearest-station - Tìm trạm gần nhất
router.get('/nearest-station', pathfindingController.findNearestStation.bind(pathfindingController));

// GET /api/pathfinding/routes-by-station/:stationId - Tìm tuyến theo trạm
router.get('/routes-by-station/:stationId', pathfindingController.findRoutesByStation.bind(pathfindingController));

module.exports = router;
