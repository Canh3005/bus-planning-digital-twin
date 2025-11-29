const mongoose = require('mongoose');
const { route } = require('../routes');

const revenueSchema = new mongoose.Schema(
    {
        routeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'BusRoute',
            required: true,
            index: true,
        },
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: true,
            min: 2000,
        },
        totalRevenue: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        totalTicketsSold: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true, // Tự động thêm createdAt và updatedAt
    }
);

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = Revenue;