const JWT = require('jsonwebtoken');
const Candidate = require('../models/candidate');
const { generateOTP, generateTokenExpiry } = require('../utils/otp');
const { hashPassword, comparePassword } = require('../helpers/authHelper');
const { sendWelcomeCandidateEmail, sendOTPEmail } = require('../helpers/sendEmail');
const { cloudinary, uploadDefaultImage } = require('../middlewares/cloudinaryUpload');

const candidateController = {
  // Register Candidate
  async register(req, res) {
    try {
      const {
        email,
        mobile,
        password,
        firstName,
        lastName,
        dob,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        zipCode,
        country
      } = req.body;
      const image = req.file;

      // Validation
      if (!email || !mobile || !dob) {
        return res.status(400).json({ success: false, message: 'All required fields (email, mobile, dob) must be provided' });
      }

      // Validate mobile number
      if (!mobile.match(/^\d{8,10}$/)) {
        return res.status(400).json({ success: false, message: 'Mobile number must be 8 to 10 digits' });
      }

      // Generate unique canId (format: CANYYYYNNN)
      const currentYear = new Date().getFullYear();
      const prefix = `CAN${currentYear}`;
      const candidateCount = await Candidate.countDocuments({ canId: { $regex: `^${prefix}`, $options: 'i' } });
      const sequenceNumber = (candidateCount + 1).toString().padStart(3, '0');
      const canId = `${prefix}${sequenceNumber}`;

      // Check existing candidate
      const existingCandidate = await Candidate.findOne({ $or: [{ email }, { mobile }, { canId }] });
      if (existingCandidate) {
        return res.status(400).json({ success: false, message: 'Candidate already exists with this email, mobile, or canId' });
      }

      // Generate password from DOB if not provided
      let finalPassword = password;
      if (!password && dob) {
        // Normalize DOB: replace hyphens with slashes
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

      // Handle image upload or set default
      let imageUrl = '/public/default/user.png';
      let publicId = null;
      /*
      if (image) {
        const result = await cloudinary.uploader.upload(image.path, {
          folder: 'candidates',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        imageUrl = result.secure_url;
        publicId = result.public_id;
      } else {
        const defaultImage = await uploadDefaultImage('public/default/user.png', 'candidates');
        imageUrl = defaultImage.url;
        publicId = defaultImage.publicId;
      }
      */

      // Hash password
      const hashedPassword = await hashPassword(finalPassword);

      // Create candidate
      const candidate = await Candidate.create({
        canId,
        email,
        mobile,
        password: hashedPassword,
        firstName,
        lastName,
        dob,
        image: imageUrl,

        // New Address Fields
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        zipCode,
        country, // should be a valid ObjectId
      });


      // Send welcome email with the generated password
      await sendWelcomeCandidateEmail(email, `${firstName} ${lastName}`, `${finalPassword}`);
      console.log(`Skipping email send for ${email}, password: ${finalPassword}`);

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
      console.error('Register candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      if (error?.name === 'MongoError' && error?.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate key error (email, mobile, or canId)', error: error?.message });
      }
      if (error?.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Validation error', error: error?.message });
      }
      res.status(500).json({ success: false, message: 'Error in registration', error: error?.message || 'Unknown error' });
    }
  },

  // ... (other functions remain unchanged)
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const candidate = await Candidate.findOne({ email }).select('+password');
      if (!candidate) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await comparePassword(password, candidate.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Update last login
      candidate.lastLogin = new Date();
      await candidate.save();

      // Generate JWT
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
      console.error('Login candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error in login', error: error?.message || 'Unknown error' });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const candidate = await Candidate.findOne({ email });
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      // Generate OTP and expiry
      const otp = generateOTP();
      const otpExpires = generateTokenExpiry();

      // Save OTP and expiry to candidate
      candidate.resetPasswordToken = otp;
      candidate.resetPasswordExpires = otpExpires;
      await candidate.save();

      // Send OTP via email
      await sendOTPEmail(email, `${candidate.firstName} ${candidate.lastName}`, otp);

      res.status(200).json({ success: true, message: 'OTP sent to your email for password reset' });
    } catch (error) {
      console.error('Forgot password candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error in forgot password process', error: error?.message || 'Unknown error' });
    }
  },

  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
      }

      const candidate = await Candidate.findOne({ email });
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      // Verify OTP and expiry
      if (candidate.resetPasswordToken !== otp || !candidate.resetPasswordExpires || candidate.resetPasswordExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      candidate.password = hashedPassword;
      candidate.resetPasswordToken = null;
      candidate.resetPasswordExpires = null;
      await candidate.save();

      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error resetting password', error: error?.message || 'Unknown error' });
    }
  },

  async sendOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const candidate = await Candidate.findOne({ email });
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      const otp = generateOTP();
      const otpExpires = generateTokenExpiry();

      candidate.otp = otp;
      candidate.otpExpires = otpExpires;
      await candidate.save();

      // Send OTP via email
      await sendOTPEmail(email, `${candidate.firstName} ${candidate.lastName}`, otp);

      res.status(200).json({ success: true, message: 'OTP sent successfully to your email' });
    } catch (error) {
      console.error('Send OTP candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error sending OTP', error: error?.message || 'Unknown error' });
    }
  },

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
      }

      const candidate = await Candidate.findOne({ email });
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      if (candidate.otp !== otp || candidate.otpExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      candidate.otp = null;
      candidate.otpExpires = null;
      await candidate.save();

      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
      console.error('Verify OTP candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error verifying OTP', error: error?.message || 'Unknown error' });
    }
  },

  async current(req, res) {
    try {
      const candidate = await Candidate.findById(req.candidate._id);
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      res.status(200).json({ success: true, candidate });
    } catch (error) {
      console.error('Current candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error fetching current candidate', error: error?.message || 'Unknown error' });
    }
  },

  async update(req, res) {
    try {
      const {
        canId,
        email,
        mobile,
        firstName,
        lastName,
        gender,
        dob,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        zipCode,
        country
      } = req.body;
      const image = req.file;

      const updateData = {
        canId,
        email,
        mobile,
        firstName,
        lastName,
        gender,
        dob,
        addressLine1,
        addressLine2,
        city,
        district,
        state,
        zipCode,
        country
      };

      if (image) {
        const result = await cloudinary.uploader.upload(image.path, {
          folder: 'candidates',
          transformation: [{ width: 800, height: 800, crop: 'limit' }],
        });
        updateData.image = result.secure_url;
      }

      const candidate = await Candidate.findByIdAndUpdate(
        req.candidate._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({ success: true, message: 'Candidate updated successfully', candidate });
    } catch (error) {
      console.error('Update candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error updating candidate', error: error?.message || 'Unknown error' });
    }
  },

  async delete(req, res) {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { $set: { isDeleted: true } },
        { new: true }
      );
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      res.status(200).json({ success: true, message: 'Candidate deleted successfully' });
    } catch (error) {
      console.error('Delete candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error deleting candidate', error: error?.message || 'Unknown error' });
    }
  },

  async block(req, res) {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'blocked' } },
        { new: true }
      );
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      res.status(200).json({ success: true, message: 'Candidate blocked successfully' });
    } catch (error) {
      console.error('Block candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error blocking candidate', error: error?.message || 'Unknown error' });
    }
  },

  async reactivate(req, res) {
    try {
      const candidate = await Candidate.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'active', isDeleted: false } },
        { new: true }
      );
      if (!candidate) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }

      res.status(200).json({ success: true, message: 'Candidate reactivated successfully' });
    } catch (error) {
      console.error('Reactivate candidate error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error reactivating candidate', error: error?.message || 'Unknown error' });
    }
  },

  async getAll(req, res) {
    try {
      const candidates = await Candidate.find({ isDeleted: false });
      const count = await Candidate.countDocuments();
      res.status(200).json({ success: true, count, candidates });
    } catch (error) {
      console.error('Get all candidates error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error fetching candidates', error: error?.message || 'Unknown error' });
    }
  },

  async getById(req, res) {
    try {
      const candidate = await Candidate.findById(req.params.id);
      if (!candidate || candidate.isDeleted) {
        return res.status(404).json({ success: false, message: 'Candidate not found' });
      }
      res.status(200).json({ success: true, candidate });
    } catch (error) {
      console.error('Get candidate by ID error:', {
        message: error?.message,
        stack: error?.stack,
        error,
      });
      res.status(500).json({ success: false, message: 'Error fetching candidate', error: error?.message || 'Unknown error' });
    }
  },
};

module.exports = candidateController;