const BusRoute = require('../models/BusRoute');
const BusStation = require('../models/BusStation');

class PathfindingService {
    constructor() {
        // --- CẤU TRÚC CACHE (Lưu trong RAM để chạy nhanh) ---
        this.routesServingStop = new Map(); // stopId -> Set<routeId>
        this.stopsOfRoute = new Map();      // routeId -> [danh sách trạm object]
        this.stopIndexInRoute = new Map();  // routeId_stopId -> số thứ tự trạm
        this.footpathAdj = new Map();       // stopId -> danh sách các trạm đi bộ được
        this.routeMap = new Map();          // routeId -> object tuyến đầy đủ
        this.stationMap = new Map();        // stationId -> object trạm đầy đủ
        
        // --- CACHE THỜI GIAN & LỊCH TRÌNH ---
        // Map này lưu dữ liệu đã tính toán sẵn: 
        // routeId -> { startSeconds, endSeconds, frequency, stopsOffset: [0, 120, 300...] }
        this.routeTimeData = new Map();

        // --- HẰNG SỐ CẤU HÌNH ---
        this.minTransferTime = 120; // Thời gian tối thiểu để đổi chuyến (giây)
        this.maxWalkDistance = 500; // Khoảng cách đi bộ tối đa để chuyển trạm (mét)
        this.avgBusSpeed = 8.33;    // Tốc độ xe buýt trung bình ~30 km/h (m/s)
        this.walkSpeed = 1.4;       // Tốc độ đi bộ trung bình ~5 km/h (m/s)
        
        // --- GIÁ TRỊ MẶC ĐỊNH (FALLBACK) ---
        // Dùng khi Database chưa có dữ liệu thời gian
        this.DEFAULT_START_TIME = "05:00";
        this.DEFAULT_END_TIME = "22:00";   
        this.DEFAULT_FREQUENCY = 900;      // 15 phút (900 giây)
    }

    // ==========================================
    // 1. CÁC HÀM TIỆN ÍCH (HELPER)
    // ==========================================

    /** Đổi giờ "HH:mm" sang tổng số giây từ nửa đêm */
    timeStringToSeconds(timeStr) {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 3600 + minutes * 60;
    }

    /** Đổi giây sang format hiển thị "HH:mm:ss" */
    formatTime(seconds) {
        if (seconds == null) return "--:--";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        // const s = seconds % 60; // Có thể ẩn giây nếu muốn gọn
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }

    /** Lấy giây hiện tại từ object Date */
    getMidnightSeconds(dateObj) {
        return dateObj.getHours() * 3600 + dateObj.getMinutes() * 60 + dateObj.getSeconds();
    }

    /** Tính khoảng cách giữa 2 điểm GPS (Haversine formula) */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const toRad = (deg) => deg * (Math.PI / 180);
        const R = 6371; // Bán kính trái đất (km)
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /** Tìm trạm gần nhất trong bán kính cho phép */
    async findNearestStation(lat, lon, maxDistance = 1000) {
        const stations = await BusStation.find({
            location: {
                $near: {
                    $geometry: { type: 'Point', coordinates: [lon, lat] },
                    $maxDistance: maxDistance
                }
            }
        }).limit(5); // Lấy 5 trạm gần nhất để có nhiều phương án
        
        if (stations.length === 0) throw new Error(`Không tìm thấy trạm nào trong bán kính ${maxDistance}m`);
        return stations;
    }

    // ==========================================
    // 2. PREPROCESSING (XỬ LÝ DỮ LIỆU ĐẦU VÀO)
    // ==========================================

