// services/busRouteService.js
const BusRoute = require('../models/BusRoute');
const mongoose = require('mongoose');
const BusStation = require('../models/BusStation'); 
const axios = require('axios');

// ======================================================================
// KHỐI 1: HÀM TIỆN ÍCH TÍNH ETA VÀ KHOẢNG CÁCH
// ======================================================================

const WALKING_SPEED_KPH = 5; 
const BUS_SPEED_KPH = 20; 
const FIXED_WAIT_TIME_MIN = 10; // Thời gian chờ cố định (phút)
const SEARCH_RADIUS_KM = 1; // ĐÃ THAY ĐỔI: Phạm vi tìm kiếm 1km
const OSRM_URL = 'https://router.project-osrm.org'; 
const TRANSFER_WALK_TIME = 5; // Thời gian đi bộ cố định giữa 2 trạm chuyển (5 phút)

/**
 * Tính khoảng cách Haversine giữa hai điểm (đơn vị: KM).
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

function calculateWalkingTime(distanceKm) {
    return (distanceKm / WALKING_SPEED_KPH) * 60; // Trả về phút
}

function calculateBusTravelTime(distanceKm) {
    return (distanceKm / BUS_SPEED_KPH) * 60; // Trả về phút
}

function calculateRouteSegmentTime(startStation, endStation) {
    if (!startStation || !endStation) return 0;
    
    const [lon1, lat1] = startStation.location?.coordinates || [0, 0];
    const [lon2, lat2] = endStation.location?.coordinates || [0, 0];
    
    if (lon1 === 0 && lat1 === 0 && lon2 === 0 && lat2 === 0) return 1;
    
    const dist = haversineDistance(lat1, lon1, lat2, lon2);
    return calculateBusTravelTime(dist);
}

function getStationOrder(route, searchStationId) {
    if (!searchStationId) return -1;
    const searchIdString = searchStationId.toString();

    const stationEntry = route.stations.find(s => {
        let currentIdString;
        
        if (s.stationId && s.stationId._id) {
            currentIdString = s.stationId._id.toString();
        } 
        else if (s.stationId) {
            currentIdString = s.stationId.toString();
        } else {
            return false;
        }

        return currentIdString === searchIdString;
    });

    return stationEntry ? stationEntry.order : -1; 
}

// ======================================================================
// KHỐI 2: BUSROUTESERVICE CLASS
// ======================================================================

class BusRouteService {
    
    // --- Các hàm CRUD và Populate (Giữ nguyên) ---

    async getAllRoutes() {
        return await BusRoute.find({})
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location')
            .sort({ createdAt: -1 });
    }

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

    async createRoute(routeData) {
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

    async deleteRoute(id) {
        const route = await BusRoute.findByIdAndDelete(id);
        if (!route) {
            throw new Error('Không tìm thấy tuyến xe để xóa');
        }
        return { message: 'Xóa tuyến xe thành công' };
    }
    
    // --- KHỐI REAL PATHS (OSRM) (Giữ nguyên) ---

    async getRealRoutePathById(id) {
        const route = await this.getRouteById(id);
        const path = route.routePath;

        if (!path || !path.coordinates || path.coordinates.length < 2) {
            return {
                routeId: route._id, 
                routeName: route.routeName, 
                path: path?.coordinates || []
            };
        }

        try {
            // OSRM cần format Lng,Lat;Lng,Lat...
            const waypoints = path.coordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
            const osrmUrl = `${OSRM_URL}/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
            
            console.log(`🔄 Fetching real path for route ${route.routeName}...`);
            const response = await axios.get(osrmUrl, { timeout: 5000 });
            const data = response.data;
            
            if (data.code === 'Ok' && data.routes && data.routes[0]) {
                console.log(`✅ Successfully fetched real path for ${route.routeName}`);
                return {
                    routeId: route._id, 
                    routeName: route.routeName, 
                    path: data.routes[0].geometry.coordinates // OSRM trả về LineString GeoJSON [Lng, Lat]
                };
            } else {
                console.warn(`⚠️ OSRM returned no route for ${route.routeName}, using original path`);
                return {
                    routeId: route._id, 
                    routeName: route.routeName, 
                    path: path.coordinates
                };
            }
        } catch (error) {
            console.error(`❌ Error fetching OSRM route for ${route.routeName}:`, error.message);
            return {
                routeId: route._id, 
                routeName: route.routeName, 
                path: path.coordinates
            };
        }
    }

    async getRealRoutePaths() {
        const routes = await this.getAllRoutes();
        const promises = routes.map(route => this.getRealRoutePathById(route._id));
        return Promise.all(promises);
    }


    async findStationsNearLocation(lng, lat, radiusKm) {
        const stations = await BusStation.aggregate([ 
            {
                $geoNear: {
                    near: { type: "Point", coordinates: [lng, lat] }, // Lng, Lat
                    distanceField: "dist.calculated", 
                    maxDistance: radiusKm * 1000, 
                    spherical: true
                }
            }
        ]);
        // Trả về kết quả từ aggregate (có thêm trường dist.calculated)
        return stations.map(s => s); 
    }

    /**
     * Tìm các tuyến đi trực tiếp (0 lần chuyển)
     */
    findDirectRoutes(startStops, destStops, allRoutes) {
        const trips = [];
        
        for (const startStop of startStops) {
            for (const destStop of destStops) {
                for (const route of allRoutes) {
                    const routeId = route._id.toString();
                    const startStationId = startStop.station._id;
                    const destStationId = destStop.station._id;

                    const startOrder = getStationOrder(route, startStationId);
                    const destOrder = getStationOrder(route, destStationId);
                    
                    if (startOrder !== -1 && destOrder !== -1 && destOrder > startOrder) {
                        
                        const walkingTime1 = calculateWalkingTime(startStop.distance);
                        const waitTime1 = FIXED_WAIT_TIME_MIN; 
                        
                        const busTravelTime = calculateRouteSegmentTime(startStop.station, destStop.station);
                        
                        const walkingTime2 = calculateWalkingTime(destStop.distance);

                        const finalTotalTime = walkingTime1 + waitTime1 + busTravelTime + walkingTime2;

                        trips.push({
                            type: 'Direct (0 lần chuyển)',
                            routeSegments: [
                                {
                                    routeId: routeId,
                                    routeName: route.routeName,
                                    time: busTravelTime,
                                    transferCount: 0,
                                    onBoard: startStop.station.name, 
                                    offBoard: destStop.station.name, 
                                }
                            ],
                            totalTime: finalTotalTime,
                            description: `Đi bộ ${walkingTime1.toFixed(0)} phút, Chờ ${waitTime1.toFixed(0)} phút, Bus ${busTravelTime.toFixed(0)} phút, Đi bộ ${walkingTime2.toFixed(0)} phút`
                        });
                    }
                }
            }
        }
        return trips;
    }

    /**
     * Tìm các tuyến có chuyển (1 hoặc 2 lần chuyển)
     */
    findTransferRoutes(startStops, destStops, allRoutes, maxTransfers) {
        const trips = [];
        const maxSegments = maxTransfers + 1; 
        const TRANSFER_WALK_TIME = 5; 

        for (const startStop of startStops) {
            for (const destStop of destStops) {
                const startNode = startStop.station;
                const destNode = destStop.station;
                
                const queue = [];
                
                // --- Khởi tạo Segment 1: S_start -> S_transfer_1 ---
                for (const route1 of allRoutes) {
                    const order1 = getStationOrder(route1, startNode._id);
                    if (order1 !== -1) {
                        for (let i = order1 + 1; i < route1.stations.length; i++) {
                            const transferStation1Entry = route1.stations[i].stationId;
                            const transferStation1Node = transferStation1Entry; 
                            
                            if (!transferStation1Node || !transferStation1Node.name) continue;

                            // Bỏ qua nếu trạm chuyển là trạm đích
                            if (transferStation1Node._id.toString() === destNode._id.toString()) continue;

                            const segment1Time = calculateRouteSegmentTime(startNode, transferStation1Node); 
                            
                            queue.push({
                                currentStationNode: transferStation1Node,
                                routeSegments: [
                                    {
                                        routeId: route1._id.toString(),
                                        routeName: route1.routeName,
                                        time: segment1Time,
                                        onBoard: startNode.name, 
                                        offBoard: transferStation1Node.name, 
                                    }
                                ],
                                visitedRoutes: new Set([route1._id.toString()])
                            });
                        }
                    }
                }
                // ---------------------------------------------------

                while (queue.length > 0) {
                    const currentState = queue.shift();
                    const { currentStationNode, routeSegments, visitedRoutes } = currentState;
                    
                    const currentTransferCount = routeSegments.length - 1;
                    
                    // 1. Kiểm tra Kết Thúc (Kết nối S_transfer_N với S_dest)
                    const finalRouteCandidates = allRoutes.filter(r => 
                        !visitedRoutes.has(r._id.toString()) && 
                        getStationOrder(r, currentStationNode._id) !== -1 && 
                        getStationOrder(r, destNode._id) !== -1 && 
                        getStationOrder(r, destNode._id) > getStationOrder(r, currentStationNode._id)
                    );
                    
                    for (const finalRoute of finalRouteCandidates) {
                        const finalSegmentTime = calculateRouteSegmentTime(currentStationNode, destNode);
                        const numTransfers = currentTransferCount + 1;
                        
                        const fullSegments = [
                            ...routeSegments,
                            {
                                routeId: finalRoute._id.toString(),
                                routeName: finalRoute.routeName,
                                time: finalSegmentTime,
                                onBoard: currentStationNode.name, 
                                offBoard: destNode.name, 
                            }
                        ];
                        
                        // Chỉ thêm các tuyến chuyển hợp lệ ( <= maxTransfers)
                        if (numTransfers <= maxTransfers) { 
                            
                            // Tính Tổng Thời Gian
                            const walkingTime1 = calculateWalkingTime(startStop.distance); 
                            const walkingTime2 = calculateWalkingTime(destStop.distance);   
                            
                            // Tổng thời gian chờ
                            const totalWaitTime = FIXED_WAIT_TIME_MIN * (numTransfers + 1); 
                            
                            // Tổng thời gian đi bộ chuyển tuyến
                            const totalTransferWalkTime = TRANSFER_WALK_TIME * numTransfers;
                            const totalWalkTime = walkingTime1 + totalTransferWalkTime + walkingTime2;
                            
                            // Tổng thời gian Bus
                            const totalBusTime = fullSegments.reduce((sum, seg) => sum + seg.time, 0);

                            const totalTime = totalWalkTime + totalBusTime + totalWaitTime;
                            
                            // Xây dựng mô tả chi tiết
                            let description = `Đi bộ ${walkingTime1.toFixed(0)} phút, Chờ ${FIXED_WAIT_TIME_MIN.toFixed(0)} phút, Bus 1: ${fullSegments[0].time.toFixed(0)} phút`;
                            
                            if (numTransfers === 1) {
                                description += `, Đi bộ chuyển tuyến ${TRANSFER_WALK_TIME.toFixed(0)} phút, Chờ ${FIXED_WAIT_TIME_MIN.toFixed(0)} phút, Bus 2: ${fullSegments[1].time.toFixed(0)} phút, Đi bộ ${walkingTime2.toFixed(0)} phút.`;
                            } else if (numTransfers === 2) {
                                description += `, Đi bộ chuyển tuyến ${TRANSFER_WALK_TIME.toFixed(0)} phút, Chờ ${FIXED_WAIT_TIME_MIN.toFixed(0)} phút, Bus 2: ${fullSegments[1].time.toFixed(0)} phút`;
                                description += `, Đi bộ chuyển tuyến ${TRANSFER_WALK_TIME.toFixed(0)} phút, Chờ ${FIXED_WAIT_TIME_MIN.toFixed(0)} phút, Bus 3: ${fullSegments[2].time.toFixed(0)} phút, Đi bộ ${walkingTime2.toFixed(0)} phút.`;
                            }
                            
                            trips.push({
                                type: `${numTransfers} lần chuyển`,
                                routeSegments: fullSegments,
                                totalTime: totalTime,
                                description: description
                            });
                        }
                    }

                    // 2. Kiểm tra Tiếp Tục (Cho phép tìm kiếm sâu hơn nếu maxTransfers >= 2)
                    if (routeSegments.length < maxSegments && maxTransfers >= 2) { 
                        const routesForNextTransfer = allRoutes.filter(r => 
                            !visitedRoutes.has(r._id.toString()) && 
                            getStationOrder(r, currentStationNode._id) !== -1
                        );

                        for (const nextRoute of routesForNextTransfer) {
                            const order = getStationOrder(nextRoute, currentStationNode._id);
                            
                            for (let i = order + 1; i < nextRoute.stations.length; i++) {
                                const transferStation2Node = nextRoute.stations[i].stationId;
                                
                                if (!transferStation2Node || !transferStation2Node.name) continue;

                                // Bỏ qua nếu trạm chuyển là trạm đích
                                if (transferStation2Node._id.toString() === destNode._id.toString()) continue;

                                const nextSegmentTime = calculateRouteSegmentTime(currentStationNode, transferStation2Node);
                                
                                const nextSegments = [
                                    ...routeSegments,
                                    {
                                        routeId: nextRoute._id.toString(),
                                        routeName: nextRoute.routeName,
                                        time: nextSegmentTime,
                                        onBoard: currentStationNode.name, 
                                        offBoard: transferStation2Node.name, 
                                    }
                                ];

                                queue.push({
                                    currentStationNode: transferStation2Node,
                                    routeSegments: nextSegments,
                                    visitedRoutes: new Set([...visitedRoutes, nextRoute._id.toString()])
                                });
                            }
                        }
                    }
                }
            }
        }
        return trips;
    }


    /**
     * Phương thức chính: Tìm lộ trình tối ưu (0, 1, hoặc 2 lần chuyển)
     * ĐÃ SỬA ĐỔI: Thêm logic tìm kiếm tuyến 2 lần chuyển (nếu 0 và 1 lần chuyển không có).
     */
        async findOptimalTrip(startLocation, destinationLocation, startName, destinationName) {
        // [Lat, Lng]
        const [startLat, startLng] = startLocation;
        const [destLat, destLng] = destinationLocation;
        
        // findStationsNearLocation nhận (Lng, Lat)
        const nearStartStations = await this.findStationsNearLocation(startLng, startLat, SEARCH_RADIUS_KM);
        const nearDestStations = await this.findStationsNearLocation(destLng, destLat, SEARCH_RADIUS_KM);

        const allRoutes = await this.getAllRoutes(); 

        // --- KHỐI DEBUG BAN ĐẦU ---
        console.log('====================================================');
        console.log('--- PHÂN TÍCH KHỚP TUYẾN/TRẠM ĐẦU VÀ CUỐI (DEBUG) ---');
        console.log(`Điểm bắt đầu (${startName}): ${startLat}, ${startLng}`);
        console.log(`Điểm đến (${destinationName}): ${destLat}, ${destLng}`);
        
        // Phân tích Trạm Đi (Giữ nguyên)
        console.log(`\n[START] Tổng số trạm gần điểm đi: ${nearStartStations.length}`);
        nearStartStations.forEach((startStation, i) => {
            console.log(`  [START ${i}] ${startStation.name} (ID: ${startStation._id})`);
            
            const matchingRoutes = allRoutes.filter(route => getStationOrder(route, startStation._id) !== -1);
            if (matchingRoutes.length > 0) {
                console.log(`    => Khớp ${matchingRoutes.length} tuyến: [${matchingRoutes.map(r => r.routeName).join(', ')}]`);
            } else {
                console.log(`    => KHÔNG CÓ TUYẾN NÀO đi qua trạm này. (KIỂM TRA DỮ LIỆU CƠ SỞ DỮ LIỆU)`);
            }
        });

        // Phân tích Trạm Đến (Giữ nguyên)
        console.log(`\n[DEST] Tổng số trạm gần điểm đến: ${nearDestStations.length}`);
        nearDestStations.forEach((destStation, i) => {
            console.log(`  [DEST ${i}] ${destStation.name} (ID: ${destStation._id})`);
            
            const matchingRoutes = allRoutes.filter(route => getStationOrder(route, destStation._id) !== -1);
            if (matchingRoutes.length > 0) {
                console.log(`    => Khớp ${matchingRoutes.length} tuyến: [${matchingRoutes.map(r => r.routeName).join(', ')}]`);
            } else {
                console.log(`    => KHÔNG CÓ TUYẾN NÀO đi qua trạm này. (KIỂM TRA DỮ LIỆU CƠ SỞ DỮ LIỆU)`);
            }
        });
        console.log('====================================================');
        // END DEBUG

        if (nearStartStations.length === 0 || nearDestStations.length === 0) {
            return { trips: [], message: "Không tìm thấy trạm xe buýt gần điểm bắt đầu hoặc điểm đến." };
        }
        
        // Tính khoảng cách đi bộ từ điểm đầu/cuối đến trạm gần nhất
        const startStops = nearStartStations.map(s => {
            const stationLat = s.location.coordinates[1]; // Vĩ độ
            const stationLng = s.location.coordinates[0]; // Kinh độ
            
            return {
                station: s,
                distance: haversineDistance(startLat, startLng, stationLat, stationLng)
            }
        });

        const destStops = nearDestStations.map(s => {
            const stationLat = s.location.coordinates[1]; 
            const stationLng = s.location.coordinates[0]; 
            
            return {
                station: s,
                distance: haversineDistance(destLat, destLng, stationLat, stationLng)
            }
        });

        // ==========================================================
        // 0. Nối tuyến 0 lần (Direct Route)
        // ==========================================================
        let allTripOptions = [];

        const directTrips = this.findDirectRoutes(startStops, destStops, allRoutes);
        allTripOptions.push(...directTrips);
        
        if (allTripOptions.length > 0) {
            const sortedDirectTrips = allTripOptions
                .sort((a, b) => a.totalTime - b.totalTime) 
                .slice(0, 5);
                
            console.log(`\n================= KẾT QUẢ TÌM ĐƯỜNG =================`);
            console.log(`DEBUG: Tìm thấy ${sortedDirectTrips.length} tuyến trực tiếp.`);
            
            sortedDirectTrips.forEach((trip, index) => {
                const segment = trip.routeSegments[0];
                console.log(`[TRỰC TIẾP ${index + 1}] Tuyến: ${segment.routeName}, Lên: ${segment.onBoard}, Xuống: ${segment.offBoard}, Tổng TG: ${trip.totalTime.toFixed(0)} phút`);
            });

            console.log(`======================================================`);
            
            return {
                startLocation: { lat: startLat, lng: startLng, name: startName },
                destinationLocation: { lat: destLat, lng: destLng, name: destinationName },
                trips: sortedDirectTrips
            };
        }

        // ==========================================================
        // 1. TÌM TUYẾN 1 LẦN CHUYỂN
        // ==========================================================
        
        const oneTransferTrips = this.findTransferRoutes(startStops, destStops, allRoutes, 1);
        allTripOptions = [...oneTransferTrips];
        
        if (allTripOptions.length > 0) {
            // Sắp xếp và trả về kết quả 1 lần chuyển
            allTripOptions = allTripOptions
                .sort((a, b) => a.totalTime - b.totalTime) 
                .slice(0, 5); 
                
            console.log(`\n================= KẾT QUẢ TÌM ĐƯỜNG (CHUYỂN TUYẾN 1) =================`);
            console.log(`DEBUG: Không tìm thấy tuyến trực tiếp. Trả về ${allTripOptions.length} tuyến 1 lần chuyển.`);
            
            allTripOptions.forEach((t, index) => {
                const seg1 = t.routeSegments[0];
                const seg2 = t.routeSegments[1];
                const routeNameLog = `${seg1.routeName} (Lên: ${seg1.onBoard} -> Xuống: ${seg1.offBoard}) -> ${seg2.routeName} (Lên: ${seg2.onBoard} -> Xuống: ${seg2.offBoard})`;
                console.log(`[1 CHUYỂN ${index + 1}] Tuyến: ${routeNameLog} | Mô tả: ${t.description}, Tổng TG: ${t.totalTime.toFixed(0)} phút`);
            });
            
            console.log(`======================================================================`);

            return {
                startLocation: { lat: startLat, lng: startLng, name: startName },
                destinationLocation: { lat: destLat, lng: destLng, name: destinationName },
                trips: allTripOptions
            };
        }
        
        // ==========================================================
        // 2. TÌM TUYẾN 2 LẦN CHUYỂN
        // ==========================================================

        const twoTransferTrips = this.findTransferRoutes(startStops, destStops, allRoutes, 2);
        allTripOptions = [...twoTransferTrips];
        
        // Sắp xếp và làm sạch kết quả (2 lần chuyển)
        allTripOptions = allTripOptions
            .sort((a, b) => a.totalTime - b.totalTime) 
            .slice(0, 5); 
            
        console.log(`\n================= KẾT QUẢ TÌM ĐƯỜNG (CHUYỂN TUYẾN 2) =================`);
        console.log(`DEBUG: Không tìm thấy tuyến 0 hoặc 1 lần chuyển. Trả về ${allTripOptions.length} tuyến 2 lần chuyển.`);
        
        allTripOptions.forEach((t, index) => {
            const seg1 = t.routeSegments[0];
            const seg2 = t.routeSegments[1];
            const seg3 = t.routeSegments[2];
            
            // Xây dựng chuỗi log chi tiết cho 2 lần chuyển
            const routeNameLog = 
                `${seg1.routeName} (Lên: ${seg1.onBoard} -> Xuống: ${seg1.offBoard}) -> ` + 
                `${seg2.routeName} (Lên: ${seg2.onBoard} -> Xuống: ${seg2.offBoard}) -> ` +
                `${seg3.routeName} (Lên: ${seg3.onBoard} -> Xuống: ${seg3.offBoard})`;

            console.log(`[2 CHUYỂN ${index + 1}] Tuyến: ${routeNameLog} | Mô tả: ${t.description}, Tổng TG: ${t.totalTime.toFixed(0)} phút`);
        });
        
        console.log(`======================================================================`);

        return {
            startLocation: { lat: startLat, lng: destLng, name: startName },
            destinationLocation: { lat: destLat, lng: destLng, name: destinationName },
            trips: allTripOptions
        };
    }
}

module.exports = new BusRouteService();
