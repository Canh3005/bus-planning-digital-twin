// services/busRouteService.js
const BusRoute = require('../models/BusRoute');

class BusRouteService {
    /**
     * Lấy tất cả tuyến xe
     */
    async getAllRoutes() {
        return await BusRoute.find({})
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location')
            .sort({ createdAt: -1 });
    }

    /**
     * Lấy tuyến xe theo ID
     */
    async getRouteById(id) {
        const route = await BusRoute.findById(id)
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location');
        
        if (!route) {
            throw new Error('Không tìm thấy tuyến xe');
        }
        return route;
    }

    /**
     * Tạo tuyến xe mới
     */
    async createRoute(routeData) {
        // Validate dữ liệu
        if (!routeData.routeName || !routeData.startStationId || !routeData.endStationId || !routeData.coordinates) {
            throw new Error('Thiếu thông tin bắt buộc: routeName, startStationId, endStationId, coordinates');
        }

        if (!Array.isArray(routeData.coordinates) || routeData.coordinates.length < 2) {
            throw new Error('Coordinates phải là mảng có ít nhất 2 điểm');
        }

        const route = new BusRoute({
            routeName: routeData.routeName,
            startStationId: routeData.startStationId,
            endStationId: routeData.endStationId,
            routePath: {
                type: 'LineString',
                coordinates: routeData.coordinates
            },
            operatingHours: routeData.operatingHours,
            ticketPrice: routeData.ticketPrice,
            description: routeData.description,
            stations: routeData.stations || []
        });

        const savedRoute = await route.save();
        
        // Populate để trả về thông tin đầy đủ
        return await BusRoute.findById(savedRoute._id)
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location');
    }

    /**
     * Cập nhật tuyến xe
     */
    async updateRoute(id, routeData) {
        const updateData = {
            routeName: routeData.routeName,
            startStationId: routeData.startStationId,
            endStationId: routeData.endStationId,
            operatingHours: routeData.operatingHours,
            ticketPrice: routeData.ticketPrice,
            description: routeData.description
        };

        if (routeData.coordinates && Array.isArray(routeData.coordinates)) {
            updateData.routePath = {
                type: 'LineString',
                coordinates: routeData.coordinates
            };
        }

        if (routeData.stations) {
            updateData.stations = routeData.stations;
        }

        const route = await BusRoute.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        )
        .populate('startStationId', 'name address location')
        .populate('endStationId', 'name address location')
        .populate('stations.stationId', 'name address location');

        if (!route) {
            throw new Error('Không tìm thấy tuyến xe để cập nhật');
        }
        return route;
    }

    /**
     * Xóa tuyến xe
     */
    async deleteRoute(id) {
        const route = await BusRoute.findByIdAndDelete(id);
        if (!route) {
            throw new Error('Không tìm thấy tuyến xe để xóa');
        }
        return { message: 'Xóa tuyến xe thành công' };
    }
}

module.exports = new BusRouteService();
