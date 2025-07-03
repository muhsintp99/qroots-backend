const Candidate = require("../models/candidate");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const generateUserId = require("../utils/generateUserId");

// Registration
exports.register = async (req, res) => {
  try {
    const { email, mobile, password } = req.body;

    const exist = await Candidate.findOne({ $or: [{ email }, { mobile }] });
    if (exist) return res.status(400).json({ message: "Email or Mobile already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await generateUserId();

    const candidate = new Candidate({ userId, email, mobile, password: hashedPassword });
    await candidate.save();

    res.status(201).json({ message: "Registration successful", userId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Send OTP (Example Only)
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const candidate = await Candidate.findOne({ email });

    if (!candidate) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    candidate.otp = otp;
    candidate.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await candidate.save();
    // You can integrate email service here to send OTP
    res.json({ message: "OTP sent successfully", otp }); // remove OTP in production!
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const candidate = await Candidate.findOne({ email });

    if (!candidate || candidate.otp !== otp || candidate.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    candidate.otp = null;
    candidate.otpExpires = null;
    await candidate.save();

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const candidate = await Candidate.findOne({ email });

    if (!candidate) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, candidate.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: candidate._id, email: candidate.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, userId: candidate.userId });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
