// services/pathfindingService.js - RAPTOR Implementation
const BusRoute = require('../models/BusRoute');
const BusStation = require('../models/BusStation');

class PathfindingService {
    constructor() {
        // Cache cho preprocessing
        this.routesServingStop = new Map();
        this.stopsOfRoute = new Map();
        this.stopIndexInRoute = new Map();
        this.footpathAdj = new Map();
        this.minTransferTime = 120; // 2 phút (seconds)
        this.maxWalkDistance = 500; // meters
    }

    /**
     * Tìm trạm gần nhất với tọa độ cho trước
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
     * Tính khoảng cách Haversine
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // km
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
     * PREPROCESSING: Xây dựng cấu trúc dữ liệu RAPTOR
     */
    async preprocessRAPTOR(allRoutes) {
        console.log('🔧 Preprocessing RAPTOR structures...');
        const startTime = Date.now();

        this.routesServingStop.clear();
        this.stopsOfRoute.clear();
        this.stopIndexInRoute.clear();
        this.footpathAdj.clear();

        // Build RoutesServingStop và StopsOfRoute
        for (const route of allRoutes) {
            const routeId = route._id.toString();
            const orderedStops = this.getOrderedStations(route);
            
            // StopsOfRoute[route]
            this.stopsOfRoute.set(routeId, orderedStops);

            // RoutesServingStop[stop]
            orderedStops.forEach((stop, index) => {
                const stopId = stop._id.toString();
                
                if (!this.routesServingStop.has(stopId)) {
                    this.routesServingStop.set(stopId, new Set());
                }
                this.routesServingStop.get(stopId).add(routeId);

                // StopIndexInRoute
                const key = `${routeId}_${stopId}`;
                this.stopIndexInRoute.set(key, index);
            });
        }

        // Build FootpathAdj (walking connections between nearby stops)
        await this.buildFootpathNetwork();

        console.log(`✅ Preprocessing done in ${Date.now() - startTime}ms`);
        console.log(`📊 Stats: ${this.routesServingStop.size} stops, ${allRoutes.length} routes`);
    }

    /**
     * Xây dựng mạng đi bộ giữa các trạm gần nhau
     */
    async buildFootpathNetwork() {
        const allStops = await BusStation.find({});
        
        for (let i = 0; i < allStops.length; i++) {
            const stopA = allStops[i];
            const stopAId = stopA._id.toString();
            const coordsA = stopA.location.coordinates;

            const footpaths = [];

            for (let j = i + 1; j < allStops.length; j++) {
                const stopB = allStops[j];
                const coordsB = stopB.location.coordinates;

                const distKm = this.calculateDistance(
                    coordsA[1], coordsA[0],
                    coordsB[1], coordsB[0]
                );
                const distMeters = distKm * 1000;

                if (distMeters <= this.maxWalkDistance) {
                    const walkTime = Math.ceil(distMeters / 1.4); // 1.4 m/s walking speed
                    footpaths.push({
                        toStop: stopB._id.toString(),
                        walkTime: walkTime
                    });

                    // Bidirectional
                    const stopBId = stopB._id.toString();
                    if (!this.footpathAdj.has(stopBId)) {
                        this.footpathAdj.set(stopBId, []);
                    }
                    this.footpathAdj.get(stopBId).push({
                        toStop: stopAId,
                        walkTime: walkTime
                    });
                }
            }

            if (footpaths.length > 0) {
                this.footpathAdj.set(stopAId, footpaths);
            }
        }
    }

    /**
     * RAPTOR MAIN ALGORITHM
     */
    async findShortestPathRAPTOR(startLat, startLon, endLat, endLon, maxDistance = 1000, K = 4) {
        const totalStart = Date.now();
        console.log('🚀 Starting RAPTOR algorithm...');

        // 1. Tìm trạm gần điểm bắt đầu và kết thúc
        const startStation = await this.findNearestStation(startLat, startLon, maxDistance);
        const endStation = await this.findNearestStation(endLat, endLon, maxDistance);
        
        console.log(`📍 Start: ${startStation.name}, End: ${endStation.name}`);

        if (startStation._id.toString() === endStation._id.toString()) {
            return {
                success: true,
                message: 'Điểm bắt đầu và điểm đến cùng một trạm',
                paths: [],
                startStation,
                endStation
            };
        }

        // 2. Load và preprocess routes
        const allRoutes = await BusRoute.find({})
            .populate('startStationId', 'name address location')
            .populate('endStationId', 'name address location')
            .populate('stations.stationId', 'name address location');

        await this.preprocessRAPTOR(allRoutes);

        // 3. Run RAPTOR
        const t0 = 0; // Thời điểm bắt đầu (có thể customize)
        const result = this.runRAPTOR(
            startStation._id.toString(),
            endStation._id.toString(),
            t0,
            K,
            allRoutes
        );

        console.log(`⏱️ Total time: ${Date.now() - totalStart}ms`);

        if (!result.success) {
            return {
                success: false,
                message: 'Không tìm thấy đường đi phù hợp',
                paths: [],
                startStation,
                endStation
            };
        }

        return {
            success: true,
            message: `Tìm thấy ${result.paths.length} đường đi (Pareto optimal)`,
            paths: result.paths,
            startStation,
            endStation,
            algorithm: 'RAPTOR'
        };
    }

