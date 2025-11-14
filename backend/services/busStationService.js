// services/busStationService.js
const BusStation = require('../models/BusStation');

class BusStationService {
    /**
     * Lấy tất cả trạm xe
     */
    async getAllStations() {
        return await BusStation.find({}).sort({ createdAt: -1 });
    }

    /**
     * Lấy trạm xe theo ID
     */
    async getStationById(id) {
        const station = await BusStation.findById(id);
        if (!station) {
            throw new Error('Không tìm thấy trạm xe');
        }
        return station;
    }

    /**
     * Tạo trạm xe mới
     */
    async createStation(stationData) {
        // Validate dữ liệu
        if (!stationData.name || !stationData.longitude || !stationData.latitude) {
            throw new Error('Thiếu thông tin bắt buộc: name, longitude, latitude');
        }

        const station = new BusStation({
            name: stationData.name,
            address: stationData.address,
            description: stationData.description,
            location: {
                type: 'Point',
                coordinates: [stationData.longitude, stationData.latitude]
            }
        });

        return await station.save();
    }

    /**
     * Cập nhật trạm xe
     */
    async updateStation(id, stationData) {
        const updateData = {
            name: stationData.name,
            address: stationData.address,
            description: stationData.description
        };

        if (stationData.longitude && stationData.latitude) {
            updateData.location = {
                type: 'Point',
                coordinates: [stationData.longitude, stationData.latitude]
            };
        }

        const station = await BusStation.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!station) {
            throw new Error('Không tìm thấy trạm xe để cập nhật');
        }
        return station;
    }

    /**
     * Xóa trạm xe
     */
    async deleteStation(id) {
        const station = await BusStation.findByIdAndDelete(id);
        if (!station) {
            throw new Error('Không tìm thấy trạm xe để xóa');
        }
        return { message: 'Xóa trạm xe thành công' };
    }
}

module.exports = new BusStationService();
