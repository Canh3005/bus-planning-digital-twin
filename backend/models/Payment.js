// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  routeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusRoute'
  }],
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending'
  },
  vnpayResponse: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Tự động xóa sau 24h (TTL index)
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
