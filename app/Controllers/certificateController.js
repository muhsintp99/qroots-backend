import Certificate from '../models/certificate.js';

// Create a new certificate
export const createCertificate = async (req, res) => {
  try {
    const { title, reference, country, description, issueDate } = req.body;
    if (!title || !reference || !country || !description) {
      return res.status(400).json({ message: 'Title, reference, country, and descrizione are required' });
    }
    const certificate = new Certificate({ title, reference, country, description, issueDate });
    await certificate.save();
    res.status(201).json(certificate);
  } catch (error) {
    console.error('Create certificate error:', error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? error.message : 'Server error',
    });
  }
};

// Update a certificate
export const updateCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('country');
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(certificate);
  } catch (error) {
    console.error('Update certificate error:', error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({
      message: error.name === 'ValidationError' ? error.message : 'Server error',
    });
  }
};

// Get certificate by ID
export const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id).populate('country');
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json(certificate);
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all certificates
export const getAllCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('country')
      .sort({ createdAt: -1 })
      .lean();
    const count = certificates.length;
    res.status(200).json({
      message: 'Certificates fetched successfully',
      count,
      data: certificates,
    });
  } catch (error) {
    console.error('Get all certificates error:', error);
    res.status(500).json({ message: 'Failed to fetch certificates' });
  }
};

// Delete a certificate
export const deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findByIdAndDelete(req.params.id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Delete certificate error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Count certificates
export const countCertificates = async (req, res) => {
  try {
    const count = await Certificate.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Count certificates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};