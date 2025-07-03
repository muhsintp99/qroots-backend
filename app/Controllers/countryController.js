const Country = require('../models/country');
const { cloudinary, uploadDefaultImage } = require('../middlewares/cloudinaryUpload');
const path = require('path');

// Create a new country
exports.createCountry = async (req, res) => {
  try {
    const { name, code, isoCode, dialCode, currency, isDomestic, isDefault } = req.body;
    let image = null;
    let imagePublicId = null;

    if (req.file) {
      image = req.file.path; // Cloudinary URL
      imagePublicId = req.file.public_id;
    } else {
      const defaultImage = await uploadDefaultImage(path.join(__dirname, '../public/default/country.png'), 'country');
      image = defaultImage.url;
      imagePublicId = defaultImage.publicId;
    }

    const newCountry = new Country({
      name,
      code,
      isoCode,
      dialCode,
      currency,
      image,
      imagePublicId,
      isDomestic: isDomestic || false,
      isDefault: isDefault || false,
      createdBy: req.user?._id || 'admin',
      updatedBy: req.user?._id || 'admin'
    });

    const savedCountry = await newCountry.save();
    res.status(201).json({ success: true, message: 'Created Successfully!', data: savedCountry });
  } catch (err) {
    console.error('Create country error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get all countries (excluding deleted)
exports.getAllCountries = async (req, res) => {
  try {
    const countries = await Country.find({ isDeleted: false }).sort({ createdAt: -1 });
    const total = await Country.countDocuments({ isDeleted: false });
    res.json({ success: true, total, data: countries });
  } catch (err) {
    console.error('Get all countries error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get country by ID
exports.getCountryById = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country || country.isDeleted) {
      return res.status(404).json({ success: false, error: 'Country not found' });
    }
    res.json({ success: true, data: country });
  } catch (err) {
    console.error('Get country by ID error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update country
exports.updateCountry = async (req, res) => {
  try {
    const { name, code, isoCode, dialCode, currency, isDomestic, isDefault } = req.body;
    const country = await Country.findById(req.params.id);
    if (!country || country.isDeleted) {
      return res.status(404).json({ success: false, error: 'Country not found or has been deleted' });
    }

    const updatedFields = {
      name,
      code,
      isoCode,
      dialCode,
      currency,
      isDomestic: isDomestic !== undefined ? isDomestic : country.isDomestic,
      isDefault: isDefault !== undefined ? isDefault : country.isDefault,
      updatedBy: req.user?._id || 'admin'
    };

    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (country.imagePublicId) {
        await cloudinary.uploader.destroy(country.imagePublicId);
      }
      updatedFields.image = req.file.path;
      updatedFields.imagePublicId = req.file.public_id;
    }

    const updatedCountry = await Country.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true, runValidators: true }
    );

    if (!updatedCountry) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }

    res.json({ success: true, message: 'Updated Successfully!', data: updatedCountry });
  } catch (err) {
    console.error('Update country error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get total country count (excluding deleted)
exports.getCountryCount = async (req, res) => {
  try {
    const total = await Country.countDocuments({ isDeleted: false });
    res.json({ success: true, total });
  } catch (err) {
    console.error('Get country count error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Hard delete country
exports.deleteCountry = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) {
      return res.status(404).json({ success: false, message: 'Country not found' });
    }
    if (country.name.toLowerCase() === 'india') {
      return res.status(400).json({ success: false, message: 'Cannot delete India' });
    }

    if (country.imagePublicId) {
      await cloudinary.uploader.destroy(country.imagePublicId);
    }

    await Country.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Country permanently deleted',
      data: country
    });
  } catch (err) {
    console.error('Delete country error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};