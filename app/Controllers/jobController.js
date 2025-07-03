const Job = require('../models/job');
const generateJobId = require('../utils/jobIdGenerator');

// Create a new job
exports.createJob = async (req, res) => {
  try {
    const jobId = await generateJobId(); // Use the jobIdGenerator
    const jobData = {
      ...req.body,
      jobId,
      postedBy: req.user ? req.user._id : null, // Assuming user is attached to req
    };
    
    const job = new Job(jobData);
    await job.save();
    res.status(201).json({ message: 'Job created successfully', job });
  } catch (error) {
    res.status(400).json({ message: 'Error creating job', error: error.message });
  }
};

// Update a job by jobId
exports.updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOneAndUpdate(
      { jobId },
      { ...req.body, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(200).json({ message: 'Job updated successfully', job });
  } catch (error) {
    res.status(400).json({ message: 'Error updating job', error: error.message });
  }
};

// Get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ isActive: true })
      .populate('country')
      .populate('certificate')
      .populate('postedBy', 'username email')
      .sort({ createdAt: -1 });
    res.status(200).json({ message: 'Jobs retrieved successfully', jobs });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving jobs', error: error.message });
  }
};

// Get job by jobId
exports.getJobById = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOne({ jobId })
      .populate('country')
      .populate('certificate')
      .populate('postedBy', 'username email');
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(200).json({ message: 'Job retrieved successfully', job });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving job', error: error.message });
  }
};

// Delete a job by jobId
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findOneAndUpdate(
      { jobId },
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting job', error: error.message });
  }
};

// Get jobs count
exports.getJobsCount = async (req, res) => {
  try {
    const count = await Job.countDocuments({ isActive: true });
    res.status(200).json({ message: 'Jobs count retrieved successfully', count });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving jobs count', error: error.message });
  }
};