    async preprocessRAPTOR(allRoutes) {
        console.log('🔧 Đang xử lý dữ liệu tuyến & lịch trình...');
        const startTime = Date.now();

        // Xóa cache cũ
        this.routesServingStop.clear();
        this.stopsOfRoute.clear();
        this.stopIndexInRoute.clear();
        this.routeMap.clear();
        this.stationMap.clear();
        this.routeTimeData.clear();
        this.footpathAdj.clear();

        for (const route of allRoutes) {
            const routeId = route._id.toString();
            this.routeMap.set(routeId, route);

            // --- A. Xây dựng bản đồ tuyến/trạm ---
            const orderedStops = this.getOrderedStations(route);
            this.stopsOfRoute.set(routeId, orderedStops);

            orderedStops.forEach((stop, index) => {
                const stopId = stop._id.toString();
                if (!this.stationMap.has(stopId)) this.stationMap.set(stopId, stop);
                
                if (!this.routesServingStop.has(stopId)) this.routesServingStop.set(stopId, new Set());
                this.routesServingStop.get(stopId).add(routeId);

                this.stopIndexInRoute.set(`${routeId}_${stopId}`, index);
            });

            // --- B. Xử lý thời gian (Quan trọng) ---
            // Nếu DB thiếu dữ liệu, dùng giá trị mặc định (Fallback)
            const startStr = route.startTime || this.DEFAULT_START_TIME;
            const endStr = route.endTime || this.DEFAULT_END_TIME;
            const frequency = route.frequency || this.DEFAULT_FREQUENCY;

            const startSeconds = this.timeStringToSeconds(startStr);
            const endSeconds = this.timeStringToSeconds(endStr);

            // Tính toán thời gian lăn bánh (Offset) từ bến đầu tiên đến các trạm
            const stopsOffset = [];
            let currentRunTime = 0;

            for (let i = 0; i < orderedStops.length; i++) {
                if (i > 0) {
                    const prev = orderedStops[i - 1];
                    const curr = orderedStops[i];
                    
                    const distKm = this.calculateDistance(
                        prev.location.coordinates[1], prev.location.coordinates[0],
                        curr.location.coordinates[1], curr.location.coordinates[0]
                    );
                    
                    // Thời gian chạy = (Quãng đường / Vận tốc) + 20 giây đón trả khách
                    const legTime = Math.ceil((distKm * 1000) / this.avgBusSpeed) + 20;
                    currentRunTime += legTime;
                }
                stopsOffset.push(currentRunTime);
            }

            // Lưu vào cache
            this.routeTimeData.set(routeId, {
                startSeconds,
                endSeconds,
                frequency,
                stopsOffset // Mảng giây: [0, 150, 400, ...] thể hiện thời gian xe tới từng trạm tính từ lúc xuất bến
            });
        }

        // --- C. Xây dựng mạng lưới đi bộ ---
        await this.buildFootpathNetwork();

        console.log(`✅ Preprocessing hoàn tất trong ${Date.now() - startTime}ms`);
    }

    async buildFootpathNetwork() {
        const allStops = Array.from(this.stationMap.values());
        
        for (let i = 0; i < allStops.length; i++) {
            const stopA = allStops[i];
            const stopAId = stopA._id.toString();
            const footpaths = [];

            for (let j = i + 1; j < allStops.length; j++) {
                const stopB = allStops[j];
                const distKm = this.calculateDistance(
                    stopA.location.coordinates[1], stopA.location.coordinates[0],
                    stopB.location.coordinates[1], stopB.location.coordinates[0]
                );
                const distMeters = distKm * 1000;

                // Nếu khoảng cách < giới hạn cho phép đi bộ
                if (distMeters <= this.maxWalkDistance) {
                    const walkTime = Math.ceil(distMeters / this.walkSpeed);
                    
                    // Tạo cạnh nối 2 chiều A <-> B
                    footpaths.push({ toStop: stopB._id.toString(), walkTime, distance: distMeters });
                    
                    const stopBId = stopB._id.toString();
                    if (!this.footpathAdj.has(stopBId)) this.footpathAdj.set(stopBId, []);
                    this.footpathAdj.get(stopBId).push({ toStop: stopAId, walkTime, distance: distMeters });
                }
            }
            if (footpaths.length > 0) this.footpathAdj.set(stopAId, footpaths);
        }
    }

    // ==========================================
    // 3. MAIN ENTRY POINT (API GỌI VÀO ĐÂY)
    // ==========================================

    async findShortestPathRAPTOR(startLat, startLon, endLat, endLon, options = {}) {
        const {
            maxDistance = 1000,
            K = 4,                   // Số lần đổi tuyến tối đa
            lambda = 600,            // Điểm phạt cho mỗi lần đổi chuyến (để ưu tiên ít đổi xe)
            startTime = new Date()   // Thời gian người dùng bắt đầu tìm
        } = options;

        try {
            // 1. Tìm trạm GPS
            const startStations = await this.findNearestStation(startLat, startLon, maxDistance);
            const endStations = await this.findNearestStation(endLat, endLon, maxDistance);
            
            // 2. Load dữ liệu (Thực tế nên cache việc này lúc khởi động server)
            const allRoutes = await BusRoute.find({})
                .populate('startStationId')
                .populate('endStationId')
                .populate('stations.stationId');
            
            if (allRoutes.length === 0) return { success: false, message: 'Hệ thống chưa có dữ liệu tuyến xe.' };

            // 3. Chạy Preprocessing
            await this.preprocessRAPTOR(allRoutes);

            // 4. Chạy thuật toán RAPTOR
            const t0 = this.getMidnightSeconds(startTime); // Đổi giờ hiện tại ra giây
            
            const result = this.runRAPTOR(
                startStations.map(s => s._id.toString()),
                endStations.map(s => s._id.toString()),
                t0,
                K,
                lambda
            );

            return {
                success: result.success,
                paths: result.paths, // Kết quả đã bao gồm toạ độ cắt ngắn để vẽ bản đồ
                startStation: startStations[0],
                endStation: endStations[0],
                computation_time: result.stats?.computation_time
            };

        } catch (error) {
            console.error('Lỗi trong RAPTOR service:', error);
            throw error;
        }
    }

