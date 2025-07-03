const Job = require('../models/job');
const generateJobId = require('../utils/jobIdGenerator');

const validateSkills = (skills) => {
  if (!Array.isArray(skills)) return false;
  if (skills.length > 10) return false;
  return skills.every(skill => typeof skill === 'string' && skill.trim().length > 0 && skill.length <= 50);
};

exports.createJob = async (req, res) => {
  try {
    const { skills, certificate } = req.body;
    if (skills && !validateSkills(skills)) {
      return res.status(400).json({ error: 'Skills must be an array of non-empty strings, max 10, each up to 50 characters' });
    }
    if (!certificate) {
      return res.status(400).json({ error: 'Certificate is required' });
    }
    const jobId = await generateJobId();
    const job = new Job({
      ...req.body,
      jobId,
      skills: skills ? skills.map(skill => skill.trim().toLowerCase()) : [],
    });
    await job.save();
    const populatedJob = await Job.findById(job._id).populate('country').populate('certificate').populate('postedBy');
    const count = await Job.countDocuments();
    res.status(201).json({
      message: 'Job created successfully',
      count,
      data: populatedJob,
    });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to create job' });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('country')
      .populate('certificate')
      .sort({ createdAt: -1 });
    const count = await Job.countDocuments();
    res.status(200).json({
      count,
      message: 'Jobs fetched successfully',
      data: jobs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch jobs' });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('country').populate('certificate').populate('postedBy');
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json({
      message: 'Job fetched successfully',
      data: job,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch job' });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { skills, certificate } = req.body;
    if (skills && !validateSkills(skills)) {
      return res.status(400).json({ error: 'Skills must be an array of non-empty strings, max 10, each up to 50 characters' });
    }
    if (certificate === '') {
      return res.status(400).json({ error: 'Certificate is required' });
    }
    const updateData = {
      ...req.body,
      skills: skills ? skills.map(skill => skill.trim().toLowerCase()) : undefined,
    };
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('country')
      .populate('certificate')
      .populate('postedBy');
    if (!updatedJob) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json({ message: 'Job updated successfully', data: updatedJob });
  } catch (error) {
    res.status(400).json({ error: error.message || 'Failed to update job' });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    const count = await Job.countDocuments();
    res.status(200).json({ message: 'Job deleted permanently', count });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to delete job' });
  }
};

exports.getJobCount = async (req, res) => {
  try {
    const count = await Job.countDocuments();
    res.status(200).json({ message: 'Job count fetched successfully', count });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch job count' });
  }
};