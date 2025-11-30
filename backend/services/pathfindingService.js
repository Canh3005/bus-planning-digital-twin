// services/pathfindingService.js - RAPTOR Implementation (Full Version)
const BusRoute = require('../models/BusRoute');
const BusStation = require('../models/BusStation');

class PathfindingService {
    constructor() {
        // Cache cho preprocessing
        this.routesServingStop = new Map(); // Map<stopId, Set<routeId>>
        this.stopsOfRoute = new Map(); // Map<routeId, Array<station>>
        this.stopIndexInRoute = new Map(); // Map<routeId_stopId, index>
        this.footpathAdj = new Map(); // Map<stopId, Array<{toStop, walkTime}>>
        this.routeMap = new Map(); // Map<routeId, route>
        this.stationMap = new Map(); // Map<stationId, station>
        
        // Constants
        this.minTransferTime = 120; // 2 phút (seconds)
        this.maxWalkDistance = 500; // meters
        this.avgBusSpeed = 8.33; // m/s (30 km/h)
        this.walkSpeed = 1.4; // m/s (5 km/h)
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
        }).limit(5); // Lấy 5 trạm gần nhất để có lựa chọn

        if (stations.length === 0) {
            throw new Error(`Không tìm thấy trạm nào trong bán kính ${maxDistance}m`);
        }

        return stations;
    }

    /**
     * Tính khoảng cách Haversine (km)
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

        // Clear old data
        this.routesServingStop.clear();
        this.stopsOfRoute.clear();
        this.stopIndexInRoute.clear();
        this.footpathAdj.clear();
        this.routeMap.clear();
        this.stationMap.clear();

        // Build route map
        for (const route of allRoutes) {
            this.routeMap.set(route._id.toString(), route);
        }

        // Build RoutesServingStop, StopsOfRoute, StationMap
        for (const route of allRoutes) {
            const routeId = route._id.toString();
            const orderedStops = this.getOrderedStations(route);
            
            // StopsOfRoute[route]
            this.stopsOfRoute.set(routeId, orderedStops);

            // RoutesServingStop[stop] và StationMap
            orderedStops.forEach((stop, index) => {
                const stopId = stop._id.toString();
                
                // Add to station map
                if (!this.stationMap.has(stopId)) {
                    this.stationMap.set(stopId, stop);
                }

                // RoutesServingStop
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
        console.log(`📊 Stats:`);
        console.log(`   - ${this.stationMap.size} unique stops`);
        console.log(`   - ${allRoutes.length} routes`);
        console.log(`   - ${this.footpathAdj.size} stops with walking connections`);
    }

    /**
     * Xây dựng mạng đi bộ giữa các trạm gần nhau
     */
    async buildFootpathNetwork() {
        const allStops = Array.from(this.stationMap.values());
        let connectionCount = 0;
        
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
                    const walkTime = Math.ceil(distMeters / this.walkSpeed); // seconds
                    
                    footpaths.push({
                        toStop: stopB._id.toString(),
                        walkTime: walkTime,
                        distance: distMeters
                    });

                    // Bidirectional
                    const stopBId = stopB._id.toString();
                    if (!this.footpathAdj.has(stopBId)) {
                        this.footpathAdj.set(stopBId, []);
                    }
                    this.footpathAdj.get(stopBId).push({
                        toStop: stopAId,
                        walkTime: walkTime,
                        distance: distMeters
                    });

                    connectionCount += 2;
                }
            }

            if (footpaths.length > 0) {
                this.footpathAdj.set(stopAId, footpaths);
            }
        }

        console.log(`   - ${connectionCount} walking connections created`);
    }

    /**
     * MAIN ENTRY POINT: Tìm đường đi sử dụng RAPTOR
     */
    async findShortestPathRAPTOR(startLat, startLon, endLat, endLon, options = {}) {
        const {
            maxDistance = 1000,
            K = 4, // Max transfers + 1
            lambda = 300 // Penalty per transfer (seconds)
        } = options;

        const totalStart = Date.now();
        console.log('🚀 Starting RAPTOR algorithm...');
        console.log(`⚙️  Settings: K=${K}, lambda=${lambda}s, maxDistance=${maxDistance}m`);

        try {
            // 1. Tìm trạm gần điểm bắt đầu và kết thúc
            const startStations = await this.findNearestStation(startLat, startLon, maxDistance);
            const endStations = await this.findNearestStation(endLat, endLon, maxDistance);
            
            const startStation = startStations[0];
            const endStation = endStations[0];

            console.log(`📍 Start: ${startStation.name}`);
            console.log(`📍 End: ${endStation.name}`);

            // Check if same station
            if (startStation._id.toString() === endStation._id.toString()) {
                return {
                    success: true,
                    message: 'Điểm bắt đầu và điểm đến cùng một trạm',
                    paths: [],
                    startStation,
                    endStation,
                    computation_time: Date.now() - totalStart
                };
            }

            // 2. Load và preprocess routes
            const routeLoadStart = Date.now();
            const allRoutes = await BusRoute.find({})
                .populate('startStationId', 'name address location')
                .populate('endStationId', 'name address location')
                .populate('stations.stationId', 'name address location');

            console.log(`⏱️  Route loading: ${Date.now() - routeLoadStart}ms`);

            if (allRoutes.length === 0) {
                return {
                    success: false,
                    message: 'Không có tuyến xe buýt nào trong hệ thống',
                    paths: [],
                    startStation,
                    endStation,
                    computation_time: Date.now() - totalStart
                };
            }

            await this.preprocessRAPTOR(allRoutes);

            // 3. Run RAPTOR với multiple origin/destination
            const raptorStart = Date.now();
            const result = this.runRAPTOR(
                startStations.map(s => s._id.toString()),
                endStations.map(s => s._id.toString()),
                0, // t0
                K,
                lambda
            );
            console.log(`⏱️  RAPTOR execution: ${Date.now() - raptorStart}ms`);
            console.log(`⏱️  Total computation time: ${Date.now() - totalStart}ms`);

            if (!result.success) {
                return {
                    success: false,
                    message: 'Không tìm thấy đường đi phù hợp',
                    paths: [],
                    startStation,
                    endStation,
                    computation_time: Date.now() - totalStart
                };
            }

            return {
                success: true,
                message: `Tìm thấy ${result.paths.length} đường đi (Pareto-optimal)`,
                paths: result.paths,
                startStation,
                endStation,
                algorithm: 'RAPTOR',
                computation_time: Date.now() - totalStart,
                stats: result.stats
            };

        } catch (error) {
            console.error('❌ Error in findShortestPathRAPTOR:', error);
            throw error;
        }
    }

    /**
     * Core RAPTOR algorithm (Multi-origin, Multi-destination)
     */
    runRAPTOR(originStopIds, destStopIds, t0, K, lambda) {
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

        // Initialize multiple origins
        for (const originId of originStopIds) {
            arr[0].set(originId, t0);
            parent[0].set(originId, { type: 'ORIGIN' });
        }

        // Walking closure at round 0
        this.walkRelax(arr[0], parent[0]);

        let markedStops = new Set(
            allStopIds.filter(s => arr[0].get(s) < INF)
        );

        console.log(`🏁 Round 0: ${markedStops.size} stops reachable`);

        let totalRoutesScanned = 0;

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
            totalRoutesScanned += Qroutes.size;

            const newMarked = new Set();

            // Scan each route
            for (const routeId of Qroutes) {
                this.scanRoute(routeId, k, arr, parent, newMarked);
            }

            // Walking relaxation
            const addMarked = this.walkRelax(arr[k], parent[k]);
            addMarked.forEach(s => newMarked.add(s));

            markedStops = newMarked;
            console.log(`  ✅ Round ${k}: ${markedStops.size} stops improved`);

            if (markedStops.size === 0) {
                console.log(`  ⏹️  No improvements, stopping early at round ${k}`);
                break;
            }
        }

        // Extract Pareto-optimal paths for all destinations
        const allSolutions = [];
        
        for (const destId of destStopIds) {
            const solutions = this.extractParetoSolutions(arr, parent, destId, K, lambda);
            allSolutions.push(...solutions);
        }

        // Sort by score (arrival time + lambda * transfers)
        allSolutions.sort((a, b) => {
            const scoreA = a.arrivalTime + lambda * a.transfers;
            const scoreB = b.arrivalTime + lambda * b.transfers;
            return scoreA - scoreB;
        });

        // Remove duplicates and keep best 3
        const uniqueSolutions = this.removeDuplicatePaths(allSolutions);
        const topSolutions = uniqueSolutions.slice(0, 3);

        return {
            success: topSolutions.length > 0,
            paths: topSolutions,
            stats: {
                rounds_executed: Math.min(K, markedStops.size),
                routes_scanned: totalRoutesScanned,
                solutions_found: allSolutions.length,
                unique_solutions: uniqueSolutions.length
            }
        };
    }

    /**
     * Scan một route trong round k (Core RAPTOR operation)
     */
    scanRoute(routeId, k, arr, parent, newMarked) {
        const stops = this.stopsOfRoute.get(routeId);
        if (!stops || stops.length === 0) return;

        let boardedStopId = null;
        let boardedStopIndex = -1;
        let boardTime = null;

        for (let i = 0; i < stops.length; i++) {
            const stop = stops[i];
            const stopId = stop._id.toString();

            // Try to board at this stop
            if (boardedStopId === null) {
                const prevArrival = arr[k - 1].get(stopId);
                
                if (prevArrival !== undefined && prevArrival < Number.MAX_SAFE_INTEGER) {
                    const tReady = prevArrival + this.minTransferTime;
                    
                    // Can board here
                    boardedStopId = stopId;
                    boardedStopIndex = i;
                    boardTime = tReady;
                }
            } else {
                // Already boarded, calculate arrival at this stop
                const travelTime = this.estimateTravelTime(routeId, boardedStopIndex, i);
                const tArr = boardTime + travelTime;

                const currentBest = arr[k].get(stopId);
                
                if (tArr < currentBest) {
                    arr[k].set(stopId, tArr);
                    parent[k].set(stopId, {
                        type: 'RIDE',
                        routeId: routeId,
                        boardStop: boardedStopId,
                        boardIndex: boardedStopIndex,
                        alightStop: stopId,
                        alightIndex: i
                    });
                    newMarked.add(stopId);
                }
            }
        }
    }

    /**
     * Ước lượng thời gian di chuyển giữa 2 trạm trên cùng tuyến
     */
    estimateTravelTime(routeId, fromIndex, toIndex) {
        const stops = this.stopsOfRoute.get(routeId);
        
        if (!stops || fromIndex < 0 || toIndex >= stops.length || fromIndex >= toIndex) {
            return Number.MAX_SAFE_INTEGER;
        }

        // Calculate total distance
        let totalDist = 0;
        for (let i = fromIndex; i < toIndex; i++) {
            const s1 = stops[i];
            const s2 = stops[i + 1];
            
            const dist = this.calculateDistance(
                s1.location.coordinates[1], s1.location.coordinates[0],
                s2.location.coordinates[1], s2.location.coordinates[0]
            );
            totalDist += dist;
        }

        // Convert to time: distance(km) * 1000(m) / speed(m/s)
        const travelTime = Math.ceil((totalDist * 1000) / this.avgBusSpeed);
        
        // Add dwell time per stop (assume 30 seconds per stop)
        const numStops = toIndex - fromIndex;
        const dwellTime = numStops * 30;

        return travelTime + dwellTime;
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

        let processed = 0;
        while (queue.length > 0) {
            const u = queue.shift();
            processed++;
            
            const footpaths = this.footpathAdj.get(u);
            if (!footpaths) continue;

            for (const { toStop: v, walkTime } of footpaths) {
                const newTime = arrK.get(u) + walkTime;
                const currentBest = arrK.get(v);
                
                if (currentBest === undefined || newTime < currentBest) {
                    arrK.set(v, newTime);
                    parentK.set(v, {
                        type: 'WALK',
                        fromStop: u,
                        toStop: v
                    });
                    marked.add(v);
                    
                    if (!queue.includes(v)) {
                        queue.push(v);
                    }
                }
            }
        }

        return marked;
    }

    /**
     * Trích xuất các nghiệm Pareto-optimal
     */
    extractParetoSolutions(arr, parent, destStopId, K, lambda) {
        const solutions = [];
        const destArrival = [];

        // Collect all arrival times at destination
        for (let k = 0; k <= K; k++) {
            const arrTime = arr[k].get(destStopId);
            
            if (arrTime !== undefined && arrTime < Number.MAX_SAFE_INTEGER) {
                destArrival.push({ round: k, arrivalTime: arrTime });
            }
        }

        if (destArrival.length === 0) return solutions;

        // Sort by arrival time
        destArrival.sort((a, b) => a.arrivalTime - b.arrivalTime);

        // Extract Pareto-optimal solutions
        let minTransfers = Infinity;
        
        for (const { round: k, arrivalTime } of destArrival) {
            const transfers = Math.max(0, k - 1);
            
            // Pareto condition: improve either time or transfers
            const isParetoOptimal = 
                solutions.length === 0 ||
                arrivalTime < solutions[solutions.length - 1].arrivalTime ||
                transfers < minTransfers;

            if (isParetoOptimal) {
                const path = this.reconstructPath(parent, destStopId, k);
                
                if (path.routes.length > 0 || k === 0) {
                    solutions.push({
                        arrivalTime: arrivalTime,
                        transfers: transfers,
                        routes: path.routes,
                        totalDistance: path.totalDistance,
                        totalCost: path.totalCost,
                        score: arrivalTime + lambda * transfers,
                        travelTime: this.formatTime(arrivalTime)
                    });
                    
                    minTransfers = Math.min(minTransfers, transfers);
                }
            }
        }

        return solutions;
    }

    /**
     * Reconstruct path từ parent pointers
     */
    reconstructPath(parent, destStopId, k) {
        const segments = [];
        let currentStopId = destStopId;
        let currentRound = k;

        while (currentRound >= 0) {
            const p = parent[currentRound].get(currentStopId);
            
            if (!p || p.type === 'ORIGIN') break;

            if (p.type === 'RIDE') {
                const route = this.routeMap.get(p.routeId);
                const boardStation = this.stationMap.get(p.boardStop);
                const alightStation = this.stationMap.get(p.alightStop);
                
                const distance = this.calculateSegmentDistance(
                    boardStation,
                    alightStation
                );

                segments.unshift({
                    type: 'RIDE',
                    routeId: p.routeId,
                    routeName: route?.routeName || 'Unknown',
                    ticketPrice: route?.ticketPrice || 7000,
                    boardStation: boardStation,
                    alightStation: alightStation,
                    distance: distance,
                    travelTime: this.estimateTravelTime(p.routeId, p.boardIndex, p.alightIndex)
                });

                currentStopId = p.boardStop;
                currentRound--;
                
            } else if (p.type === 'WALK') {
                const fromStation = this.stationMap.get(p.fromStop);
                const toStation = this.stationMap.get(p.toStop);
                
                segments.unshift({
                    type: 'WALK',
                    fromStation: fromStation,
                    toStation: toStation,
                    distance: this.calculateSegmentDistance(fromStation, toStation)
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

    /**
     * Remove duplicate paths (same route sequence)
     */
    removeDuplicatePaths(solutions) {
        const seen = new Set();
        const unique = [];

        for (const sol of solutions) {
            const signature = sol.routes
                .map(r => r.routeId)
                .join('->');

            if (!seen.has(signature)) {
                seen.add(signature);
                unique.push(sol);
            }
        }

        return unique;
    }

    /**
     * Calculate distance between two stations
     */
    calculateSegmentDistance(station1, station2) {
        if (!station1 || !station2 || 
            !station1.location || !station2.location) {
            return 0;
        }
        
        return this.calculateDistance(
            station1.location.coordinates[1],
            station1.location.coordinates[0],
            station2.location.coordinates[1],
            station2.location.coordinates[0]
        );
    }

    /**
     * Get ordered stations of a route
     */
    getOrderedStations(route) {
        const stations = [];
        
        if (route.startStationId) {
            stations.push(route.startStationId);
        }

        if (route.stations && route.stations.length > 0) {
            const sorted = [...route.stations].sort((a, b) => a.order - b.order);
            for (const s of sorted) {
                if (s.stationId) {
                    stations.push(s.stationId);
                }
            }
        }

        if (route.endStationId) {
            stations.push(route.endStationId);
        }

        return stations;
    }

    /**
     * Format time (seconds) to readable string
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    // ==================== BACKWARD COMPATIBILITY ====================
    // Keep old methods for existing code that might use them

    /**
     * @deprecated Use findShortestPathRAPTOR instead
     */
    async findShortestPath(startLat, startLon, endLat, endLon, maxDistance = 1000) {
        console.warn('⚠️  findShortestPath is deprecated. Use findShortestPathRAPTOR instead.');
        return this.findShortestPathRAPTOR(startLat, startLon, endLat, endLon, { maxDistance });
    }

    /**
     * Helper: Tìm tất cả các tuyến đi qua một trạm
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
}

module.exports = new PathfindingService();
