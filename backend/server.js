// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import routes
const apiRoutes = require('./routes');

const app = express();
const port = process.env.PORT || 5000; 

// Kết nối MongoDB
connectDB();

// Middleware
app.use(cors()); 
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server đang hoạt động' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint không tồn tại' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Lỗi server:', err);
    res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
});

// Start server (for local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`🚀 Server API đang chạy tại http://localhost:${port}`);
    });
}

// Export app for Vercel serverless
module.exports = app;
