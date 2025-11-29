const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');

// GET /api/revenue/report - Lấy báo cáo doanh thu
router.get('/report', revenueController.getRevenueReport.bind(revenueController));

module.exports = router;