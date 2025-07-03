const express = require('express');
const router = express.Router();
const couponController = require('../Controllers/couponCodeController');

// Create a new coupon
router.post('/', couponController.createCoupon);

// Get all coupons
router.get('/', couponController.getAllCoupons);

// Get single coupon by ID
router.get('/:id', couponController.getCouponById);

// Update coupon
router.put('/:id', couponController.updateCoupon);

// Delete coupon
router.delete('/:id', couponController.deleteCoupon);

// Validate coupon code
router.post('/validate', couponController.validateCoupon);

module.exports = router;