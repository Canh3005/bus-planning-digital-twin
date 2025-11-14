
# 🚌 Bus Planning Digital Twin (Bus Map Project)

Dự án này mô phỏng một **hệ thống bản đồ xe buýt đơn giản (Bus Map)** bằng cách kết hợp giữa **API Node.js/Express** với **PostGIS** để lưu trữ dữ liệu không gian, và **React/Leaflet** để hiển thị bản đồ và chức năng tìm kiếm tuyến xe.

---

## 📝 Mục lục

1. [💻 Công nghệ sử dụng](#-công-nghệ-sử-dụng)
2. [📂 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
3. [⚙️ Yêu cầu hệ thống](#️-yêu-cầu-hệ-thống)
4. [🚀 Hướng dẫn cài đặt & Chạy](#-hướng-dẫn-cài-đặt--chạy)
5. [🗺️ Các chức năng chính](#️-các-chức-năng-chính)

---

## 1. 💻 Công nghệ sử dụng

| Thành phần | Công nghệ | Mục đích |
|-------------|------------|----------|
| **Database** | PostgreSQL / PostGIS | Lưu trữ dữ liệu trạm xe (điểm) và tuyến xe (đường) dưới dạng không gian (GeoJSON). |
| **Backend API** | Node.js, Express, pg | Cung cấp các API endpoint để truy vấn dữ liệu trạm và tuyến xe từ PostGIS. |
| **Frontend** | React.js | Giao diện người dùng. |
| **Bản đồ** | Leaflet, react-leaflet | Hiển thị bản đồ OpenStreetMap và vẽ các tuyến/trạm. |

---

## 2. 📂 Cấu trúc thư mục

Cấu trúc dự án được chia thành hai phần chính: **Backend** và **Frontend**.

```
bus-planning-digital-twin/
├── bus-admin-backend/         # THƯ MỤC CHÍNH (BACKEND)
│   ├── node_modules/
│   ├── db.js                  # Cấu hình kết nối PostgreSQL
│   ├── server.js              # Server chính (Express API)
│   └── bus-admin-frontend/    # THƯ MỤC CON (FRONTEND - React App)
│       ├── node_modules/
│       ├── package.json
│       ├── package-lock.json
│       └── src/
│           ├── App.js         # Logic chính của Bus Map (Tìm kiếm, GPS, Map, Thanh toán)
│           ├── App.css
│           └── ... (các file React khác)
├── .gitignore
├── README.md                  # File mô tả (file này)
└── package.json (Nếu có)
```

---

## 3. ⚙️ Yêu cầu hệ thống

| Thành phần | Yêu cầu |
|-------------|----------|
| **Node.js & NPM** | Cần thiết để chạy cả Backend và Frontend. |
| **PostgreSQL + PostGIS** | Cần cài đặt và bật extension PostGIS. |
| **Database** | Tạo một database tên `bus_db` có các bảng `bus_stations` và `bus_routes` đã chứa dữ liệu. |

---

## 4. 🚀 Hướng dẫn cài đặt & Chạy

> ⚠️ Bạn cần mở **2 cửa sổ Terminal riêng biệt** — một cho **Backend** và một cho **Frontend**.

### A. Chuẩn bị (Chỉ cần chạy lần đầu)

#### Backend:
```bash
cd bus-admin-backend
npm install
```

#### Frontend:
```bash
cd bus-admin-backend/bus-admin-frontend
npm install
```

---

### B. Khởi động API Backend

Chạy trong thư mục **bus-admin-backend/** để khởi động server API trên **cổng 5000**.

```bash
cd bus-admin-backend
node server.js
```

✅ **Kết quả mong đợi:**  
`Server API đang chạy tại http://localhost:5000`

---

### C. Khởi động Ứng dụng Frontend (React)

Chạy trong thư mục **bus-admin-frontend/** để khởi động ứng dụng React trên **cổng 3000**.

```bash
cd bus-admin-backend/bus-admin-frontend
npm start
```

✅ Ứng dụng sẽ tự động mở tại:  
👉 **http://localhost:3000**

---

## 5. 🗺️ Các chức năng chính

| Chức năng | Mô tả |
|------------|--------|
| **Lấy Vị trí (GPS)** | Sử dụng Geolocation API để lấy vị trí hiện tại của người dùng. Nếu thất bại, dùng vị trí giả lập. |
| **Tìm Trạm Đi/Đích** | Cho phép nhập tên trạm (có gợi ý từ datalist) cho điểm đi và điểm đến. |
| **Tìm Chuyến Xe Phù hợp** | Logic tìm tuyến đi thẳng từ trạm Đi (gần GPS nhất) đến trạm Đích. |
| **Hiển thị Tuyến** | Tuyến xe được tìm thấy sẽ được **tô sáng (highlight)** trên bản đồ. |
| **Mô phỏng Thanh toán** | Sau khi tìm được tuyến, một hộp thoại thanh toán xuất hiện để mô phỏng việc thu tiền vé. |
| **Hiển thị Bản đồ** | Sử dụng **Leaflet** để hiển thị trạm (Markers) và tuyến xe (Polylines) trên nền **OpenStreetMap**. |

---

## 📸 Gợi ý mở rộng (tùy chọn)

- Thêm chức năng lọc tuyến theo mã hoặc khu vực.  
- Tích hợp API thời gian thực cho xe buýt.  
- Tối ưu UI bằng TailwindCSS hoặc Material UI.  
- Xuất báo cáo tuyến hoặc hành trình.  

---

### 👨‍💻 Tác giả

**Bus Planning Digital Twin Team**  
📧 Liên hệ: [your-email@example.com]  
🌐 GitHub: [https://github.com/yourusername](https://github.com/yourusername)

---
