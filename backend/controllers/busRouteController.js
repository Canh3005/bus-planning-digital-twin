// ~/bus-admin-backend/controllers/busRouteController.js
const busRouteService = require('../services/busRouteService');

class BusRouteController {
    /**
     * GET /api/routes - Lấy tất cả tuyến xe
     */
    async getAllRoutes(req, res) {
        try {
            const routes = await busRouteService.getAllRoutes();
            res.status(200).json(routes);
        } catch (err) {
            console.error("Lỗi khi lấy tuyến xe:", err);
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }

    /**
     * GET /api/routes/:id - Lấy tuyến xe theo ID
     */
    async getRouteById(req, res) {
        try {
            const route = await busRouteService.getRouteById(req.params.id);
            res.status(200).json(route);
        } catch (err) {
            console.error("Lỗi khi lấy tuyến xe:", err);
            res.status(404).json({ error: err.message });
        }
    }

    /**
     * POST /api/routes - Tạo tuyến xe mới
     */
    async createRoute(req, res) {
        try {
            const route = await busRouteService.createRoute(req.body);
            res.status(201).json(route);
        } catch (err) {
            console.error("Lỗi khi tạo tuyến xe:", err);
            res.status(400).json({ error: err.message });
        }
    }

    /**
     * PUT /api/routes/:id - Cập nhật tuyến xe
     */
    async updateRoute(req, res) {
        try {
            const route = await busRouteService.updateRoute(req.params.id, req.body);
            res.status(200).json(route);
        } catch (err) {
            console.error("Lỗi khi cập nhật tuyến xe:", err);
            res.status(404).json({ error: err.message });
        }
    }

    /**
     * DELETE /api/routes/:id - Xóa tuyến xe
     */
    async deleteRoute(req, res) {
        try {
            const result = await busRouteService.deleteRoute(req.params.id);
            res.status(200).json(result);
        } catch (err) {
            console.error("Lỗi khi xóa tuyến xe:", err);
            res.status(404).json({ error: err.message });
        }
    }
}

module.exports = new BusRouteController();
