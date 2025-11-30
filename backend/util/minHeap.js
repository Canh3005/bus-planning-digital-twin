function createMinHeap2Criteria() {
    const heap = [];

    return {
        push(item) {
            heap.push(item);
            this._bubbleUp(heap.length - 1);
        },
        pop() {
            if (heap.length === 1) return heap.pop();
            const top = heap[0];
            heap[0] = heap.pop();
            this._bubbleDown(0);
            return top;
        },
        isEmpty() {
            return heap.length === 0;
        },
        _better(a, b) {
            if (a.transfers < b.transfers) return true;
            if (a.transfers > b.transfers) return false;
            return a.distance < b.distance;
        },
        _bubbleUp(idx) {
            while (idx > 0) {
                const parent = Math.floor((idx - 1) / 2);
                if (this._better(heap[idx], heap[parent])) {
                    [heap[idx], heap[parent]] = [heap[parent], heap[idx]];
                    idx = parent;
                } else break;
            }
        },
        _bubbleDown(idx) {
            const n = heap.length;
            while (true) {
                let smallest = idx;
                const left = 2 * idx + 1;
                const right = 2 * idx + 2;

                if (left < n && this._better(heap[left], heap[smallest])) smallest = left;
                if (right < n && this._better(heap[right], heap[smallest])) smallest = right;

                if (smallest !== idx) {
                    [heap[idx], heap[smallest]] = [heap[smallest], heap[idx]];
                    idx = smallest;
                } else break;
            }
        }
    };
}

module.exports = {
    createMinHeap2Criteria
};