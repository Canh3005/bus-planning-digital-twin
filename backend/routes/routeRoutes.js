// ~/bus-admin-backend/routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const busRouteController = require('../controllers/busRouteController');

// IMPORTANT: Specific routes MUST come before parameterized routes
// GET /api/routes/real-paths - Lấy tuyến xe với đường đi thật từ OSRM
router.get('/real-paths', busRouteController.getRealRoutePaths.bind(busRouteController));

// GET /api/routes - Lấy tất cả tuyến xe
router.get('/', busRouteController.getAllRoutes.bind(busRouteController));

// GET /api/routes/:id - Lấy tuyến xe theo ID
router.get('/:id', busRouteController.getRouteById.bind(busRouteController));

// GET /api/routes/:id/real-path - Lấy đường đi thật cho một route cụ thể (MUST be after /:id)
router.get('/:id/real-path', busRouteController.getRealRoutePathById.bind(busRouteController));

// POST /api/routes - Tạo tuyến xe mới
router.post('/', busRouteController.createRoute.bind(busRouteController));

// PUT /api/routes/:id - Cập nhật tuyến xe
router.put('/:id', busRouteController.updateRoute.bind(busRouteController));

// DELETE /api/routes/:id - Xóa tuyến xe
router.delete('/:id', busRouteController.deleteRoute.bind(busRouteController));

module.exports = router;
