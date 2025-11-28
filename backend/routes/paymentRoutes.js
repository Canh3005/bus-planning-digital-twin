// ~/bus-admin-backend/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// POST /api/payment/create_payment_url - Tạo URL thanh toán VNPay
router.post('/create_payment_url', paymentController.createPaymentUrl);

// GET /api/payment/vnpay_return - Xử lý callback từ VNPay
router.get('/vnpay_return', paymentController.vnpayReturn);

// GET /api/payment/vnpay_ipn - Xử lý IPN từ VNPay
router.get('/vnpay_ipn', paymentController.vnpayIPN);

module.exports = router;
