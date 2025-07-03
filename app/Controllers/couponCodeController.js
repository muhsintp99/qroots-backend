const CouponCode = require('../models/couponCode');

// Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const { couponTitle, code, discount, endDate } = req.body;

    // Validate required fields
    if (!couponTitle || !code || !discount || !endDate) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if coupon code already exists
    const existingCoupon = await CouponCode.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const coupon = new CouponCode({
      couponTitle,
      code: code.toUpperCase(),
      discount,
      endDate,
    });

    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully', data: coupon });
  } catch (error) {
    console.error('createCoupon error:', error); // Debug log
    res.status(500).json({ message: 'Error creating coupon', error: error.message });
  }
};

// Get all coupons
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await CouponCode.find().sort({ createdAt: -1 });
    res.status(200).json({ message: 'Coupons fetched successfully', data: coupons || [] });
  } catch (error) {
    console.error('getAllCoupons error:', error); // Debug log
    res.status(500).json({ message: 'Error fetching coupons', error: error.message });
  }
};

// Get single coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await CouponCode.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.status(200).json({ message: 'Coupon fetched successfully', data: coupon });
  } catch (error) {
    console.error('getCouponById error:', error); // Debug log
    res.status(500).json({ message: 'Error fetching coupon', error: error.message });
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    const { couponTitle, code, discount, endDate, status } = req.body;

    const coupon = await CouponCode.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    // Check if new code already exists (excluding current coupon)
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await CouponCode.findOne({ code: code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
    }

    coupon.couponTitle = couponTitle || coupon.couponTitle;
    coupon.code = code ? code.toUpperCase() : coupon.code;
    coupon.discount = discount || coupon.discount;
    coupon.endDate = endDate || coupon.endDate;
    coupon.status = status || coupon.status;
    coupon.updatedAt = Date.now();

    await coupon.save();
    res.status(200).json({ message: 'Coupon updated successfully', data: coupon });
  } catch (error) {
    console.error('updateCoupon error:', error); // Debug log
    res.status(500).json({ message: 'Error updating coupon', error: error.message });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await CouponCode.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    res.status(200).json({ message: 'Coupon deleted successfully', data: null });
  } catch (error) {
    console.error('deleteCoupon error:', error); // Debug log
    res.status(500).json({ message: 'Error deleting coupon', error: error.message });
  }
};

// Validate coupon code
// Note: This endpoint may update the coupon status to 'expired' if endDate is past
exports.validateCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const coupon = await CouponCode.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid coupon code' });
    }

    if (coupon.status === 'inactive') {
      return res.status(400).json({ message: 'Coupon is inactive' });
    }

    if (coupon.status === 'expired' || new Date(coupon.endDate) < new Date()) {
      coupon.status = 'expired';
      await coupon.save();
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    res.status(200).json({ message: 'Valid coupon', data: coupon });
  } catch (error) {
    console.error('validateCoupon error:', error); // Debug log
    res.status(500).json({ message: 'Error validating coupon', error: error.message });
  }
};