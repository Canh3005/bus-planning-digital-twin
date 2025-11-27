// services/busRouteService.js
const BusRoute = require('../models/BusRoute');
const axios = require('axios');

class BusRouteService {
    /**
     * Tìm kiếm tuyến xe theo từ khóa
     */
    async searchRoutes(searchText) {
        const searchRegex = { $regex: searchText.trim(), $options: 'i' };
        
        const routes = await BusRoute.find({
            $or: [
                { routeName: searchRegex },
                { description: searchRegex }
            ]
        })
        .populate('startStationId', 'name address location')
        .populate('endStationId', 'name address location')
        .populate('stations.stationId', 'name address location')
        .sort({ routeName: 1 });
        
        return routes;
    }

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

    /**
     * Lấy đường đi thật từ OSRM API cho một route cụ thể
     */
    async getRealRoutePathById(id) {
        const route = await this.getRouteById(id);
        const path = route.routePath;

        // Nếu không có path hoặc ít hơn 2 điểm, trả về route gốc
        if (!path || !path.coordinates || path.coordinates.length < 2) {
            return {
                ...route.toObject(),
                realPath: path?.coordinates || []
            };
        }

        try {
            // Tạo waypoints từ coordinates [lng, lat]
            const waypoints = path.coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
            
            console.log(`🔄 Fetching real path for route ${route.routeName}...`);
            const response = await axios.get(osrmUrl, { timeout: 5000 });
            const data = response.data;
            
            if (data.code === 'Ok' && data.routes && data.routes[0]) {
                console.log(`✅ Successfully fetched real path for ${route.routeName}`);
                return {
                    ...route.toObject(),
                    realPath: data.routes[0].geometry.coordinates
                };
            } else {
                console.warn(`⚠️ OSRM returned no route for ${route.routeName}, using original path`);
                return {
                    ...route.toObject(),
                    realPath: path.coordinates
                };
            }
        } catch (error) {
            console.error(`❌ Error fetching OSRM route for ${route.routeName}:`, error.message);
            // Fallback to original path
            return {
                ...route.toObject(),
                realPath: path.coordinates
            };
        }
    }

    /**
     * Lấy đường đi thật từ OSRM API (deprecated - dùng getRealRoutePathById thay thế)
     */
    async getRealRoutePaths() {
        const routes = await this.getAllRoutes();
        const routesWithRealPaths = [];

        for (const route of routes) {
            const path = route.routePath;
            if (!path || !path.coordinates || path.coordinates.length < 2) {
                routesWithRealPaths.push({
                    ...route.toObject(),
                    realPath: path?.coordinates || []
                });
                continue;
            }

            try {
                // Tạo waypoints từ coordinates [lng, lat]
                const waypoints = path.coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
                
                const response = await axios.get(osrmUrl);
                const data = response.data;
                
                if (data.code === 'Ok' && data.routes && data.routes[0]) {
                    routesWithRealPaths.push({
                        ...route.toObject(),
                        realPath: data.routes[0].geometry.coordinates
                    });
                } else {
                    console.warn(`⚠️ OSRM returned no route for ${route.routeName}, using original path`);
                    // Fallback to original path
                    routesWithRealPaths.push({
                        ...route.toObject(),
                        realPath: path.coordinates
                    });
                }
            } catch (error) {
                console.error(`❌ Error fetching OSRM route for ${route.routeName}:`, error.message);
                // Fallback to original path
                routesWithRealPaths.push({
                    ...route.toObject(),
                    realPath: path.coordinates
                });
            }
        }

        return routesWithRealPaths;
    }
}

module.exports = new BusRouteService();
