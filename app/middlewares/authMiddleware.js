const JWT = require('jsonwebtoken');
const User = require("../models/user");
const Candidate = require("../models/candidate");

// PROTECTED ROUTES TOKEN BASED
exports.requireSignIn = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required. Please provide a valid Bearer token.',
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.',
      });
    }

    // Verify and decode the token
    const decoded = JWT.verify(token, process.env.JWT_SECRET);
    
    // Fetch fresh user data from database
    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - user not found.',
      });
    }

    // Check if user account is deleted/deactivated
    if (user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.',
      });
    }

    // Attach user info to request object
    req.user = {
      _id: user._id,
      userType: user.userType,
      email: user.email,
      fname: user.fname,
      lname: user.lname,
      status: user.status
    };
    
    next();
  } catch (error) {
    console.log('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

// Admin Access Middleware
exports.isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }
    
    next();
  } catch (error) {
    console.log('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in admin middleware',
      error: error.message,
    });
  }
};

// Licensee Access Middleware
exports.isLicensee = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.userType !== 'licensee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Licensee privileges required.',
      });
    }
    
    next();
  } catch (error) {
    console.log('Licensee middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in licensee middleware',
      error: error.message,
    });
  }
};

// Admin or Licensee Access Middleware
exports.isAdminOrLicensee = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.userType === 'admin' || req.user.userType === 'licensee') {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin or licensee privileges required."
      });
    }
  } catch (error) {
    console.log('AdminOrLicensee middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in authorization middleware',
      error: error.message,
    });
  }
};

// Middleware to check if user can access their own resources or if admin
exports.isSelfOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userId = req.params.id;
    
    if (req.user.userType === 'admin' || req.user._id.toString() === userId) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources."
      });
    }
  } catch (error) {
    console.log('SelfOrAdmin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in authorization middleware',
      error: error.message,
    });
  }
};

// Candidate Authentication
exports.requireSignInCandidate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required. Please provide a valid Bearer token.',
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format.',
      });
    }

    const decoded = JWT.verify(token, process.env.JWT_SECRET);

    const candidate = await Candidate.findById(decoded.id).select('-password');

    if (!candidate) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - candidate not found.',
      });
    }

    if (candidate.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated.',
      });
    }

    req.candidate = {
      _id: candidate._id,
      userId: candidate.userId,
      email: candidate.email,
      mobile: candidate.mobile,
      fullName: `${candidate.firstName} ${candidate.lastName}`
    };

    next();
  } catch (error) {
    console.log('Candidate Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

// Candidate Middleware
exports.isCandidate = async (req, res, next) => {
  if (!req.candidate) {
    return res.status(401).json({ success: false, message: 'Candidate authentication required.' });
  }
  next();
};