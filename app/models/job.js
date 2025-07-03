const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
  certificate: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', required: true },
  salary: { type: Number, min: 0 },
  jobType: {
    type: String,
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'],
    default:'Full-Time'
  },
  experience: { type: String },
  skills: [{ type: String }],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

jobSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Job', jobSchema);
