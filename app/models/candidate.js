const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CandidateSchema = new Schema({
  canId: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  otp: { type: String, default: null },
  otpExpires: { type: Date, default: null },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
 dob: { type: String, trim: true },
  country: { type: String, default: null },
  address: { type: String, default: null },
  image: { type: String, default: '/public/default/user.png' },
  highestQualification: { type: String, default: null },
  university: { type: String, default: null },
  passingYear: { type: Number, default: null },
  preferredJob: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobPackage', default: null },
  couponCode: { type: mongoose.Schema.Types.ObjectId, ref: 'CouponCode', default: null },
  isDeleted: { type: Boolean, default: false },
  lastLogin: { type: Date, default: null },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }
}, { timestamps: true });

CandidateSchema.index({ createdAt: 1 });

const Candidate = mongoose.model("Candidate", CandidateSchema);
module.exports = Candidate;