    /**
     * Core RAPTOR algorithm
     */
    runRAPTOR(originStopId, destStopId, t0, K, allRoutes) {
        const INF = Number.MAX_SAFE_INTEGER;
        
        // arr[k][s] = earliest arrival at stop s with k rides
        const arr = Array(K + 1).fill(null).map(() => new Map());
        const parent = Array(K + 1).fill(null).map(() => new Map());

        // Initialize all stops to INF
        const allStopIds = Array.from(this.routesServingStop.keys());
        for (const s of allStopIds) {
            arr[0].set(s, INF);
            parent[0].set(s, null);
        }

        // Origin
        arr[0].set(originStopId, t0);
        parent[0].set(originStopId, { type: 'ORIGIN' });

        // Walking closure at round 0
        this.walkRelax(arr[0], parent[0]);

        let markedStops = new Set(
            allStopIds.filter(s => arr[0].get(s) < INF)
        );

        console.log(`🏁 Round 0: ${markedStops.size} stops marked`);

        // Main RAPTOR loop
        for (let k = 1; k <= K; k++) {
            console.log(`🔄 Round ${k}...`);

            // Copy previous round
            for (const s of allStopIds) {
                arr[k].set(s, arr[k - 1].get(s));
                parent[k].set(s, parent[k - 1].get(s));
            }

            // Collect routes to scan
            const Qroutes = new Set();
            for (const s of markedStops) {
                const routes = this.routesServingStop.get(s);
                if (routes) {
                    routes.forEach(r => Qroutes.add(r));
                }
            }

            console.log(`  📋 Scanning ${Qroutes.size} routes`);

            const newMarked = new Set();

            // Scan each route
            for (const routeId of Qroutes) {
                this.scanRoute(routeId, k, arr, parent, allRoutes, newMarked);
            }

            // Walking relaxation
            const addMarked = this.walkRelax(arr[k], parent[k]);
            addMarked.forEach(s => newMarked.add(s));

            markedStops = newMarked;
            console.log(`  ✅ Round ${k}: ${markedStops.size} stops improved`);

            if (markedStops.size === 0) {
                console.log(`  ⏹️ No improvements, stopping at round ${k}`);
                break;
            }
        }

        // Extract Pareto-optimal paths
        return this.extractParetoSolutions(arr, parent, destStopId, K, allRoutes);
    }

