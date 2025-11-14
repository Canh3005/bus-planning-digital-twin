// ~/bus-admin-backend/routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const busRouteController = require('../controllers/busRouteController');

// GET /api/routes - Lấy tất cả tuyến xe
router.get('/', busRouteController.getAllRoutes.bind(busRouteController));

// GET /api/routes/:id - Lấy tuyến xe theo ID
router.get('/:id', busRouteController.getRouteById.bind(busRouteController));

// POST /api/routes - Tạo tuyến xe mới
router.post('/', busRouteController.createRoute.bind(busRouteController));

// PUT /api/routes/:id - Cập nhật tuyến xe
router.put('/:id', busRouteController.updateRoute.bind(busRouteController));

// DELETE /api/routes/:id - Xóa tuyến xe
router.delete('/:id', busRouteController.deleteRoute.bind(busRouteController));

module.exports = router;