    // ==========================================
    // 4. THUẬT TOÁN RAPTOR (CORE LOGIC)
    // ==========================================

    runRAPTOR(originStopIds, destStopIds, t0, K, lambda) {
        const INF = Number.MAX_SAFE_INTEGER;
        // arr[k] lưu thời gian đến sớm nhất tại các trạm sau k chuyến xe
        const arr = Array(K + 1).fill(null).map(() => new Map());
        // parent[k] lưu vết để truy ngược đường đi
        const parent = Array(K + 1).fill(null).map(() => new Map());

        // Khởi tạo
        const allStopIds = Array.from(this.routesServingStop.keys());
        allStopIds.forEach(s => arr[0].set(s, INF));

        originStopIds.forEach(id => {
            arr[0].set(id, t0);
            parent[0].set(id, { type: 'ORIGIN' });
        });

        // Đi bộ ở vòng 0 (từ điểm xuất phát có thể đi bộ sang trạm khác)
        this.walkRelax(arr[0], parent[0]);
        let markedStops = new Set(allStopIds.filter(s => arr[0].get(s) < INF));

        // Vòng lặp chính (Mỗi vòng k là thêm 1 chuyến xe)
        for (let k = 1; k <= K; k++) {
            // Copy dữ liệu vòng trước
            allStopIds.forEach(s => {
                arr[k].set(s, arr[k - 1].get(s));
                parent[k].set(s, parent[k - 1].get(s));
            });

            // Lấy danh sách các tuyến đi qua các trạm đã đánh dấu
            const Qroutes = new Set();
            markedStops.forEach(s => {
                const routes = this.routesServingStop.get(s);
                if (routes) routes.forEach(r => Qroutes.add(r));
            });

            const newMarked = new Set();

            // Quét từng tuyến
            for (const routeId of Qroutes) {
                this.scanRoute(routeId, k, arr, parent, newMarked);
            }

            // Quét đi bộ (Transfer)
            const walkedStops = this.walkRelax(arr[k], parent[k]);
            walkedStops.forEach(s => newMarked.add(s));

            markedStops = newMarked;
            if (markedStops.size === 0) break; // Không còn cải thiện được nữa
        }

        // Trích xuất kết quả tối ưu (Pareto Optimization)
        const solutions = [];
        destStopIds.forEach(dest => {
            solutions.push(...this.extractParetoSolutions(arr, parent, dest, K, lambda));
        });

        // Sắp xếp theo điểm số (Thời gian + Số lần đổi chuyến)
        solutions.sort((a, b) => a.score - b.score);
        
        return {
            success: solutions.length > 0,
            paths: this.removeDuplicatePaths(solutions).slice(0, 3), // Chỉ lấy top 3 kết quả tốt nhất
            stats: { solutions_found: solutions.length }
        };
    }

