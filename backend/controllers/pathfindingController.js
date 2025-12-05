const INF = 1e9;
const K_MAX = 4; // Tối đa 3 chuyển tuyến
const HORIZON = 8 * 3600; // 8 giờ (giây)
const BUFFER_FACTOR = 1.15; // Buffer 15% cho thời gian di chuyển

async function findMultiOptionsFRAPTOR(startStopId, destStops, t0, maxWalk) {
    // Bước 1: Chạy F-RAPTOR++ một lần
    const { arr, parent } = await runFRAPTORPlusPlus(startStopId, t0, maxWalk);

    // Bước 2: Trích xuất phương án
    let options = [];
    for (let k = 0; k <= K_MAX; k++) {
        let best = null;
        let bestTime = INF;
        for (const { stopId: s, walkTime: wB } of destStops) {
            if (arr[k][s] < INF) {
                const total = arr[k][s] + wB;
                if (total < bestTime) {
                    bestTime = total;
                    best = { k, s, wB };
                }
            }
        }
        if (best) {
            const itin = reconstructPath(parent, best.k, best.s);
            itin.push({ type: 'WALK_TO_DEST', duration: best.wB });
            itin.totalTime = (bestTime - t0) / 60; // Chuyển sang phút
            itin.transfers = countTransfers(itin);
            itin.walkTime = sumWalkTime(itin) / 60; // Phút
            itin.kRound = best.k;
            options.push(itin);
        }
    }

    options = dedupBySignature(options); // Lọc trùng bằng hash sequence tuyến/chuyển
    options = paretoFilter(options, ['totalTime', 'transfers', 'walkTime']); // Lọc Pareto
    options.sort((a, b) => a.totalTime - b.totalTime || a.transfers - b.transfers || a.walkTime - b.walkTime);

    let recommended = options[0] || null;
    let shown = options.slice(0, 5);

    // Tùy chọn: Tăng đa dạng bằng rerun với bans
    if (options.length < 5 && recommended) {
        shown = await generateDiverse(recommended, { startStopId, destStops, t0, maxWalk }, 5);
    }

    return { recommended, shown };
}

// Core F-RAPTOR++
async function runFRAPTORPlusPlus(source, t0, maxWalk) {
    const numStops = /* Số stop từ DB */;
    const arr = Array.from({ length: K_MAX + 1 }, () => Array(numStops).fill(INF));
    const parent = Array.from({ length: K_MAX + 1 }, () => Array(numStops).fill(null)); // { prevStop, route/type, dep/duration }
    const marked = new Set();

    arr[0][source] = t0;
    marked.add(source);

    for (let k = 1; k <= K_MAX; k++) {
        // Sao chép từ k-1 làm upper bound
        for (let i = 0; i < numStops; i++) {
            arr[k][i] = Math.min(arr[k][i], arr[k-1][i]);
        }

        const routesToScan = new Set();
        for (const p of marked) {
            const routesServingP = getRoutesForStop(p); // Từ DB
            for (const r of routesServingP) {
                routesToScan.add(r);
            }
        }
        marked.clear();

        for (const r of routesToScan) {
            const stopsInRoute = getStopsInRoute(r); // Mảng stop theo thứ tự
            let cumulativeTime = 0;
            let currentDep = null;

            for (let i = 0; i < stopsInRoute.length; i++) {
                const s = stopsInRoute[i];
                if (arr[k-1][s] < INF) {
                    // Tính departure tiếp theo sau arr[k-1][s]
                    const first = getFirstDeparture(r, s);
                    const headway = getHeadway(r);
                    let wait = 0;
                    if (arr[k-1][s] < first) {
                        wait = first - arr[k-1][s];
                    } else {
                        wait = (headway - ((arr[k-1][s] - first) % headway)) % headway;
                    }
                    currentDep = arr[k-1][s] + wait;
                    if (currentDep - t0 > HORIZON) continue;

                    cumulativeTime = 0; // Reset khi board mới
                }

                if (currentDep !== null) {
                    // Cộng travel time đến stop tiếp (với buffer)
                    if (i < stopsInRoute.length - 1) {
                        const travel = getTravelTime(r, s, stopsInRoute[i+1]) * BUFFER_FACTOR;
                        cumulativeTime += travel;
                    }
                    const arrival = currentDep + cumulativeTime;
                    if (arrival < arr[k][s]) {
                        arr[k][s] = arrival;
                        parent[k][s] = { prev: stopsInRoute[i-1] || null, route: r, dep: currentDep };
                        marked.add(s);
                    }
                }
            }
        }

        // Footpath stage (đi bộ chuyển tuyến)
        for (const p of marked) {
            const footpaths = getFootpathsFrom(p, maxWalk); // Mảng {target, duration}
            for (const { target, duration } of footpaths) {
                const newArr = arr[k][p] + duration;
                if (newArr < arr[k][target]) {
                    arr[k][target] = newArr;
                    parent[k][target] = { prev: p, type: 'WALK', duration };
                    marked.add(target);
                }
            }
        }

        if (marked.size === 0) break; // Không cải thiện nữa
    }

    return { arr, parent };
}

