// ~/bus-admin-backend/controllers/busStationController.js
const busStationService = require('../services/busStationService');

class BusStationController {
    /**
     * GET /api/stations - Lấy tất cả trạm xe
     */
    async getAllStations(req, res) {
        try {
            const stations = await busStationService.getAllStations();
            res.status(200).json(stations);
        } catch (err) {
            console.error("Lỗi khi lấy trạm xe:", err);
            res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
        }
    }

    /**
     * GET /api/stations/:id - Lấy trạm xe theo ID
     */
    async getStationById(req, res) {
        try {
            const station = await busStationService.getStationById(req.params.id);
            res.status(200).json(station);
        } catch (err) {
            console.error("Lỗi khi lấy trạm xe:", err);
            res.status(404).json({ error: err.message });
        }
    }

    /**
     * POST /api/stations - Tạo trạm xe mới
     */
    async createStation(req, res) {
        try {
            const station = await busStationService.createStation(req.body);
            res.status(201).json(station);
        } catch (err) {
            console.error("Lỗi khi tạo trạm xe:", err);
            res.status(400).json({ error: err.message });
        }
    }

    /**
     * PUT /api/stations/:id - Cập nhật trạm xe
     */
    async updateStation(req, res) {
        try {
            const station = await busStationService.updateStation(req.params.id, req.body);
            res.status(200).json(station);
        } catch (err) {
            console.error("Lỗi khi cập nhật trạm xe:", err);
            res.status(404).json({ error: err.message });
        }
    }

    /**
     * DELETE /api/stations/:id - Xóa trạm xe
     */
    async deleteStation(req, res) {
        try {
            const result = await busStationService.deleteStation(req.params.id);
            res.status(200).json(result);
        } catch (err) {
            console.error("Lỗi khi xóa trạm xe:", err);
            res.status(404).json({ error: err.message });
        }
    }
}

module.exports = new BusStationController();
