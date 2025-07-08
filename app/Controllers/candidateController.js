const JWT = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const Candidate = require('../models/candidate');
const { generateOTP, generateTokenExpiry } = require('../utils/otp');
const { hashPassword, comparePassword } = require('../helpers/authHelper');
const { sendWelcomeCandidateEmail, sendOTPEmail } = require('../helpers/sendEmail');

const candidateController = {
  async register(req, res) {
    try {
      const {
        email, mobile, password, firstName, lastName,
        dob, addressLine1, addressLine2, city, district,
        state, zipCode, country
      } = req.body;

      if (!email || !mobile || !dob) {
        return res.status(400).json({ success: false, message: 'All required fields (email, mobile, dob) must be provided' });
      }

      if (!mobile.match(/^[0-9]{8,10}$/)) {
        return res.status(400).json({ success: false, message: 'Mobile number must be 8 to 10 digits' });
      }

      const currentYear = new Date().getFullYear();
      const prefix = `CAN${currentYear}`;
      const candidateCount = await Candidate.countDocuments({ canId: { $regex: `^${prefix}` } });
      const canId = `${prefix}${(candidateCount + 1).toString().padStart(3, '0')}`;

      const existing = await Candidate.findOne({ $or: [{ email }, { mobile }, { canId }] });
      if (existing) return res.status(400).json({ success: false, message: 'Candidate already exists' });

      let finalPassword = password;
      if (!password && dob) {
        const normalizedDob = dob.replace(/-/g, '/');
        const [day, month, year] = normalizedDob.split('/');
        if (!day || !month || !year || isNaN(day) || isNaN(month) || isNaN(year)) {
          return res.status(400).json({ success: false, message: 'Invalid DOB format. Use DD/MM/YYYY or DD-MM-YYYY' });
        }
        finalPassword = `${day.padStart(2, '0')}${month.padStart(2, '0')}${year}`;
      }

      if (!finalPassword) {
        return res.status(400).json({ success: false, message: 'Password or valid DOB is required' });
      }

      const fileName = req.file?.filename || 'user.png';
      const folder = req.file ? 'candidate' : 'default';
      const imageUrl = `${req.protocol}://${req.get('host')}/public/${folder}/${fileName}`;
      const hashedPassword = await hashPassword(finalPassword);

      const candidate = await Candidate.create({
        canId,
        email,
        mobile,
        password: hashedPassword,
        firstName,
        lastName,
        dob,
        image: imageUrl,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        zipCode,
        country
      });

      await sendWelcomeCandidateEmail(email, `${firstName} ${lastName}`, finalPassword);

      res.status(201).json({
        success: true,
        message: 'Candidate registered successfully',
        candidate: {
          _id: candidate._id,
          canId: candidate.canId,
          email: candidate.email,
          fullName: `${candidate.firstName} ${candidate.lastName}`,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error in registration', error: error.message });
    }
  },

  async update(req, res) {
    try {
      const {
        canId, email, mobile, firstName, lastName, gender,
        dob, addressLine1, addressLine2, city, district,
        state, zipCode, country
      } = req.body;

      const updateData = {
        canId, email, mobile, firstName, lastName, gender,
        dob, addressLine1, addressLine2, city, district,
        state, zipCode, country
      };

      const candidate = await Candidate.findById(req.candidate._id);
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      if (req.file) {
        if (candidate.image?.includes('/public/candidate/')) {
          const oldImagePath = path.join(__dirname, '../../', candidate.image);
          if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
        }
        updateData.image = `${req.protocol}://${req.get('host')}/public/candidate/${req.file.filename}`;
      }

      const updated = await Candidate.findByIdAndUpdate(
        req.candidate._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({ success: true, message: 'Candidate updated successfully', candidate: updated });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error updating candidate', error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const candidate = await Candidate.findOne({ email }).select('+password');
      if (!candidate || !(await comparePassword(password, candidate.password))) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      candidate.lastLogin = new Date();
      await candidate.save();

      const token = JWT.sign({ id: candidate._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        candidate: {
          _id: candidate._id,
          canId: candidate.canId,
          email: candidate.email,
          fullName: `${candidate.firstName} ${candidate.lastName}`,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error in login', error: error.message });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const candidate = await Candidate.findOne({ email });
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

      const otp = generateOTP();
      const otpExpires = generateTokenExpiry();

      candidate.resetPasswordToken = otp;
      candidate.resetPasswordExpires = otpExpires;
      await candidate.save();

      await sendOTPEmail(email, `${candidate.firstName} ${candidate.lastName}`, otp);

      res.status(200).json({ success: true, message: 'OTP sent to your email for password reset' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error in forgot password', error: error.message });
    }
  },

  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      const candidate = await Candidate.findOne({ email });
      if (!candidate || candidate.resetPasswordToken !== otp || candidate.resetPasswordExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      candidate.password = await hashPassword(newPassword);
      candidate.resetPasswordToken = null;
      candidate.resetPasswordExpires = null;
      await candidate.save();

      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
    }
  },

  async sendOTP(req, res) {
    try {
      const { email } = req.body;
      const candidate = await Candidate.findOne({ email });
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

      const otp = generateOTP();
      const otpExpires = generateTokenExpiry();

      candidate.otp = otp;
      candidate.otpExpires = otpExpires;
      await candidate.save();

      await sendOTPEmail(email, `${candidate.firstName} ${candidate.lastName}`, otp);

      res.status(200).json({ success: true, message: 'OTP sent successfully to your email' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
    }
  },

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      const candidate = await Candidate.findOne({ email });
      if (!candidate || candidate.otp !== otp || candidate.otpExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      candidate.otp = null;
      candidate.otpExpires = null;
      await candidate.save();

      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
    }
  },

  async current(req, res) {
    try {
      const candidate = await Candidate.findById(req.candidate._id);
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

      res.status(200).json({ success: true, candidate });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching candidate', error: error.message });
    }
  },

  async block(req, res) {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'blocked' } },
        { new: true }
      );
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
      res.status(200).json({ success: true, message: 'Candidate blocked successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error blocking candidate', error: error.message });
    }
  },

  async reactivate(req, res) {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'active' } },
        { new: true }
      );
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });
      res.status(200).json({ success: true, message: 'Candidate reactivated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error reactivating candidate', error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const candidate = await Candidate.findById(req.params.id);
      if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

      if (candidate.image?.includes('/public/candidate/')) {
        const imagePath = path.join(__dirname, '../../', candidate.image);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }

      await Candidate.findByIdAndDelete(req.params.id);

      res.status(200).json({ success: true, message: 'Candidate deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error deleting candidate', error: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const candidates = await Candidate.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, candidates });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error fetching candidates', error: error.message });
    }
  }

};

module.exports = candidateController;
