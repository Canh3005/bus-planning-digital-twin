// services/pathfindingService.js
const BusRoute = require('../models/BusRoute');
const BusStation = require('../models/BusStation');

class PathfindingService {
    /**
     * Tìm trạm gần nhất với tọa độ cho trước
     * @param {number} lat - Vĩ độ
     * @param {number} lon - Kinh độ
     * @param {number} maxDistance - Khoảng cách tối đa (meters), mặc định 1000m
     * @returns {Object} - Trạm gần nhất
     */
    async findNearestStation(lat, lon, maxDistance = 1000) {
        const stations = await BusStation.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lon, lat]
                    },
                    $maxDistance: maxDistance
                }
            }
        }).limit(1);

        if (stations.length === 0) {
            throw new Error(`Không tìm thấy trạm nào trong bán kính ${maxDistance}m`);
        }

        return stations[0];
    }

    /**
     * Tính khoảng cách giữa 2 điểm (Haversine formula)
     * @param {number} lat1 - Vĩ độ điểm 1
     * @param {number} lon1 - Kinh độ điểm 1
     * @param {number} lat2 - Vĩ độ điểm 2
     * @param {number} lon2 - Kinh độ điểm 2
     * @returns {number} - Khoảng cách (km)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Bán kính Trái Đất (km)
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Kiểm tra xem một trạm có nằm trên tuyến không
     * @param {string} stationId - ID của trạm
     * @param {Object} route - Tuyến xe buýt
     * @returns {number} - Thứ tự của trạm trên tuyến, -1 nếu không có
     */
    getStationOrderInRoute(stationId, route) {
        const stationIdStr = stationId.toString();
        
        // Kiểm tra trạm đầu
        if (route.startStationId._id.toString() === stationIdStr) {
            return 0;
        }
        
        // Kiểm tra trạm cuối
        if (route.endStationId._id.toString() === stationIdStr) {
            return route.stations.length + 1;
        }
        
        // Kiểm tra các trạm trung gian
        const stationIndex = route.stations.findIndex(
            s => (s.stationId._id || s.stationId).toString() === stationIdStr
        );
        
        return stationIndex >= 0 ? stationIndex + 1 : -1;
    }

    /**
     * Tìm tất cả các tuyến đi qua một trạm
     * @param {string} stationId - ID của trạm
     * @returns {Array} - Danh sách tuyến đi qua trạm
     */
    async findRoutesPassingThroughStation(stationId) {
        const routes = await BusRoute.find({
            $or: [
                { startStationId: stationId },
                { endStationId: stationId },
                { 'stations.stationId': stationId }
            ]
        })
        .populate('startStationId', 'name address location')
        .populate('endStationId', 'name address location')
        .populate('stations.stationId', 'name address location');

        return routes;
    }

    /**
     * Tìm đường đi ngắn nhất giữa 2 điểm, cho phép chuyển tuyến
     * @param {number} startLat - Vĩ độ điểm bắt đầu
     * @param {number} startLon - Kinh độ điểm bắt đầu
     * @param {number} endLat - Vĩ độ điểm đến
     * @param {number} endLon - Kinh độ điểm đến
     * @param {number} maxDistance - Khoảng cách tối đa tìm trạm (meters)
     * @returns {Object} - Thông tin đường đi
     */
    async findShortestPath(startLat, startLon, endLat, endLon, maxDistance = 1000) {
        // Bước 1: Tìm trạm gần điểm bắt đầu và điểm đến
        const startStation = this.findNearestStation(startLat, startLon, maxDistance);
        const endStation = this.findNearestStation(endLat, endLon, maxDistance);

        console.log(`Start station: ${startStation.name}, End station: ${endStation.name}`);

        if (startStation._id.toString() === endStation._id.toString()) {
            return {
                success: true,
                message: 'Điểm bắt đầu và điểm đến cùng một trạm',
                routes: [],
                totalDistance: 0,
                totalCost: 0,
                startStation,
                endStation
            };
        }
        console.log(1000000);
        // Bước 2: Lấy tất cả các tuyến
        const allRoutes = await BusRoute.find({})
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location');
        console.log(`Tổng số tuyến: ${allRoutes}`);

        // Bước 3: Tìm đường đi trực tiếp (1 tuyến)
        const directPath = this.findDirectPath(startStation, endStation, allRoutes);
        if (directPath) {
            return {
                success: true,
                message: 'Tìm thấy đường đi trực tiếp',
                paths: [directPath],
                startStation,
                endStation
            };
        }

        // Bước 4: Tìm đường đi với 1 lần chuyển tuyến (2 tuyến)
        const transferPaths = this.findPathsWithOneTransfer(startStation, endStation, allRoutes);
        if (transferPaths.length > 0) {
            // Sắp xếp theo tổng chi phí
            transferPaths.sort((a, b) => a.totalCost - b.totalCost);
            
            return {
                success: true,
                message: `Tìm thấy ${transferPaths.length} đường đi với 1 lần chuyển tuyến`,
                paths: transferPaths.slice(0, 3), // Trả về tối đa 3 đường đi tốt nhất
                startStation,
                endStation
            };
        }

        // Không tìm thấy đường đi
        return {
            success: false,
            message: 'Không tìm thấy đường đi phù hợp',
            paths: [],
            startStation,
            endStation
        };
    }

    /**
     * Tìm đường đi trực tiếp (chỉ 1 tuyến)
     */
    findDirectPath(startStation, endStation, allRoutes) {
        for (const route of allRoutes) {
            const startOrder = this.getStationOrderInRoute(startStation._id, route);
            const endOrder = this.getStationOrderInRoute(endStation._id, route);
            console.log(`Kiểm tra tuyến ${route.routeName}: startOrder=${startOrder}, endOrder=${endOrder}`);

            // Kiểm tra xem cả 2 trạm có nằm trên cùng tuyến và theo đúng thứ tự không
            if (startOrder >= 0 && endOrder >= 0 && startOrder < endOrder) {
                const distance = this.calculateRouteDistance(route, startOrder, endOrder);
                
                return {
                    routes: [{
                        route: route,
                        boardStation: startStation,
                        alightStation: endStation,
                        distance: distance
                    }],
                    totalDistance: distance,
                    totalCost: route.ticketPrice || 7000,
                    transfers: 0
                };
            }
        }
        return null;
    }

    /**
     * Tìm đường đi với 1 lần chuyển tuyến
     */
    findPathsWithOneTransfer(startStation, endStation, allRoutes) {
        const paths = [];

        // Tìm các tuyến đi qua startStation
        const routesFromStart = allRoutes.filter(route => 
            this.getStationOrderInRoute(startStation._id, route) >= 0
        );

        // Tìm các tuyến đi qua endStation
        const routesToEnd = allRoutes.filter(route => 
            this.getStationOrderInRoute(endStation._id, route) >= 0
        );

        // Tìm điểm chuyển tuyến
        for (const route1 of routesFromStart) {
            const startOrder1 = this.getStationOrderInRoute(startStation._id, route1);
            
            // Lấy tất cả các trạm sau startStation trên route1
            const stationsAfterStart = this.getStationsInRoute(route1, startOrder1);

            for (const transferStation of stationsAfterStart) {
                for (const route2 of routesToEnd) {
                    // Bỏ qua nếu cùng tuyến
                    if (route1._id.toString() === route2._id.toString()) continue;

                    const transferOrder2 = this.getStationOrderInRoute(transferStation._id, route2);
                    const endOrder2 = this.getStationOrderInRoute(endStation._id, route2);

                    // Kiểm tra xem transferStation có nằm trước endStation trên route2 không
                    if (transferOrder2 >= 0 && endOrder2 >= 0 && transferOrder2 < endOrder2) {
                        const transferOrder1 = this.getStationOrderInRoute(transferStation._id, route1);
                        
                        const distance1 = this.calculateRouteDistance(route1, startOrder1, transferOrder1);
                        const distance2 = this.calculateRouteDistance(route2, transferOrder2, endOrder2);
                        
                        paths.push({
                            routes: [
                                {
                                    route: route1,
                                    boardStation: startStation,
                                    alightStation: transferStation,
                                    distance: distance1
                                },
                                {
                                    route: route2,
                                    boardStation: transferStation,
                                    alightStation: endStation,
                                    distance: distance2
                                }
                            ],
                            totalDistance: distance1 + distance2,
                            totalCost: (route1.ticketPrice || 7000) + (route2.ticketPrice || 7000),
                            transfers: 1,
                            transferStation: transferStation
                        });
                    }
                }
            }
        }

        return paths;
    }

    /**
     * Lấy danh sách các trạm trong tuyến từ vị trí startOrder trở đi
     */
    getStationsInRoute(route, startOrder) {
        const stations = [];
        const maxOrder = route.stations.length + 1;

        for (let i = startOrder + 1; i <= maxOrder; i++) {
            if (i === 0) {
                stations.push(route.startStationId);
            } else if (i === maxOrder) {
                stations.push(route.endStationId);
            } else if (i > 0 && i <= route.stations.length) {
                const station = route.stations.find(s => s.order === i);
                if (station && station.stationId) {
                    stations.push(station.stationId);
                }
            }
        }

        return stations;
    }

    /**
     * Tính khoảng cách đi được trên một tuyến từ startOrder đến endOrder
     */
    calculateRouteDistance(route, startOrder, endOrder) {
        // Đơn giản hóa: tính khoảng cách thẳng giữa 2 trạm
        let startCoords, endCoords;

        // Lấy tọa độ trạm bắt đầu
        if (startOrder === 0) {
            startCoords = route.startStationId.location.coordinates;
        } else if (startOrder > 0 && startOrder <= route.stations.length) {
            const station = route.stations.find(s => s.order === startOrder);
            startCoords = station?.stationId?.location?.coordinates;
        }

        // Lấy tọa độ trạm kết thúc
        if (endOrder === route.stations.length + 1) {
            endCoords = route.endStationId.location.coordinates;
        } else if (endOrder > 0 && endOrder <= route.stations.length) {
            const station = route.stations.find(s => s.order === endOrder);
            endCoords = station?.stationId?.location?.coordinates;
        }

        if (!startCoords || !endCoords) {
            return 0;
        }

        return this.calculateDistance(
            startCoords[1], startCoords[0],
            endCoords[1], endCoords[0]
        );
    }

    /**
     * Tìm đường đi ngắn nhất sử dụng thuật toán Dijkstra trên đồ thị có hướng
     * @param {number} startLat - Vĩ độ điểm bắt đầu
     * @param {number} startLon - Kinh độ điểm bắt đầu
     * @param {number} endLat - Vĩ độ điểm đến
     * @param {number} endLon - Kinh độ điểm đến
     * @param {number} maxDistance - Khoảng cách tối đa tìm trạm (meters)
     * @returns {Object} - Thông tin đường đi
     */
    async findShortestPathInMatrix(startLat, startLon, endLat, endLon, maxDistance = 1000) {
        const startTime = Date.now();
        console.log('🔍 Sử dụng thuật toán Dijkstra để tìm đường đi...');

        // Bước 1: Tìm trạm gần điểm bắt đầu và điểm đến
        const stationFindStart = Date.now();
        const startStation = await this.findNearestStation(startLat, startLon, maxDistance);
        const endStation = await this.findNearestStation(endLat, endLon, maxDistance);
        console.log(`⏱️ Tìm trạm: ${Date.now() - stationFindStart}ms`);

        console.log(`📍 Start station: ${startStation.name}, End station: ${endStation.name}`);

        if (startStation._id.toString() === endStation._id.toString()) {
            return {
                success: true,
                message: 'Điểm bắt đầu và điểm đến cùng một trạm',
                paths: [],
                totalDistance: 0,
                totalCost: 0,
                startStation,
                endStation
            };
        }

        // Bước 2: Lấy tất cả các tuyến và xây dựng đồ thị
        const routeFetchStart = Date.now();
        const allRoutes = await BusRoute.find({})
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location');
        console.log(`⏱️ Load routes: ${Date.now() - routeFetchStart}ms`);
        console.log(`🚌 Tổng số tuyến: ${allRoutes.length}`);

        // Bước 3: Xây dựng station map và đồ thị có hướng
        const graphBuildStart = Date.now();
        const stationMap = this.buildStationMap(allRoutes);
        const graph = this.buildDirectedGraph(allRoutes);
        console.log(`⏱️ Xây dựng đồ thị: ${Date.now() - graphBuildStart}ms`);
        console.log(`🗺️ Đồ thị có ${Object.keys(graph).length} nodes, ${Object.keys(stationMap).length} stations`);

        // Bước 4: Chạy Dijkstra với min-heap tối ưu
        const dijkstraStart = Date.now();
        const result = this.dijkstraOptimized(graph, startStation._id.toString(), endStation._id.toString());
        console.log(`⏱️ Dijkstra: ${Date.now() - dijkstraStart}ms`);

        if (!result.found) {
            console.log(`⏱️ Tổng thời gian: ${Date.now() - startTime}ms`);
            return {
                success: false,
                message: 'Không tìm thấy đường đi phù hợp',
                paths: [],
                startStation,
                endStation
            };
        }

        // Bước 5: Xây dựng lại đường đi từ kết quả Dijkstra
        const reconstructStart = Date.now();
        const path = this.reconstructPathOptimized(result.path, result.routeUsed, stationMap, allRoutes);
        console.log(`⏱️ Reconstruct path: ${Date.now() - reconstructStart}ms`);
        console.log(`⏱️ Tổng thời gian: ${Date.now() - startTime}ms`);

        return {
            success: true,
            message: `Tìm thấy đường đi với ${result.transfers} lần chuyển tuyến`,
            paths: [path],
            startStation,
            endStation,
            algorithm: 'Dijkstra-Optimized'
        };
    }

    /**
     * Xây dựng station map để truy xuất nhanh O(1)
     */
    buildStationMap(allRoutes) {
        const stationMap = new Map();

        for (const route of allRoutes) {
            const addToMap = (station) => {
                if (station && station._id) {
                    const id = station._id.toString();
                    if (!stationMap.has(id)) {
                        stationMap.set(id, station);
                    }
                }
            };

            addToMap(route.startStationId);
            addToMap(route.endStationId);
            
            if (route.stations) {
                for (const s of route.stations) {
                    addToMap(s.stationId);
                }
            }
        }

        return stationMap;
    }

    /**
     * Xây dựng đồ thị có hướng từ danh sách các tuyến (tối ưu bộ nhớ)
     * Graph structure: { stationId: [ { toStation, distance, routeId } ] }
     */
    buildDirectedGraph(allRoutes) {
        const graph = {};

        for (const route of allRoutes) {
            const orderedStations = this.getOrderedStations(route);
            const routeId = route._id.toString();
            const ticketPrice = route.ticketPrice || 7000;

            // Tạo các cạnh có hướng giữa các trạm liên tiếp
            for (let i = 0; i < orderedStations.length - 1; i++) {
                const fromStation = orderedStations[i];
                const toStation = orderedStations[i + 1];

                const fromId = fromStation._id.toString();
                const toId = toStation._id.toString();

                // Tính khoảng cách giữa 2 trạm liên tiếp
                const distance = this.calculateDistance(
                    fromStation.location.coordinates[1],
                    fromStation.location.coordinates[0],
                    toStation.location.coordinates[1],
                    toStation.location.coordinates[0]
                );

                // Thêm cạnh vào đồ thị (chỉ lưu thông tin cần thiết)
                if (!graph[fromId]) {
                    graph[fromId] = [];
                }

                graph[fromId].push({
                    toStation: toId,
                    distance: distance,
                    routeId: routeId,
                    ticketPrice: ticketPrice,
                    fromStationId: fromId,
                    toStationId: toId
                });
            }
        }

        return graph;
    }

    /**
     * Min-Heap implementation cho Priority Queue
     */
    createMinHeap() {
        const heap = [];
        const indexMap = new Map(); // Track vị trí của mỗi element

        const swap = (i, j) => {
            [heap[i], heap[j]] = [heap[j], heap[i]];
            indexMap.set(heap[i].stationId, i);
            indexMap.set(heap[j].stationId, j);
        };

        const bubbleUp = (index) => {
            while (index > 0) {
                const parentIndex = Math.floor((index - 1) / 2);
                if (heap[parentIndex].distance <= heap[index].distance) break;
                swap(parentIndex, index);
                index = parentIndex;
            }
        };

        const bubbleDown = (index) => {
            while (true) {
                let smallest = index;
                const leftChild = 2 * index + 1;
                const rightChild = 2 * index + 2;

                if (leftChild < heap.length && heap[leftChild].distance < heap[smallest].distance) {
                    smallest = leftChild;
                }
                if (rightChild < heap.length && heap[rightChild].distance < heap[smallest].distance) {
                    smallest = rightChild;
                }

                if (smallest === index) break;
                swap(index, smallest);
                index = smallest;
            }
        };

        return {
            push: (item) => {
                heap.push(item);
                indexMap.set(item.stationId, heap.length - 1);
                bubbleUp(heap.length - 1);
            },
            pop: () => {
                if (heap.length === 0) return null;
                const min = heap[0];
                const last = heap.pop();
                indexMap.delete(min.stationId);
                
                if (heap.length > 0) {
                    heap[0] = last;
                    indexMap.set(last.stationId, 0);
                    bubbleDown(0);
                }
                return min;
            },
            isEmpty: () => heap.length === 0,
            size: () => heap.length
        };
    }

    /**
     * Thuật toán Dijkstra tối ưu với min-heap
     */
    dijkstraOptimized(graph, startId, endId) {
        const distances = new Map();
        const previous = new Map();
        const routeUsed = new Map();
        const visited = new Set();
        const pq = this.createMinHeap();

        // Khởi tạo
        distances.set(startId, 0);
        pq.push({ stationId: startId, distance: 0 });

        while (!pq.isEmpty()) {
            const { stationId: currentId, distance: currentDist } = pq.pop();

            // Đã đến đích
            if (currentId === endId) {
                return {
                    found: true,
                    distance: distances.get(endId),
                    path: this.reconstructPathIds(previous, startId, endId),
                    routeUsed: routeUsed,
                    transfers: this.countTransfersOptimized(previous, routeUsed, startId, endId)
                };
            }

            // Đã visit node này rồi
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Không có cạnh đi từ node này
            if (!graph[currentId]) continue;

            // Duyệt các node kề
            for (const edge of graph[currentId]) {
                const { toStation, distance, routeId, ticketPrice } = edge;

                if (visited.has(toStation)) continue;

                const newDist = currentDist + distance;
                const currentBest = distances.get(toStation);

                // Tìm thấy đường đi ngắn hơn
                if (currentBest === undefined || newDist < currentBest) {
                    distances.set(toStation, newDist);
                    previous.set(toStation, currentId);
                    routeUsed.set(toStation, { routeId, ticketPrice, edge });
                    pq.push({ stationId: toStation, distance: newDist });
                }
            }
        }

        // Không tìm thấy đường đi
        return { found: false };
    }

    /**
     * Lấy danh sách các trạm theo thứ tự trên tuyến
     */
    getOrderedStations(route) {
        const stations = [];
        
        // Thêm trạm đầu
        stations.push(route.startStationId);

        // Thêm các trạm trung gian theo thứ tự
        if (route.stations && route.stations.length > 0) {
            const sortedStations = [...route.stations].sort((a, b) => a.order - b.order);
            for (const s of sortedStations) {
                if (s.stationId) {
                    stations.push(s.stationId);
                }
            }
        }

        // Thêm trạm cuối
        stations.push(route.endStationId);

        return stations;
    }

    /**
     * Thuật toán Dijkstra tìm đường đi ngắn nhất
     */
    dijkstra(graph, startId, endId, allRoutes) {
        const distances = {}; // Khoảng cách từ start đến mỗi node
        const previous = {}; // Node trước đó trong đường đi ngắn nhất
        const routeUsed = {}; // Tuyến đường được sử dụng để đến node
        const visited = new Set();
        const pq = []; // Priority queue (min-heap)

        // Khởi tạo
        distances[startId] = 0;
        pq.push({ stationId: startId, distance: 0 });

        while (pq.length > 0) {
            // Lấy node có khoảng cách nhỏ nhất (sort mỗi lần - có thể tối ưu bằng heap thực sự)
            pq.sort((a, b) => a.distance - b.distance);
            const { stationId: currentId, distance: currentDist } = pq.shift();

            // Đã đến đích
            if (currentId === endId) {
                return {
                    found: true,
                    distance: distances[endId],
                    path: this.reconstructPathIds(previous, startId, endId),
                    routeUsed: routeUsed,
                    transfers: this.countTransfers(previous, routeUsed, startId, endId)
                };
            }

            // Đã visit node này rồi
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Không có cạnh đi từ node này
            if (!graph[currentId]) continue;

            // Duyệt các node kề
            for (const edge of graph[currentId]) {
                const { toStation, distance, routeId, route } = edge;

                if (visited.has(toStation)) continue;

                const newDist = currentDist + distance;

                // Tìm thấy đường đi ngắn hơn
                if (distances[toStation] === undefined || newDist < distances[toStation]) {
                    distances[toStation] = newDist;
                    previous[toStation] = currentId;
                    routeUsed[toStation] = { routeId, route, edge };
                    pq.push({ stationId: toStation, distance: newDist });
                }
            }
        }

        // Không tìm thấy đường đi
        return { found: false };
    }

    /**
     * Xây dựng lại danh sách ID các trạm từ previous (tối ưu với Map)
     */
    reconstructPathIds(previous, startId, endId) {
        const path = [];
        let current = endId;

        while (current !== startId) {
            path.unshift(current);
            current = previous.get(current);
            if (!current) return []; // Không tìm thấy đường đi
        }

        path.unshift(startId);
        return path;
    }

    /**
     * Trích xuất phần của route giữa boardStation và alightStation
     */
    extractRouteSegment(route, boardStationId, alightStationId) {
        const boardOrder = this.getStationOrderInRoute(boardStationId, route);
        const alightOrder = this.getStationOrderInRoute(alightStationId, route);
        
        if (boardOrder === -1 || alightOrder === -1) {
            return {
                coordinates: [],
                stations: []
            };
        }
        
        // Lấy stations trong khoảng
        const segmentStations = [];
        const segmentCoordinates = [];
        for (const station of route.stations) {
            if (station.order >= boardOrder && station.order <= alightOrder) {
                segmentStations.push(station);
                segmentCoordinates.push(station.stationId.location.coordinates);
            }
        }
        
        return {
            coordinates: segmentCoordinates,
            stations: segmentStations
        };
    }

    /**
     * Đếm số lần chuyển tuyến (tối ưu với Map)
     */
    countTransfersOptimized(previous, routeUsed, startId, endId) {
        const path = this.reconstructPathIds(previous, startId, endId);
        if (path.length <= 1) return 0;

        let transfers = 0;
        let currentRouteId = null;

        for (let i = 1; i < path.length; i++) {
            const stationId = path[i];
            const usedRoute = routeUsed.get(stationId);

            if (usedRoute) {
                if (currentRouteId && currentRouteId !== usedRoute.routeId) {
                    transfers++;
                }
                currentRouteId = usedRoute.routeId;
            }
        }

        return transfers;
    }

    /**
     * Xây dựng lại đường đi chi tiết từ kết quả Dijkstra (tối ưu với stationMap)
     */
    reconstructPathOptimized(pathIds, routeUsed, stationMap, allRoutes) {
        if (pathIds.length <= 1) {
            return {
                routes: [],
                totalDistance: 0,
                totalCost: 0,
                transfers: 0
            };
        }

        // Tạo route map để truy xuất nhanh
        const routeMap = new Map();
        for (const route of allRoutes) {
            routeMap.set(route._id.toString(), route);
        }

        const segments = [];
        let currentRouteId = null;
        let boardStationId = null;
        let segmentDistance = 0;
        let totalCost = 0;

        for (let i = 1; i < pathIds.length; i++) {
            const stationId = pathIds[i];
            const usedRoute = routeUsed.get(stationId);

            if (!usedRoute) continue;

            const { routeId, ticketPrice, edge } = usedRoute;

            // Bắt đầu segment mới hoặc tiếp tục segment hiện tại
            if (currentRouteId === routeId) {
                // Cùng tuyến, tiếp tục
                segmentDistance += edge.distance;
            } else {
                // Chuyển tuyến hoặc segment đầu tiên
                if (currentRouteId !== null && boardStationId) {
                    // Lưu segment trước đó
                    const prevStationId = pathIds[i - 1];
                    const route = routeMap.get(currentRouteId);
                    const routeSegment = this.extractRouteSegment(route, boardStationId, prevStationId);
                    
                    segments.push({
                        routeId: currentRouteId,
                        routeName: route.routeName,
                        ticketPrice: route.ticketPrice,
                        coordinates: routeSegment.coordinates,
                        stations: routeSegment.stations,
                        boardStation: stationMap.get(boardStationId),
                        alightStation: stationMap.get(prevStationId),
                        distance: segmentDistance
                    });

                    totalCost += routeUsed.get(prevStationId).ticketPrice;
                }

                // Bắt đầu segment mới
                currentRouteId = routeId;
                boardStationId = edge.fromStationId;
                segmentDistance = edge.distance;
            }
        }

        // Thêm segment cuối cùng
        if (boardStationId && currentRouteId) {
            const lastStationId = pathIds[pathIds.length - 1];
            const route = routeMap.get(currentRouteId);
            const routeSegment = this.extractRouteSegment(route, boardStationId, lastStationId);

            segments.push({
                routeId: currentRouteId,
                routeName: route.routeName,
                ticketPrice: route.ticketPrice,
                coordinates: routeSegment.coordinates,
                stations: routeSegment.stations,
                boardStation: stationMap.get(boardStationId),
                alightStation: stationMap.get(lastStationId),
                distance: segmentDistance
            });

            totalCost += routeUsed.get(lastStationId).ticketPrice;
        }

        return {
            routes: segments,
            totalDistance: segments.reduce((sum, s) => sum + s.distance, 0),
            totalCost: totalCost,
            transfers: segments.length - 1
        };
    }
}

module.exports = new PathfindingService();