    /**
     * Scan một route trong round k
     */
    scanRoute(routeId, k, arr, parent, allRoutes, newMarked) {
        const route = allRoutes.find(r => r._id.toString() === routeId);
        if (!route) return;

        const stops = this.stopsOfRoute.get(routeId);
        if (!stops || stops.length === 0) return;

        let boardedStopId = null;
        let boardTime = null;

        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            const stopId = stop._id.toString();

            // Try to board at this stop
            if (boardedStopId === null) {
                const tReady = arr[k - 1].get(stopId) + this.minTransferTime;
                
                if (tReady < Number.MAX_SAFE_INTEGER) {
                    // Can board here
                    boardedStopId = stopId;
                    boardTime = tReady;
                }
            } else {
                // Already boarded, calculate arrival at this stop
                const travelTime = this.estimateTravelTime(route, boardedStopId, stopId);
                const tArr = boardTime + travelTime;

                if (tArr < arr[k].get(stopId)) {
                    arr[k].set(stopId, tArr);
                    parent[k].set(stopId, {
                        type: 'RIDE',
                        routeId: routeId,
                        boardStop: boardedStopId,
                        alightStop: stopId
                    });
                    newMarked.add(stopId);
                }
            }
        }
    }

    /**
     * Ước lượng thời gian di chuyển giữa 2 trạm trên cùng tuyến
     */
    estimateTravelTime(route, fromStopId, toStopId) {
        const stops = this.stopsOfRoute.get(route._id.toString());
        const fromIdx = stops.findIndex(s => s._id.toString() === fromStopId);
        const toIdx = stops.findIndex(s => s._id.toString() === toStopId);

        if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) {
            return Number.MAX_SAFE_INTEGER;
        }

        // Simple estimation: distance / average speed (30 km/h = 8.33 m/s)
        let totalDist = 0;
        for (let i = fromIdx; i < toIdx; i++) {
            const s1 = stops[i];
            const s2 = stops[i + 1];
            const dist = this.calculateDistance(
                s1.location.coordinates[1], s1.location.coordinates[0],
                s2.location.coordinates[1], s2.location.coordinates[0]
            );
            totalDist += dist;
        }

        const avgSpeed = 8.33; // m/s
        return Math.ceil((totalDist * 1000) / avgSpeed); // seconds
    }

    /**
     * Walking relaxation (Footpath connections)
     */
    walkRelax(arrK, parentK) {
        const marked = new Set();
        const queue = [];

        // Initialize queue với các stop đã có arrival time
        for (const [stopId, time] of arrK.entries()) {
            if (time < Number.MAX_SAFE_INTEGER) {
                queue.push(stopId);
            }
        }

        while (queue.length > 0) {
            const u = queue.shift();
            const footpaths = this.footpathAdj.get(u);

            if (!footpaths) continue;

            for (const { toStop: v, walkTime } of footpaths) {
                const newTime = arrK.get(u) + walkTime;
                
                if (newTime < arrK.get(v)) {
                    arrK.set(v, newTime);
                    parentK.set(v, {
                        type: 'WALK',
                        fromStop: u
                    });
                    marked.add(v);
                    queue.push(v);
                }
            }
        }

        return marked;
    }

    /**
     * Trích xuất các nghiệm Pareto-optimal
     */
    extractParetoSolutions(arr, parent, destStopId, K, allRoutes) {
        const solutions = [];

        for (let k = 0; k <= K; k++) {
            const arrTime = arr[k].get(destStopId);
            
            if (arrTime === undefined || arrTime === Number.MAX_SAFE_INTEGER) {
                continue;
            }

            // Check if Pareto-improving
            const isParetoOptimal = solutions.every(sol => 
                sol.arrivalTime < arrTime || sol.transfers < k - 1
            );

            if (isParetoOptimal || solutions.length === 0) {
                const path = this.reconstructPath(parent, destStopId, k, allRoutes);
                
                solutions.push({
                    arrivalTime: arrTime,
                    transfers: Math.max(0, k - 1),
                    routes: path.routes,
                    totalDistance: path.totalDistance,
                    totalCost: path.totalCost
                });
            }
        }

        return {
            success: solutions.length > 0,
            paths: solutions
        };
    }

    /**
     * Reconstruct path từ parent pointers
     */
    reconstructPath(parent, destStopId, k, allRoutes) {
        const segments = [];
        let currentStopId = destStopId;
        let currentRound = k;

        const stationMap = this.buildStationMapFromRoutes(allRoutes);

        while (currentRound > 0) {
            const p = parent[currentRound].get(currentStopId);
            
            if (!p || p.type === 'ORIGIN') break;

            if (p.type === 'RIDE') {
                const route = allRoutes.find(r => r._id.toString() === p.routeId);
                
                segments.unshift({
                    type: 'RIDE',
                    routeId: p.routeId,
                    routeName: route?.routeName || 'Unknown',
                    ticketPrice: route?.ticketPrice || 7000,
                    boardStation: stationMap.get(p.boardStop),
                    alightStation: stationMap.get(p.alightStop),
                    distance: this.calculateSegmentDistance(
                        stationMap.get(p.boardStop),
                        stationMap.get(p.alightStop)
                    )
                });

                currentStopId = p.boardStop;
                currentRound--;
            } else if (p.type === 'WALK') {
                segments.unshift({
                    type: 'WALK',
                    fromStation: stationMap.get(p.fromStop),
                    toStation: stationMap.get(currentStopId),
                    distance: this.calculateSegmentDistance(
                        stationMap.get(p.fromStop),
                        stationMap.get(currentStopId)
                    )
                });

                currentStopId = p.fromStop;
            }
        }

        const rideSegments = segments.filter(s => s.type === 'RIDE');
        
        return {
            routes: rideSegments,
            totalDistance: segments.reduce((sum, s) => sum + (s.distance || 0), 0),
            totalCost: rideSegments.reduce((sum, s) => sum + (s.ticketPrice || 0), 0)
        };
    }

    calculateSegmentDistance(station1, station2) {
        if (!station1 || !station2) return 0;
        
        return this.calculateDistance(
            station1.location.coordinates[1],
            station1.location.coordinates[0],
            station2.location.coordinates[1],
            station2.location.coordinates[0]
        );
    }

    buildStationMapFromRoutes(allRoutes) {
        const map = new Map();
        
        for (const route of allRoutes) {
            if (route.startStationId) {
                map.set(route.startStationId._id.toString(), route.startStationId);
            }
            if (route.endStationId) {
                map.set(route.endStationId._id.toString(), route.endStationId);
            }
            if (route.stations) {
                for (const s of route.stations) {
                    if (s.stationId) {
                        map.set(s.stationId._id.toString(), s.stationId);
                    }
                }
            }
        }
        
        return map;
    }

    getOrderedStations(route) {
        const stations = [];
        
        stations.push(route.startStationId);

        if (route.stations && route.stations.length > 0) {
            const sorted = [...route.stations].sort((a, b) => a.order - b.order);
            for (const s of sorted) {
                if (s.stationId) {
                    stations.push(s.stationId);
                }
            }
        }

        stations.push(route.endStationId);

        return stations;
    }
}

module.exports = new PathfindingService();
