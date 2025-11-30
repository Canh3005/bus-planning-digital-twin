// controllers/pathfindingController.js
const pathfindingService = require('../services/pathfindingService');

class PathfindingController {
    /**
     * Tìm đường đi ngắn nhất giữa 2 tọa độ
     * POST /api/pathfinding/find-route
     * Body: { startLat, startLon, endLat, endLon, maxDistance? }
     */
    async findRoute(req, res) {
        try {
            const { startLat, startLon, endLat, endLon, maxDistance } = req.body;

            // Validate input
            if (!startLat || !startLon || !endLat || !endLon) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin: startLat, startLon, endLat, endLon'
                });
            }

            // Validate coordinates
            if (Math.abs(startLat) > 90 || Math.abs(endLat) > 90) {
                return res.status(400).json({
                    success: false,
                    message: 'Vĩ độ phải nằm trong khoảng -90 đến 90'
                });
            }

            if (Math.abs(startLon) > 180 || Math.abs(endLon) > 180) {
                return res.status(400).json({
                    success: false,
                    message: 'Kinh độ phải nằm trong khoảng -180 đến 180'
                });
            }

            const result = await pathfindingService.findShortestPath(
                parseFloat(startLat),
                parseFloat(startLon),
                parseFloat(endLat),
                parseFloat(endLon),
                maxDistance ? parseInt(maxDistance) : 1000
            );

            if (!result.success) {
                return res.status(200).json(result);
            }

            return res.status(200).json(result);
        } catch (error) {
            console.error('Error in findRoute:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Lỗi khi tìm đường đi',
                error: error.toString()
            });
        }
    }

    async findRouteInMatrix(req, res) {
        try {
            const { startLat, startLon, endLat, endLon, maxDistance } = req.body;
            const result = await pathfindingService.findShortestPathRAPTOR(
                parseFloat(startLat),
                parseFloat(startLon),
                parseFloat(endLat),
                parseFloat(endLon),
                maxDistance ? parseInt(maxDistance) : 1000
            );
            return res.status(200).json(result);
        } catch (error) {
            console.error('Error in findRouteInMatrix:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Lỗi khi tìm đường đi trong ma trận',
                error: error.toString()
            });
        }   
    }

    /**
     * Tìm trạm gần nhất với tọa độ
     * GET /api/pathfinding/nearest-station?lat=...&lon=...&maxDistance=...
     */
    async findNearestStation(req, res) {
        try {
            const { lat, lon, maxDistance } = req.query;

            if (!lat || !lon) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin: lat, lon'
                });
            }

            const station = await pathfindingService.findNearestStation(
                parseFloat(lat),
                parseFloat(lon),
                maxDistance ? parseInt(maxDistance) : 1000
            );

            return res.status(200).json({
                success: true,
                station
            });
        } catch (error) {
            console.error('Error in findNearestStation:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Lỗi khi tìm trạm gần nhất',
                error: error.toString()
            });
        }
    }

    /**
     * Tìm tất cả tuyến đi qua một trạm
     * GET /api/pathfinding/routes-by-station/:stationId
     */
    async findRoutesByStation(req, res) {
        try {
            const { stationId } = req.params;

            if (!stationId) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu stationId'
                });
            }

            const routes = await pathfindingService.findRoutesPassingThroughStation(stationId);

            return res.status(200).json({
                success: true,
                count: routes.length,
                routes
            });
        } catch (error) {
            console.error('Error in findRoutesByStation:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Lỗi khi tìm tuyến theo trạm',
                error: error.toString()
            });
        }
    }
}

module.exports = new PathfindingController();
