const { createMinHeap2Criteria } = require('../util/minHeap');

function reconstructPathIds(previous, startId, endId) {
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
 * Dijkstra tối ưu theo 2 tiêu chí:
 * 1) Ít chuyển tuyến nhất
 * 2) Quãng đường ngắn nhất
 * Đồng thời lưu routeUsed để reconstruct tuyến xe buýt
 */
function dijkstraMultiCriteria(graph, startId, endId) {
    const INF = 1e18;

    // dist[node] = { transfers, distance, routeId }
    const dist = new Map();
    const previous = new Map();       // station trước đó
    const routeUsed = new Map();      // tuyến dùng để đi đến node này
    const pq = createMinHeap2Criteria();

    // Khởi tạo tất cả node = vô cực
    for (const stationId in graph) {
        dist.set(stationId, {
            transfers: INF,
            distance: INF,
            routeId: null
        });
    }

    // Node bắt đầu
    dist.set(startId, {
        transfers: 0,
        distance: 0,
        routeId: null
    });

    pq.push({
        stationId: startId,
        transfers: 0,
        distance: 0,
        routeId: null
    });

    while (!pq.isEmpty()) {
        const current = pq.pop();
        const { stationId, transfers, distance, routeId } = current;

        // Đã tới đích → Trả về kết quả
        if (stationId === endId) {
            return {
                found: true,
                transfers,
                distance,
                path: reconstructPathIds(previous, startId, endId),
                routeUsed,
            };
        }

        // Duyệt các cạnh kề
        for (const edge of graph[stationId]) {
            const {
                toStation,
                distance,
                routeId,
                ticketPrice
            } = edge;

            // Tính số lần chuyển tuyến
            let newTransfers = transfers;
            if (routeId !== null && routeId !== routeId) {
                newTransfers += 1;
            }

            const newDist = distance + distance;

            const best = dist.get(toStation);

            // So sánh tuple (transfers, distance)
            const isBetter =
                newTransfers < best.transfers ||
                (newTransfers === best.transfers && newDist < best.distance);

            if (isBetter) {
                // Cập nhật kết quả tốt hơn
                dist.set(toStation, {
                    transfers: newTransfers,
                    distance: newDist,
                    routeId: routeId
                });

                previous.set(toStation, stationId);

                routeUsed.set(toStation, {
                    routeId,
                    ticketPrice,
                    edge
                });

                pq.push({
                    stationId: toStation,
                    transfers: newTransfers,
                    distance: newDist,
                    routeId: routeId
                });
            }
        }
    }

    return { found: false };
}

module.exports = {
    dijkstraMultiCriteria
};
