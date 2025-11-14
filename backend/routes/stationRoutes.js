// ~/bus-admin-backend/routes/stationRoutes.js
const express = require('express');
const router = express.Router();
const busStationController = require('../controllers/busStationController');

// GET /api/stations - Lấy tất cả trạm xe
router.get('/', busStationController.getAllStations.bind(busStationController));

// GET /api/stations/:id - Lấy trạm xe theo ID
router.get('/:id', busStationController.getStationById.bind(busStationController));

// POST /api/stations - Tạo trạm xe mới
router.post('/', busStationController.createStation.bind(busStationController));

// PUT /api/stations/:id - Cập nhật trạm xe
router.put('/:id', busStationController.updateStation.bind(busStationController));

// DELETE /api/stations/:id - Xóa trạm xe
router.delete('/:id', busStationController.deleteStation.bind(busStationController));

module.exports = router;
