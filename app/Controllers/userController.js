const JWT = require('jsonwebtoken');
const User = require('../models/user');
const { generateOTP, generateTokenExpiry } = require('../utils/otp');
const { hashPassword, comparePassword } = require('../helpers/authHelper');
const { sendWelcomeEmail } = require('../helpers/sendEmail');
const { cloudinary, uploadDefaultImage } = require('../middlewares/cloudinaryUpload');

const userController = {
  // Register User
  async register(req, res) {
    try {
      const { fname, lname, email, mobile, password, userType } = req.body;
      const image = req.file;

      // Validation
      if (!email || !mobile || !password || !userType) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided' });
      }

      // Check existing user
      const existingUser = await User.findOne({ $or: [{ email }, { mobile }] });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists with this email or mobile' });
      }

      // Handle image upload or set default
      let imageUrl = '/public/default/user.png';
      let publicId = null;
      if (image) {
        const result = await cloudinary.uploader.upload(image.path, {
          folder: 'users',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        imageUrl = result.secure_url;
        publicId = result.public_id;
      } else {
        const defaultImage = await uploadDefaultImage('public/default/user.png', 'users');
        imageUrl = defaultImage.url;
        publicId = defaultImage.publicId;
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await User.create({
        fname,
        lname,
        email,
        mobile,
        password: hashedPassword,
        userType,
        image: imageUrl
      });

      // Send welcome email
      await sendWelcomeEmail(email, `${fname} ${lname}`);

      const count = await User.countDocuments();

      res.status(201).json({
        success: true,
        count: count,
        message: 'User registered successfully',
        user: {
          _id: user._id,
          email: user.email,
          userType: user.userType,
          mobile:user.mobile,
          fname: user.fname,
          lname: user.lname,
          image: user.image
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ success: false, message: 'Error in registration', error: error.message });
    }
  },

  // Login User
  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await comparePassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT
      const token = JWT.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          _id: user._id,
          email: user.email,
          userType: user.userType,
          fname: user.fname,
          lname: user.lname,
          image: user.image
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'Error in login', error: error.message });
    }
  },

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Generate OTP and expiry
      const otp = generateOTP();
      const otpExpires = generateTokenExpiry();

      // Save OTP and expiry to user
      user.resetPasswordToken = otp;
      user.resetPasswordExpires = otpExpires;
      await user.save();

      // Send OTP via email
      await sendOTPEmail(email, user.fullName, otp);

      res.status(200).json({ success: true, message: 'OTP sent to your email for password reset' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ success: false, message: 'Error in forgot password process', error: error.message });
    }
  },

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Verify OTP and expiry
      if (user.resetPasswordToken !== otp || user.resetPasswordExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      res.status(200).json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
    }
  },

  // Send OTP (for other purposes, e.g., email verification)
  async sendOTP(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const otp = generateOTP();
      const otpExpires = generateTokenExpiry();

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      // Send OTP via email
      await sendOTPEmail(email, user.fullName, otp);

      res.status(200).json({ success: true, message: 'OTP sent successfully to your email' });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ success: false, message: 'Error sending OTP', error: error.message });
    }
  },

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }

      user.otp = null;
      user.otpExpires = null;
      await user.save();

      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ success: false, message: 'Error verifying OTP', error: error.message });
    }
  },

  // ... (other functions remain unchanged: current, update, delete, block, reactivate, getAll, getById)
  async current(req, res) {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error('Current user error:', error);
      res.status(500).json({ success: false, message: 'Error fetching current user', error: error.message });
    }
  },

  async update(req, res) {
    try {
      const { fname, lname, email, mobile } = req.body;
      const image = req.file;

      const updateData = { fname, lname, email, mobile };
      if (image) {
        const result = await cloudinary.uploader.upload(image.path, {
          folder: 'users',
          transformation: [{ width: 800, height: 800, crop: 'limit' }]
        });
        updateData.image = result.secure_url;
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      res.status(200).json({ success: true, message: 'User updated successfully', user });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
    }
  },

  async delete(req, res) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { isDeleted: true } },
        { new: true }
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
    }
  },

  async block(req, res) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'blocked' } },
        { new: true }
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, message: 'User blocked successfully' });
    } catch (error) {
      console.error('Block user error:', error);
      res.status(500).json({ success: false, message: 'Error blocking user', error: error.message });
    }
  },

  async reactivate(req, res) {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { status: 'active', isDeleted: false } },
        { new: true }
      );
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({ success: true, message: 'User reactivated successfully' });
    } catch (error) {
      console.error('Reactivate user error:', error);
      res.status(500).json({ success: false, message: 'Error reactivating user', error: error.message });
    }
  },

  async getAll(req, res) {
    try {
      const users = await User.find({ isDeleted: false });
      const counts = await User.countDocuments();
      res.status(200).json({ success: true, counts, users });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
    }
  },

  async getById(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user || user.isDeleted) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.status(200).json({ success: true, user });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
    }
  }
};

module.exports = userController;