    /**
     * Quét một tuyến xe để xem có cải thiện được thời gian đến không
     */
    scanRoute(routeId, k, arr, parent, newMarked) {
        const stops = this.stopsOfRoute.get(routeId);
        const timeData = this.routeTimeData.get(routeId);
        if (!stops || !timeData) return;

        let boardedTrip = null; // Biến lưu chuyến xe đang ngồi
        
        for (let i = 0; i < stops.length; i++) {
            const stopId = stops[i]._id.toString();
            const currentOffset = timeData.stopsOffset[i];

            // 1. XUỐNG XE (ALIGHT)
            if (boardedTrip !== null) {
                // Thời gian đến = Giờ xe chạy + (Offset hiện tại - Offset lúc lên)
                const travelTime = currentOffset - boardedTrip.boardOffset;
                const arrivalTime = boardedTrip.departureTime + travelTime;

                const currentBest = arr[k].get(stopId);
                
                // Nếu đến sớm hơn kỷ lục cũ
                if (currentBest === undefined || arrivalTime < currentBest) {
                    arr[k].set(stopId, arrivalTime);
                    parent[k].set(stopId, {
                        type: 'RIDE',
                        routeId: routeId,
                        boardStop: boardedTrip.boardStopId,
                        alightStop: stopId,
                        departureTime: boardedTrip.departureTime,
                        arrivalTime: arrivalTime
                    });
                    newMarked.add(stopId);
                }
            }

            // 2. LÊN XE (BOARD)
            // Kiểm tra xem có thể đến trạm này từ vòng trước không
            const prevArrival = arr[k - 1].get(stopId);
            
            if (prevArrival !== undefined && prevArrival < Number.MAX_SAFE_INTEGER) {
                const readyTime = prevArrival + this.minTransferTime;
                
                // Tìm chuyến xe tiếp theo khởi hành sau readyTime
                const nextBusTime = this.findNextDepartureTime(routeId, i, readyTime);

                if (nextBusTime !== null) {
                    // Nếu chưa lên xe, hoặc chuyến mới này đến sớm hơn chuyến đang ngồi
                    if (boardedTrip === null || nextBusTime < boardedTrip.departureTime) {
                        boardedTrip = {
                            departureTime: nextBusTime,
                            boardOffset: currentOffset,
                            boardStopId: stopId
                        };
                    }
                }
            }
        }
    }

    /**
     * Tính toán chuyến xe tiếp theo dựa trên StartTime, EndTime và Frequency
     */
    findNextDepartureTime(routeId, stopIndex, afterTime) {
        const data = this.routeTimeData.get(routeId);
        if (!data) return null;

        const { startSeconds, endSeconds, frequency, stopsOffset } = data;
        const offsetAtStop = stopsOffset[stopIndex];

        // Thời gian chuyến ĐẦU TIÊN trong ngày đến trạm này
        const firstTripAtStop = startSeconds + offsetAtStop;
        
        // Thời gian chuyến CUỐI CÙNG trong ngày đến trạm này
        const lastTripAtStop = endSeconds + offsetAtStop;

        // Trường hợp A: Khách đến sớm hơn chuyến đầu
        if (afterTime <= firstTripAtStop) {
            return firstTripAtStop;
        }

        // Trường hợp B: Khách đến muộn hơn chuyến cuối -> Hết xe
        if (afterTime > lastTripAtStop) {
            return null;
        }

        // Trường hợp C: Tính chuyến tiếp theo theo tần suất
        const timeSinceFirst = afterTime - firstTripAtStop;
        const tripsPassed = Math.ceil(timeSinceFirst / frequency);
        
        const nextTripTime = firstTripAtStop + (tripsPassed * frequency);

        if (nextTripTime > lastTripAtStop) return null;

        return nextTripTime;
    }

    /**
     * Logic đi bộ nối chuyến
     */
    walkRelax(arrK, parentK) {
        const marked = new Set();
        const queue = [];
        
        for (const [stopId, time] of arrK.entries()) {
            if (time < Number.MAX_SAFE_INTEGER) queue.push(stopId);
        }

        while (queue.length > 0) {
            const u = queue.shift();
            const footpaths = this.footpathAdj.get(u);
            if (!footpaths) continue;

            for (const { toStop: v, walkTime } of footpaths) {
                const newTime = arrK.get(u) + walkTime;
                const currentBest = arrK.get(v);

                if (currentBest === undefined || newTime < currentBest) {
                    arrK.set(v, newTime);
                    parentK.set(v, { type: 'WALK', fromStop: u, toStop: v, walkTime }); // Lưu walkTime
                    marked.add(v);
                    if (!queue.includes(v)) queue.push(v);
                }
            }
        }
        return marked;
    }

    // ==========================================
    // 5. TÁI TẠO ĐƯỜNG ĐI & CẮT NGẮN TUYẾN
    // ==========================================

    /**
     * Hàm quan trọng: Cắt danh sách toạ độ chỉ lấy đoạn cần đi
     * Để tránh việc vẽ full cả tuyến xe lên bản đồ
     */
    getSegmentStations(routeId, boardStopId, alightStopId) {
        const stops = this.stopsOfRoute.get(routeId); 
        if (!stops) return [];

        const startIndex = this.stopIndexInRoute.get(`${routeId}_${boardStopId}`);
        const endIndex = this.stopIndexInRoute.get(`${routeId}_${alightStopId}`);

        if (startIndex === undefined || endIndex === undefined) return [];

        // Chỉ lấy các trạm từ điểm lên đến điểm xuống
        if (startIndex <= endIndex) {
            return stops.slice(startIndex, endIndex + 1).map(s => ({
                name: s.name,
                lat: s.location.coordinates[1],
                lng: s.location.coordinates[0]
            }));
        }
        return [];
    }

