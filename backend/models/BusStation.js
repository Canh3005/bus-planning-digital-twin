// models/BusStation.js - MongoDB Model
const mongoose = require("mongoose");

const busStationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        validate: {
          validator: function (coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message:
            "Coordinates must be [longitude, latitude] with valid ranges",
        },
      },
    },
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Tạo index 2dsphere cho location để hỗ trợ geospatial queries
busStationSchema.index({ location: "2dsphere" });

// Virtual để lấy longitude và latitude riêng biệt
busStationSchema.virtual("longitude").get(function () {
  return this.location.coordinates[0];
});

busStationSchema.virtual("latitude").get(function () {
  return this.location.coordinates[1];
});

// Đảm bảo virtuals được serialize
busStationSchema.set("toJSON", { virtuals: true });
busStationSchema.set("toObject", { virtuals: true });

const BusStation = mongoose.model("BusStation", busStationSchema);

module.exports = BusStation;