// Hàm helper: reconstructPath
function reconstructPath(parent, k, s) {
    const itin = [];
    while (k > 0 && s !== null) {
        const p = parent[k][s];
        if (p.type === 'WALK') {
            itin.unshift({ type: 'WALK', from: p.prev, to: s, duration: p.duration });
        } else {
            itin.unshift({ type: 'RIDE', route: p.route, from: p.prev, to: s, dep: p.dep, arr: parent[k][s].arr }); // Arr cần tính lại nếu cần
        }
        s = p.prev;
        if (p.type !== 'WALK') k--; // Giảm k chỉ khi ride
    }
    return itin;
}

// countTransfers: Đếm số lần chuyển = số ride - 1
function countTransfers(itin) {
    return itin.filter(leg => leg.type === 'RIDE').length - 1;
}

// sumWalkTime: Tổng thời gian đi bộ
function sumWalkTime(itin) {
    return itin.filter(leg => leg.type === 'WALK' || leg.type === 'WALK_TO_DEST').reduce((sum, leg) => sum + leg.duration, 0);
}

// dedupBySignature: Lọc trùng bằng hash (ví dụ: JSON.stringify sequence routes + transfers)
function dedupBySignature(options) {
    const seen = new Set();
    return options.filter(opt => {
        const sig = opt.map(leg => leg.type === 'RIDE' ? leg.route : (leg.type === 'TRANSFER' ? leg.at : '')).join('-');
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
    });
}

// paretoFilter: Lọc non-dominated (không bị trội ở tất cả keys)
function paretoFilter(options, keys) {
    return options.filter(opt => {
        return !options.some(other => {
            if (other === opt) return false;
            return keys.every(key => other[key] <= opt[key]) && keys.some(key => other[key] < opt[key]);
        });
    });
}

// generateDiverse: Rerun với bans cho đa dạng
async function generateDiverse(bestItin, baseInputs, M) {
    const bans = [];
    for (const leg of bestItin) {
        if (leg.type === 'RIDE') bans.push({ type: 'BAN_ROUTE', route: leg.route });
        if (leg.type === 'TRANSFER') bans.push({ type: 'BAN_TRANSFER', stop: leg.at, nextRoute: /* lấy từ leg tiếp */ });
    }

    let pool = [bestItin];
    for (let i = 0; i < Math.min(M, bans.length); i++) {
        const { arr: arr2, parent: parent2 } = await runFRAPTORPlusPlus(baseInputs.startStopId, baseInputs.t0, baseInputs.maxWalk, bans[i]);
        const { recommended: rec2 } = await findMultiOptionsFRAPTOR(/* chỉ extract 1 */, arr2, parent2); // Chỉ lấy 1
        if (rec2) pool.push(rec2);
    }

    pool = paretoFilter(pool, ['totalTime', 'transfers', 'walkTime']);
    pool.sort((a, b) => a.totalTime - b.totalTime || a.transfers - b.transfers || a.walkTime - b.walkTime);
    return pool;
}

// Các hàm khác: findNearestStation, findNearestStations (sử dụng Haversine distance), getRoutesForStop, v.v. - Triển khai dựa trên DB

module.exports = {
    findMultiOptionsFRAPTOR,
    findNearestStation,
    // Các export khác
};
