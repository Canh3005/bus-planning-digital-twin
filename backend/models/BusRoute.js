// models/BusRoute.js - MongoDB Model
const mongoose = require("mongoose");

const routeStationSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusStation",
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const busRouteSchema = new mongoose.Schema(
  {
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    startStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusStation",
      required: true,
    },
    endStationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusStation",
      required: true,
    },
    routePath: {
      type: {
        type: String,
        enum: ["LineString"],
        default: "LineString",
      },
      coordinates: {
        type: [[Number]], // Array of [longitude, latitude] pairs
        required: true,
        validate: {
          validator: function (coords) {
            return coords.length >= 2; // Ít nhất 2 điểm
          },
          message: "Route path must have at least 2 points",
        },
      },
    },
    startTime: {
      type: String,
      trim: true,
      required: true,
      validate: {
        validator: function(v) {
          return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
        },
        message: 'startTime must be in HH:MM format'
      }
    },
    frequencyMinutes: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'frequencyMinutes must be an integer'
      }
    },
    ticketPrice: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    stations: [routeStationSchema], // Mảng các trạm thuộc tuyến
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Tạo index 2dsphere cho routePath để hỗ trợ geospatial queries
busRouteSchema.index({ routePath: "2dsphere" });

// Index cho tìm kiếm theo tên
busRouteSchema.index({ routeName: "text" });

// Đảm bảo virtuals được serialize
busRouteSchema.set("toJSON", { virtuals: true });
busRouteSchema.set("toObject", { virtuals: true });

const BusRoute = mongoose.model("BusRoute", busRouteSchema);

module.exports = BusRoute;
