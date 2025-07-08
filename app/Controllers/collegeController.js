const fs = require('fs');
const path = require('path');
const College = require('../models/college');

const safeParseJSON = (value, fallback = []) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

// CREATE
exports.createCollege = async (req, res) => {
  try {
    const {
      name, code, email, phone, address, website, desc, map,
      category, status, facilities, services, country, courses, visible
    } = req.body;

    const image = req.file
      ? `${req.protocol}://${req.get('host')}/public/college/${req.file.filename}`
      : null;

    const exists = await College.findOne({ code });
    if (exists) return res.status(400).json({ error: 'College code already exists' });

    const newCollege = new College({
      name, code, email, phone, address, website, desc, map,
      category, status, country,
      facilities: safeParseJSON(facilities),
      services: safeParseJSON(services),
      courses: safeParseJSON(courses),
      image,
      visible: visible !== undefined ? JSON.parse(visible) : true
    });

    const saved = await newCollege.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getColleges = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status, country } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { desc: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (country) filter.country = country;

    const colleges = await College.find(filter)
      .populate('country')
      .populate('courses')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await College.countDocuments(filter);

    res.json({
      colleges,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      total
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ SINGLE
exports.getCollegeById = async (req, res) => {
  try {
    const college = await College.findById(req.params.id)
      .populate('country')
      .populate('courses');

    if (!college) return res.status(404).json({ error: 'College not found' });
    res.json(college);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateCollege = async (req, res) => {
  try {
    const {
      name, code, email, phone, address, website, desc, map,
      category, status, facilities, services, country, courses, visible
    } = req.body;

    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ error: 'College not found' });

    if (req.file && college.image) {
      const oldImagePath = path.join(__dirname, `../../public/college/${path.basename(college.image)}`);
      if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
    }

    const image = req.file
      ? `${req.protocol}://${req.get('host')}/public/college/${req.file.filename}`
      : college.image;

    const updateData = {
      name, code, email, phone, address, website, desc, map,
      category, status, country, image,
      visible: visible !== undefined ? JSON.parse(visible) : college.visible,
      facilities: safeParseJSON(facilities),
      services: safeParseJSON(services),
      courses: safeParseJSON(courses)
    };

    const updated = await College.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteCollege = async (req, res) => {
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ error: 'College not found' });

    if (college.image) {
      const imagePath = path.join(__dirname, `../../public/college/${path.basename(college.image)}`);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await College.findByIdAndDelete(req.params.id);
    res.json({ message: 'College permanently deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// COUNT
exports.getCollegeCount = async (req, res) => {
  try {
    const count = await College.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
