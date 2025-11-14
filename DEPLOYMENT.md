# Vercel Deployment Guide

## 📦 Backend Deployment (Node.js API)

### 1. Chuẩn bị
- Đảm bảo file `vercel.json` đã có trong thư mục `backend/`
- Cần có tài khoản Vercel: https://vercel.com

### 2. Environment Variables
Trên Vercel Dashboard, thêm các biến môi trường:

```
MONGODB_URI=mongodb+srv://nguyentuancanh305:Canh3005@cluster0.0bqq5.mongodb.net/bus
JWT_SECRET=bus-planning-digital-twin-super-secret-key-2025-change-in-production
JWT_EXPIRE=7d
NODE_ENV=production
```

### 3. Deploy Backend

**Option A: Vercel CLI**
```bash
cd backend
npm i -g vercel
vercel login
vercel --prod
```

**Option B: GitHub Integration**
1. Push code lên GitHub
2. Vào Vercel Dashboard
3. Click "New Project"
4. Import repository
5. Chọn thư mục `backend`
6. Thêm Environment Variables
7. Click "Deploy"

### 4. Sau khi deploy
- Vercel sẽ cung cấp URL: `https://your-backend.vercel.app`
- Test API: `https://your-backend.vercel.app/api/stations`

---

## 🎨 Frontend Deployment (React App)

### 1. Chuẩn bị
- Đảm bảo file `vercel.json` đã có trong thư mục `frontend/`

### 2. Cập nhật API URL
Sửa file `frontend/src/config/constants.js`:
```javascript
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://your-backend.vercel.app';
```

### 3. Environment Variables
Trên Vercel Dashboard, thêm:
```
REACT_APP_API_URL=https://your-backend.vercel.app
```

### 4. Deploy Frontend

**Option A: Vercel CLI**
```bash
cd frontend
vercel --prod
```

**Option B: GitHub Integration**
1. Push code lên GitHub
2. Vào Vercel Dashboard
3. Click "New Project"
4. Import repository
5. Chọn thư mục `frontend`
6. Framework Preset: Create React App
7. Thêm Environment Variables
8. Click "Deploy"

### 5. Sau khi deploy
- Vercel sẽ cung cấp URL: `https://your-frontend.vercel.app`
- Truy cập để test

---

## ⚙️ CI/CD Tự động

### Với GitHub Integration:
- Mỗi lần push code lên GitHub → Vercel tự động deploy
- Push lên branch `main` → Deploy production
- Push lên branch khác → Deploy preview

### Branch Strategy:
```
main (production)
├── develop (staging)
└── feature branches (preview deployments)
```

---

## 🔧 Troubleshooting

### Backend không chạy:
1. Kiểm tra logs trên Vercel Dashboard
2. Verify Environment Variables
3. Đảm bảo `server.js` export đúng:
   ```javascript
   module.exports = app; // hoặc export default app;
   ```

### Frontend không connect được Backend:
1. Kiểm tra CORS settings trong backend
2. Verify `REACT_APP_API_URL` trong Vercel
3. Check Network tab trong DevTools

### Build failed:
1. Kiểm tra `package.json` có đúng dependencies
2. Test build locally: `npm run build`
3. Check Node version compatibility

---

## 📊 Monitoring

### Vercel Analytics:
- Tự động track performance
- View trong Dashboard > Analytics

### Logs:
- Real-time logs: `vercel logs`
- Hoặc xem trong Dashboard > Deployments > Logs

---

## 🚀 Domain Custom

### Thêm domain riêng:
1. Vào Project Settings > Domains
2. Thêm domain của bạn
3. Cấu hình DNS theo hướng dẫn
4. Vercel tự động cấp SSL certificate

---

## 💡 Best Practices

### Backend:
- ✅ Sử dụng Environment Variables cho sensitive data
- ✅ Enable CORS cho frontend domain
- ✅ Implement rate limiting
- ✅ Add request logging

### Frontend:
- ✅ Optimize bundle size
- ✅ Enable code splitting
- ✅ Use lazy loading
- ✅ Implement error boundaries

---

## 📝 Deployment Checklist

**Backend:**
- [ ] File `vercel.json` đã tạo
- [ ] Environment variables đã set
- [ ] MongoDB URI đã cấu hình
- [ ] JWT secret đã set
- [ ] CORS đã enable cho frontend domain
- [ ] API endpoints đã test

**Frontend:**
- [ ] File `vercel.json` đã tạo
- [ ] `REACT_APP_API_URL` đã set
- [ ] Build locally thành công
- [ ] Đã test kết nối với backend API
- [ ] Routes đã cấu hình đúng

---

## 🔗 Useful Links

- Vercel Docs: https://vercel.com/docs
- Node.js on Vercel: https://vercel.com/docs/runtimes#official-runtimes/node-js
- Create React App on Vercel: https://vercel.com/guides/deploying-react-with-vercel
