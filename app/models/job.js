const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, trim: true },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  description: { type: String, required: true, trim: true, minlength: 1, maxlength: 5000 },
  company: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  location: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true },
  salary: { type: Number, min: 0, default: null },
  jobType: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'],
    required: true,
    default: 'Full-Time',
  },
  experience: { type: String, trim: true, maxlength: 100, default: null },
  skills: [{ type: String, trim: true, maxlength: 50 }],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);