    extractParetoSolutions(arr, parent, destStopId, K, lambda) {
        const solutions = [];
        const destArrivals = [];

        // Thu thập các thời gian đến đích ở các vòng k khác nhau
        for (let k = 0; k <= K; k++) {
            const time = arr[k].get(destStopId);
            if (time !== undefined && time < Number.MAX_SAFE_INTEGER) {
                destArrivals.push({ k, time });
            }
        }

        destArrivals.sort((a, b) => a.time - b.time);
        let minTransfers = Infinity;

        // Lọc Pareto: Chỉ lấy các kết quả Tốt hơn về Thời gian HOẶC Số lần đổi chuyến
        for (const { k, time } of destArrivals) {
            const transfers = Math.max(0, k - 1);
            
            if (transfers < minTransfers) {
                const pathData = this.reconstructPath(parent, destStopId, k);
                
                solutions.push({
                    arrivalTime: time,
                    arrivalTimeStr: this.formatTime(time),
                    transfers,
                    routes: pathData.segments, // Mảng các chặng đi (đã cắt ngắn toạ độ)
                    totalTravelTimeSeconds: pathData.totalDuration,
                    totalTravelTimeStr: this.formatTime(pathData.totalDuration),
                    score: time + (transfers * lambda) // Điểm số để sort
                });
                minTransfers = transfers;
            }
        }
        return solutions;
    }

    reconstructPath(parent, destStopId, k) {
        const segments = [];
        let curr = destStopId;
        let round = k;
        let firstStartTime = null;
        let lastEndTime = null;

        while (round >= 0) {
            const p = parent[round].get(curr);
            if (!p || p.type === 'ORIGIN') {
                if (!firstStartTime && round === 0) firstStartTime = parent[0].get(curr);
                break;
            }

            if (p.type === 'RIDE') {
                const route = this.routeMap.get(p.routeId);
                const boardSt = this.stationMap.get(p.boardStop);
                const alightSt = this.stationMap.get(p.alightStop);
                
                if (!lastEndTime) lastEndTime = p.arrivalTime; 
                firstStartTime = p.departureTime;

                // --- GỌI HÀM CẮT NGẮN TUYẾN ---
                const pathCoordinates = this.getSegmentStations(p.routeId, p.boardStop, p.alightStop);
                // -------------------------------

                segments.unshift({
                    type: 'RIDE',
                    routeId: p.routeId,
                    routeName: route.routeName || 'Bus Route',
                    from: boardSt.name,
                    to: alightSt.name,
                    departureTime: this.formatTime(p.departureTime),
                    arrivalTime: this.formatTime(p.arrivalTime),
                    // Backend trả về toạ độ đã cắt để Frontend vẽ
                    pathCoordinates: pathCoordinates 
                });
                curr = p.boardStop;
                round--; 
            } else if (p.type === 'WALK') {
                const fromSt = this.stationMap.get(p.fromStop);
                const toSt = this.stationMap.get(p.toStop);
                
                // Segment đi bộ cũng cần toạ độ để vẽ đường nét đứt
                segments.unshift({
                    type: 'WALK',
                    from: fromSt.name,
                    to: toSt.name,
                    walkTime: p.walkTime || 300,
                    walkTimeStr: this.formatTime(p.walkTime || 300),
                    pathCoordinates: [
                        { lat: fromSt.location.coordinates[1], lng: fromSt.location.coordinates[0] },
                        { lat: toSt.location.coordinates[1], lng: toSt.location.coordinates[0] }
                    ],
                    description: `Đi bộ từ ${fromSt.name} đến ${toSt.name}`
                });
                curr = p.fromStop;
            }
        }

        return {
            segments,
            totalDuration: (lastEndTime && firstStartTime) ? (lastEndTime - firstStartTime) : 0
        };
    }

    removeDuplicatePaths(solutions) {
        const seen = new Set();
        return solutions.filter(sol => {
            // Tạo key duy nhất dựa trên chuỗi các RouteId
            const key = sol.routes.map(r => r.type === 'RIDE' ? r.routeId : 'walk').join('|');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    getOrderedStations(route) {
        const stations = [];
        if (route.startStationId) stations.push(route.startStationId);
        if (route.stations) {
            [...route.stations].sort((a, b) => a.order - b.order).forEach(s => stations.push(s.stationId));
        }
        if (route.endStationId) stations.push(route.endStationId);
        return stations;
    }
}

module.exports = new PathfindingService();
