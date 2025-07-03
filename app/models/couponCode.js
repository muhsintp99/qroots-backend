const mongoose = require('mongoose');

const couponCodeSchema = new mongoose.Schema({
  couponTitle: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  discount: {
    type: Number,
    required: true,
    min: 0,
    max: 100, // Enforce max discount
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

// Index for faster code lookups
couponCodeSchema.index({ code: 1 });

module.exports = mongoose.model('CouponCode', couponCodeSchema);