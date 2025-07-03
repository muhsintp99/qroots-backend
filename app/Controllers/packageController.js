const Package = require('../models/package');
const CouponCode = require('../models/couponCode');

// Generate packId in PAC001 format
const generatePackId = async () => {
    const latestPackage = await Package.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;

    if (latestPackage && latestPackage.packId) {
        const number = parseInt(latestPackage.packId.replace('PAC', '')) || 0;
        nextNumber = number + 1;
    }

    return `PAC${nextNumber.toString().padStart(3, '0')}`;
};

// Create a new package
exports.createPackage = async (req, res) => {
    try {
        const { title, description, rate, type, points, status, isActive } = req.body;

        // Validate required fields
        if (!title || !rate || !type) {
            return res.status(400).json({ message: 'title, rate, and type are required' });
        }

        // Generate packId
        const packId = await generatePackId();

        const package = new Package({
            packId,
            title,
            description,
            rate,
            type,
            points: points || [],
            status: status || 'new',
            isActive: isActive !== undefined ? isActive : true,
        });

        await package.save(); // Corrected from Package.save()
        res.status(201).json({ message: 'Package created successfully', package: package });
    } catch (error) {
        res.status(500).json({ message: 'Error creating package', error: error.message });
    }
};

// Get all packages
exports.getAllPackages = async (req, res) => {
    try {
        const packages = await Package.find().sort({ createdAt: 1 });
        const count = await Package.countDocuments()
        res.status(200).json({packages,count});
    } catch (error) {
        res.status(500).json({ message: 'Error fetching packages', error: error.message });
    }
};

// Get single package by ID
exports.getPackageById = async (req, res) => {
    try {
        const package = await Package.findById(req.params.id); // Corrected from package.findById
        if (!package) {
            return res.status(404).json({ message: 'Package not found' });
        }
        res.status(200).json(package);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching package', error: error.message });
    }
};

// Update package
exports.updatePackage = async (req, res) => {
    try {
        const { title, description, rate, type, points, status, isActive } = req.body;

        const package = await Package.findById(req.params.id); // Corrected from package.findById
        if (!package) {
            return res.status(404).json({ message: 'Package not found' });
        }

        package.title = title || package.title;
        package.description = description || package.description;
        package.rate = rate || package.rate;
        package.type = type || package.type;
        package.points = points || package.points;
        package.status = status || package.status;
        package.isActive = isActive !== undefined ? isActive : package.isActive;
        package.updatedAt = Date.now();

        await package.save();
        res.status(200).json({ message: 'Package updated successfully', package: package });
    } catch (error) {
        res.status(500).json({ message: 'Error updating package', error: error.message });
    }
};

// Delete package
exports.deletePackage = async (req, res) => {
    try {
        const package = await Package.findByIdAndDelete(req.params.id);
        if (!package) {
            return res.status(404).json({ message: 'Package not found' });
        }
        res.status(200).json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting package', error: error.message });
    }
};

// Get package count
exports.getPackageCount = async (req, res) => {
    try {
        const count = await Package.countDocuments();
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching package count', error: error.message });
    }
};

// Apply coupon to package rate
exports.applyCouponToPackage = async (req, res) => {
    try {
        const { couponCode, packageId } = req.body;

        // Validate input
        if (!couponCode || !packageId) {
            return res.status(400).json({ message: 'Coupon code and package ID are required' });
        }

        // Find coupon
        const coupon = await CouponCode.findOne({ code: couponCode.toUpperCase() });
        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        // Check coupon status and expiration
        if (coupon.status === 'inactive') {
            return res.status(400).json({ message: 'Coupon is inactive' });
        }
        if (coupon.status === 'expired' || new Date(coupon.endDate) < new Date()) {
            coupon.status = 'expired';
            await coupon.save();
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        // Find package
        const package = await Package.findById(packageId);
        if (!package) {
            return res.status(404).json({ message: 'Package not found' });
        }

        // Calculate discounted rate
        const originalRate = package.rate;
        const discountPercentage = coupon.discount;
        const discountedRate = originalRate * (1 - discountPercentage / 100);

        res.status(200).json({
            message: 'Coupon applied successfully',
            package: {
                ...package.toObject(),
                originalRate,
                discountedRate: Number(discountedRate.toFixed(2)),
                couponCode: coupon.code,
                discountPercentage,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'Error applying coupon', error: error.message });
    }
};