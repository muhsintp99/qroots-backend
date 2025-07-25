const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CandidateSchema = new Schema({
  // Basic Details
  canId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },

  // Personal Info
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
  dob: { type: String, trim: true },
  image: { type: String, default: '/public/defult/user.png' },

  // Identity Card
  identityType: { type: String, enum: ['aadhaar', 'passport', 'voterId', 'drivingLicense'], default: 'aadhaar' },
  identityNumber: { type: String, default: null },
  identityFile: { type: String, default: null }, // file URL

  // Address Details
  addressLine1: { type: String, default: null },
  addressLine2: { type: String, default: null },
  landmark: { type: String, default: null },
  city: { type: String, default: null },
  district: { type: String, default: null },
  state: { type: String, default: null },
  zipCode: { type: String, default: null },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },

  // Guardian Details
  guardianName: { type: String, default: null },
  guardianRelation: { type: String, enum: ['father', 'mother', 'spouse', 'other'], default: 'father' },
  guardianMobile: { type: String, default: null },
  guardianOccupation: { type: String, default: null },

  // Education Details
  educationDetails: [
    {
      qualification: String,
      university: String,
      passingYear: Number,
      certificate: String // file path or URL
    }
  ],
  highestQualification: { type: String, default: null },
  university: { type: String, default: null },
  passingYear: { type: Number, default: null },

  // Job & Application Info
  preferredJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  selectedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPackage', default: null },
  couponCode: { type: mongoose.Schema.Types.ObjectId, ref: 'CouponCode', default: null },

  // System Use
  userType: {
    type: String,
    enum: ['candidate'],
    default: 'candidate'
  },
  isDeleted: { type: Boolean, default: false },
  lastLogin: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, { timestamps: true });

CandidateSchema.index({ createdAt: 1 });

module.exports = mongoose.model("Candidate", CandidateSchema);
