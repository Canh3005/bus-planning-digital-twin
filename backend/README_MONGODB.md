# Bus Planning Backend - MongoDB

Backend API cho hệ thống quản lý xe buýt sử dụng MongoDB Atlas.

## 🔧 Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Cấu hình file `.env`:
```env
MONGODB_URI=mongodb+srv://nguyentuancanh305:Canh3005@cluster0.0bqq5.mongodb.net/bus
PORT=5000
NODE_ENV=development
```

## 🚀 Chạy server

```bash
npm start
```

Server sẽ chạy tại: http://localhost:5000

## 📊 Database Schema

### BusStation (Trạm xe)
- **name**: String (required) - Tên trạm
- **address**: String - Địa chỉ
- **description**: String - Mô tả
- **location**: GeoJSON Point - Tọa độ (longitude, latitude)
- **timestamps**: createdAt, updatedAt

### BusRoute (Tuyến xe)
- **routeName**: String (required) - Tên tuyến
- **startStationId**: ObjectId (ref: BusStation) - Trạm đầu
- **endStationId**: ObjectId (ref: BusStation) - Trạm cuối
- **routePath**: GeoJSON LineString - Đường đi
- **operatingHours**: String - Giờ hoạt động
- **ticketPrice**: Number - Giá vé
- **description**: String - Mô tả
- **stations**: Array - Danh sách trạm thuộc tuyến
  - stationId: ObjectId (ref: BusStation)
  - order: Number
- **timestamps**: createdAt, updatedAt

## 🛣️ API Endpoints

### Stations (Trạm xe)
- `GET /api/stations` - Lấy tất cả trạm
- `GET /api/stations/:id` - Lấy trạm theo ID
- `POST /api/stations` - Tạo trạm mới
  ```json
  {
    "name": "Bến xe Miền Tây",
    "address": "395 Kinh Dương Vương, Q.6",
    "description": "Trạm xe buýt chính",
    "longitude": 106.6297,
    "latitude": 10.8231
  }
  ```
- `PUT /api/stations/:id` - Cập nhật trạm
- `DELETE /api/stations/:id` - Xóa trạm

### Routes (Tuyến xe)
- `GET /api/routes` - Lấy tất cả tuyến
- `GET /api/routes/:id` - Lấy tuyến theo ID
- `POST /api/routes` - Tạo tuyến mới
  ```json
  {
    "routeName": "Tuyến số 8",
    "startStationId": "60abc123...",
    "endStationId": "60def456...",
    "coordinates": [[106.629, 10.823], [106.630, 10.824]],
    "operatingHours": "5h00 - 22h00",
    "ticketPrice": 7000,
    "description": "Tuyến xe buýt số 8",
    "stations": [
      { "stationId": "60abc123...", "order": 1 },
      { "stationId": "60def456...", "order": 2 }
    ]
  }
  ```
- `PUT /api/routes/:id` - Cập nhật tuyến
- `DELETE /api/routes/:id` - Xóa tuyến

## 🗺️ GeoJSON Format

MongoDB sử dụng GeoJSON format cho dữ liệu địa lý:

**Point** (Trạm):
```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

**LineString** (Tuyến đường):
```json
{
  "type": "LineString",
  "coordinates": [
    [lng1, lat1],
    [lng2, lat2],
    [lng3, lat3]
  ]
}
```

## ⚠️ Lưu ý

1. **Thứ tự tọa độ**: MongoDB GeoJSON sử dụng `[longitude, latitude]` (khác với Google Maps)
2. **Index 2dsphere**: Đã tạo sẵn cho location và routePath để tối ưu geospatial queries
3. **Populate**: Các API tự động populate thông tin trạm khi lấy tuyến

## 🔄 Migration từ PostgreSQL

Dự án đã được chuyển đổi hoàn toàn từ PostgreSQL sang MongoDB:
- ✅ Xóa dependencies: `pg`
- ✅ Thêm dependencies: `mongoose`, `dotenv`
- ✅ Xóa SQL migrations
- ✅ Cập nhật models với Mongoose Schema
- ✅ Cập nhật services với Mongoose methods
- ✅ Hỗ trợ GeoJSON cho dữ liệu địa lý
