# Quick Deploy to Vercel

## 🚀 Deploy Backend

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy Backend
```bash
cd backend
vercel --prod
```

### 4. Set Environment Variables
Trên Vercel Dashboard → Settings → Environment Variables, thêm:
- `MONGODB_URI`: mongodb+srv://nguyentuancanh305:Canh3005@cluster0.0bqq5.mongodb.net/bus
- `JWT_SECRET`: bus-planning-digital-twin-super-secret-key-2025
- `JWT_EXPIRE`: 7d
- `NODE_ENV`: production

---

## 🎨 Deploy Frontend

### 1. Cập nhật API URL
Lấy URL backend từ Vercel (ví dụ: `https://your-backend.vercel.app`)

### 2. Deploy Frontend
```bash
cd frontend
vercel --prod
```

### 3. Set Environment Variables
Trên Vercel Dashboard → Settings → Environment Variables:
- `REACT_APP_API_URL`: https://your-backend.vercel.app

### 4. Redeploy (nếu cần)
```bash
vercel --prod --force
```

---

## ✅ Verify Deployment

### Test Backend:
```bash
curl https://your-backend.vercel.app/health
curl https://your-backend.vercel.app/api/stations
```

### Test Frontend:
Mở browser: `https://your-frontend.vercel.app`

---

## 🔄 Auto Deploy với GitHub

### Setup:
1. Push code lên GitHub
2. Vào https://vercel.com/new
3. Import Git Repository
4. Chọn root directory: `backend` hoặc `frontend`
5. Add Environment Variables
6. Deploy

### Result:
- Mỗi push lên GitHub → Tự động deploy
- Main branch → Production
- Other branches → Preview deployment

---

## 📋 Files đã tạo:

**Backend:**
- ✅ `backend/vercel.json` - Vercel config
- ✅ `backend/.vercelignore` - Ignore files
- ✅ `backend/server.js` - Updated to export app

**Frontend:**
- ✅ `frontend/vercel.json` - Vercel config
- ✅ `frontend/.vercelignore` - Ignore files
- ✅ `frontend/src/config/constants.js` - Đã support env vars

---

## 🐛 Common Issues:

**"Module not found":**
```bash
cd backend
npm install
vercel --prod
```

**CORS error:**
Backend đã có CORS enabled. Nếu vẫn lỗi, thêm specific origin:
```javascript
app.use(cors({
  origin: 'https://your-frontend.vercel.app'
}));
```

**Build failed:**
```bash
# Test local build
npm run build

# Check logs
vercel logs
```

---

## 💡 Tips:

- Backend URL sẽ dạng: `https://bus-planning-backend.vercel.app`
- Frontend URL sẽ dạng: `https://bus-planning-frontend.vercel.app`
- Free tier Vercel: Unlimited deployments, 100GB bandwidth/month
- Có thể add custom domain sau

---

## 📞 Support:

- Vercel Docs: https://vercel.com/docs
- GitHub Issues: https://github.com/haivan7/bus-planning-digital-twin/issues
